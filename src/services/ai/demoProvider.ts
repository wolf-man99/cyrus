import { AssistantNotConnectedError, type AssistantProvider } from './types';

/**
 * Demo mode: the assistant interface is fully interactive, but no AI is involved.
 * Every capability is refused explicitly — nothing is simulated.
 */
export const demoAssistantProvider: AssistantProvider = {
  id: 'demo',
  status: async () => ({ kind: 'demo' }),
  transcribe: async () => {
    throw new AssistantNotConnectedError();
  },
  reply: async () => {
    throw new AssistantNotConnectedError();
  },
  speak: async () => {
    throw new AssistantNotConnectedError();
  },
};
