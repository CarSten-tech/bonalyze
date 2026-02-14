import { NextRequest, NextResponse } from 'next/server'
import { createAlexaResponse } from '@/lib/alexa/response'
import { formatListForSpeech, parseProductList } from '@/lib/alexa/parser'
import {
  addProductsToList,
  createShoppingListForHousehold,
  consumeLinkCode,
  findShoppingListByName,
  getAlexaLinkByAlexaUserId,
  getShoppingListById,
  getShoppingListsForHousehold,
  readShoppingList,
  removeProductsFromList,
  setActiveAlexaShoppingList,
  setQuantitiesOnList,
  touchAlexaLink,
} from '@/lib/alexa/shopping-service'
import { verifyAlexaRequest } from '@/lib/alexa/signature'
import type { AlexaRequestEnvelope } from '@/lib/alexa/types'

export const runtime = 'nodejs'

const HELP_TEXT =
  'Du kannst sagen: fuege Milch und Eier hinzu, entferne Brot, setze Milch auf 2 Liter, oeffne Liste DM, erstelle Liste Wochenmarkt oder lies meine Einkaufsliste vor.'

function getAppId(envelope: AlexaRequestEnvelope): string | undefined {
  return envelope.context?.System?.application?.applicationId || envelope.session?.application?.applicationId
}

function getAlexaUserId(envelope: AlexaRequestEnvelope): string | undefined {
  return envelope.context?.System?.user?.userId || envelope.session?.user?.userId
}

function extractSlotValue(envelope: AlexaRequestEnvelope, slotNames: string[]): string | null {
  const slots = envelope.request.intent?.slots
  if (!slots) return null

  for (const slotName of slotNames) {
    const value = slots[slotName]?.value?.trim()
    if (value) return value
  }

  return null
}

function sanitizeForSpeech(value: string): string {
  return value.replace(/[<>]/g, '').trim()
}

