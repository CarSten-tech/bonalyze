export interface AlexaSlot {
  name?: string
  value?: string
  resolutions?: {
    resolutionsPerAuthority?: Array<{
      status: { code: string }
      values?: Array<{
        value: { name: string; id?: string }
      }>
    }>
  }
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

export interface AlexaOutputSpeech {
  type: 'PlainText' | 'SSML'
  text?: string
  ssml?: string
}

export interface AlexaResponseEnvelope {
  version: '1.0'
  response: {
    shouldEndSession: boolean
    outputSpeech: AlexaOutputSpeech
    reprompt?: {
      outputSpeech: AlexaOutputSpeech
    }
    card?: {
      type: 'Simple'
      title: string
      content: string
    }
  }
}
