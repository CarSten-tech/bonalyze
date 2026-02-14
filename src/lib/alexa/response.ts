import type { AlexaResponseEnvelope } from './types'

const DEFAULT_TITLE = 'Bonalyze Einkaufsliste'

export function createAlexaResponse(
  text: string,
  options?: {
    shouldEndSession?: boolean
    reprompt?: string
    cardTitle?: string
  }
): AlexaResponseEnvelope {
  const shouldEndSession = options?.shouldEndSession ?? false

  return {
    version: '1.0',
    response: {
      shouldEndSession,
      outputSpeech: {
        type: 'PlainText',
        text,
      },
      reprompt: shouldEndSession
        ? undefined
        : {
            outputSpeech: {
              type: 'PlainText',
              text: options?.reprompt || 'Was soll ich mit deiner Einkaufsliste machen?',
            },
          },
      card: {
        type: 'Simple',
        title: options?.cardTitle || DEFAULT_TITLE,
        content: text,
      },
    },
  }
}