async function handleIntentRequest(envelope: AlexaRequestEnvelope, alexaUserId: string) {
  const intentName = envelope.request.intent?.name
  const locale = envelope.request.locale || 'de-DE'

  if (!intentName) {
    return createAlexaResponse('Ich konnte deinen Befehl nicht verstehen.')
  }

  if (intentName === 'AMAZON.HelpIntent') {
    return createAlexaResponse(HELP_TEXT)
  }

  if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    return createAlexaResponse('Alles klar.', { shouldEndSession: true })
  }

  if (intentName === 'AMAZON.FallbackIntent') {
    return createAlexaResponse('Das habe ich nicht verstanden. ' + HELP_TEXT)
  }

  if (intentName === 'LinkAccountIntent') {
    const code = extractSlotValue(envelope, ['code', 'linkCode', 'verificationCode'])

    if (!code) {
      return createAlexaResponse('Bitte nenne den sechsstelligen Link-Code aus deiner Bonalyze App.')
    }

    const cleanCode = code.replace(/\D/g, '')
    if (cleanCode.length !== 6) {
      return createAlexaResponse('Der Code muss sechs Ziffern haben. Bitte versuche es erneut.')
    }

    const linked = await consumeLinkCode(alexaUserId, cleanCode, locale)
    if (!linked) {
      return createAlexaResponse('Der Code ist ungueltig oder abgelaufen. Bitte erzeuge in der App einen neuen Code.')
    }

    return createAlexaResponse('Geraet erfolgreich mit deiner Bonalyze Einkaufsliste verknuepft.')
  }

  const link = await getAlexaLinkByAlexaUserId(alexaUserId)
  if (!link) {
    return createAlexaResponse('Bitte verknuepfe zuerst dein Konto. Sage: verknuepfen und dann deinen sechsstelligen Code.')
  }

  await touchAlexaLink(alexaUserId)

  if (intentName === 'ReadListIntent') {
    const items = await readShoppingList(link.shopping_list_id)
    const currentList = await getShoppingListById(link.shopping_list_id)
    const listPrefix = currentList ? `Aktive Liste ${sanitizeForSpeech(currentList.name)}. ` : ''
    return createAlexaResponse(`${listPrefix}${formatListForSpeech(items)}`)
  }

  if (intentName === 'ListListsIntent') {
    const lists = await getShoppingListsForHousehold(link.household_id)
    if (lists.length === 0) {
      return createAlexaResponse('Es gibt noch keine Einkaufslisten in deinem Haushalt.')
    }
    const names = lists.map((list) => sanitizeForSpeech(list.name)).join(', ')
    return createAlexaResponse(`Verfuegbare Listen sind: ${names}.`)
  }

  if (intentName === 'OpenListIntent') {
    const requestedName = extractSlotValue(envelope, ['listName', 'name', 'shoppingListName'])
    if (!requestedName) {
      return createAlexaResponse('Welche Liste soll ich oeffnen?')
    }

    const found = await findShoppingListByName(link.household_id, requestedName)
    if (!found) {
      return createAlexaResponse(`Ich habe keine Liste mit dem Namen ${sanitizeForSpeech(requestedName)} gefunden.`)
    }

    await setActiveAlexaShoppingList(alexaUserId, found.id)
    return createAlexaResponse(`Liste ${sanitizeForSpeech(found.name)} ist jetzt aktiv.`)
  }

  if (intentName === 'CreateListIntent') {
    const requestedName = extractSlotValue(envelope, ['listName', 'name', 'shoppingListName'])
    if (!requestedName) {
      return createAlexaResponse('Wie soll die neue Liste heissen?')
    }

    const created = await createShoppingListForHousehold(link.user_id, link.household_id, requestedName)
    await setActiveAlexaShoppingList(alexaUserId, created.id)
    return createAlexaResponse(`Liste ${sanitizeForSpeech(created.name)} ist angelegt und aktiv.`)
  }

  if (intentName === 'AddItemsIntent') {
    const rawProducts = extractSlotValue(envelope, ['items', 'products', 'productList'])

    if (!rawProducts) {
      return createAlexaResponse('Welche Produkte soll ich hinzufuegen?')
    }

    const parsed = parseProductList(rawProducts)
    if (parsed.length === 0) {
      return createAlexaResponse('Ich konnte keine Produkte erkennen. Bitte wiederhole die Produkte.')
    }

    const result = await addProductsToList(link.shopping_list_id, parsed)
    const productNames = parsed.map((p) => sanitizeForSpeech(p.productName)).join(', ')

    return createAlexaResponse(
      `Erledigt. ${result.addedCount} Produkte hinzugefuegt, ${result.updatedCount} bestehende Mengen erhoeht: ${productNames}.`
    )
  }

  if (intentName === 'RemoveItemsIntent') {
    const rawProducts = extractSlotValue(envelope, ['items', 'products', 'productList'])

    if (!rawProducts) {
      return createAlexaResponse('Welche Produkte soll ich entfernen?')
    }

    const parsed = parseProductList(rawProducts)
    if (parsed.length === 0) {
      return createAlexaResponse('Ich konnte keine Produkte zum Entfernen erkennen.')
    }

    const result = await removeProductsFromList(link.shopping_list_id, parsed)

    if (result.removedCount === 0) {
      return createAlexaResponse('Ich habe keine passenden Produkte auf deiner Liste gefunden.')
    }

    return createAlexaResponse(`Erledigt. ${result.removedCount} Eintraege wurden entfernt.`)
  }

  if (intentName === 'UpdateQuantityIntent') {
    const rawProducts = extractSlotValue(envelope, ['items', 'products', 'productList', 'itemWithQuantity'])

    if (!rawProducts) {
      return createAlexaResponse('Bitte nenne Produkt und Menge, zum Beispiel: setze Milch auf 2 Liter.')
    }

    const parsed = parseProductList(rawProducts)
    const parsedWithQuantity = parsed.filter((item) => item.quantity !== null)

    if (parsedWithQuantity.length === 0) {
      return createAlexaResponse('Ich brauche eine konkrete Menge, zum Beispiel 2 Liter Milch.')
    }

    const result = await setQuantitiesOnList(link.shopping_list_id, parsedWithQuantity)
    return createAlexaResponse(`Erledigt. ${result.changedCount} Mengen wurden aktualisiert.`)
  }

  return createAlexaResponse('Dieser Befehl ist noch nicht verfuegbar. ' + HELP_TEXT)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  let envelope: AlexaRequestEnvelope
  try {
    envelope = JSON.parse(rawBody) as AlexaRequestEnvelope
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const shouldVerifySignature = process.env.ALEXA_VERIFY_SIGNATURE !== 'false'
    console.log('[alexa] incoming request. verifySignature:', shouldVerifySignature)
    console.log('[alexa] headers:', Object.fromEntries(request.headers.entries()))
    console.log('[alexa] body:', rawBody)

    if (shouldVerifySignature) {
      await verifyAlexaRequest(rawBody, request.headers, envelope.request.timestamp)
    }

    const expectedSkillId = process.env.ALEXA_SKILL_ID
    const incomingSkillId = getAppId(envelope)
    if (expectedSkillId && incomingSkillId && expectedSkillId !== incomingSkillId) {
      return NextResponse.json(createAlexaResponse('Skill-ID ist ungueltig.', { shouldEndSession: true }), {
        status: 403,
      })
    }

    const alexaUserId = getAlexaUserId(envelope)
    if (!alexaUserId) {
      return NextResponse.json(createAlexaResponse('Alexa Benutzer konnte nicht erkannt werden.'), {
        status: 401,
      })
    }

    if (envelope.request.type === 'LaunchRequest') {
      return NextResponse.json(
        createAlexaResponse('Willkommen bei Bonalyze. Sage zum Beispiel: fuege Milch und Eier zur Einkaufsliste hinzu.')
      )
    }

    if (envelope.request.type === 'SessionEndedRequest') {
      return NextResponse.json(createAlexaResponse('Bis bald.', { shouldEndSession: true }))
    }

    if (envelope.request.type === 'IntentRequest') {
      const response = await handleIntentRequest(envelope, alexaUserId)
      return NextResponse.json(response)
    }

    return NextResponse.json(createAlexaResponse('Unbekannter Request-Typ.', { shouldEndSession: true }), {
      status: 400,
    })
  } catch (error) {
    console.error('[alexa] error:', error)
    return NextResponse.json(
      createAlexaResponse('Es gab ein technisches Problem. Bitte versuche es gleich erneut.'),
      { status: 500 }
    )
  }
}
