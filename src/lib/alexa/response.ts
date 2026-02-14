import type { AlexaResponseEnvelope } from './types'

const DEFAULT_TITLE = 'Bonalyze Einkaufsliste'

function toSsml(text: string): string {
  const ssmlText = text.replace(/Bonalyze/gi, '<lang xml:lang="en-US">Bonalyze</lang>')
  return `<speak>${ssmlText}</speak>`
}

export function createAlexaResponse(
  text: string,
  options?: {
    shouldEndSession?: boolean
    reprompt?: string
    cardTitle?: string
  }
): AlexaResponseEnvelope {
  const shouldEndSession = options?.shouldEndSession ?? false
  const repromptText = options?.reprompt || 'Was soll ich mit deiner Einkaufsliste machen?'

  return {
    version: '1.0',
    response: {
      shouldEndSession,
      outputSpeech: {
        type: 'SSML',
        ssml: toSsml(text),
      },
      reprompt: shouldEndSession
        ? undefined
        : {
            outputSpeech: {
              type: 'SSML',
              ssml: toSsml(repromptText),
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
