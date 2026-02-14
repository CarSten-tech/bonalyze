export interface AlexaSlot {
  name?: string
  value?: string
}

export interface AlexaIntent {
  name: string
  slots?: Record<string, AlexaSlot>
}

export interface AlexaRequestEnvelope {
  version: string
  session?: {
    user?: {
      userId?: string
      accessToken?: string
    }
    application?: {
      applicationId?: string
    }
  }
  context?: {
    System?: {
      user?: {
        userId?: string
        accessToken?: string
      }
      application?: {
        applicationId?: string
      }
    }
  }
  request: {
    type: 'LaunchRequest' | 'IntentRequest' | 'SessionEndedRequest'
    timestamp: string
    requestId: string
    locale?: string
    intent?: AlexaIntent
  }
}

export interface AlexaResponseEnvelope {
  version: '1.0'
  response: {
    shouldEndSession: boolean
    outputSpeech: {
      type: 'PlainText'
      text: string
    }
    reprompt?: {
      outputSpeech: {
        type: 'PlainText'
        text: string
      }
    }
    card?: {
      type: 'Simple'
      title: string
      content: string
    }
  }
}
