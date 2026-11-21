import { AssistantNotConnectedError, type AssistantServices } from './types';

export const DEMO_RESPONSE =
  'This is a demo response, not AI. Cyrus isn’t connected yet, so nothing you said was sent or processed. Once the AI service is set up, I’ll answer from your own data and can log things for you.';

/**
 * Demo mode: the interface is fully interactive but no AI is involved. The reasoner returns one
 * fixed, clearly labelled demo response; speech services are unavailable.
 */
export const demoServices: AssistantServices = {
  mode: 'demo',
  speechToText: {
    async transcribe() {
      throw new AssistantNotConnectedError();
    },
  },
  textToSpeech: {
    async synthesize() {
      throw new AssistantNotConnectedError();
    },
  },
  reasoner: {
    status: async () => ({ kind: 'demo' }),
    complete: async () => ({ content: DEMO_RESPONSE, toolCalls: [], demo: true }),
  },
};
