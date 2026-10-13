import type { ChatEvent, ChatModel } from '../../application/ports/chat';

/*
 * A deterministic stand-in for the Claude API, used in local runs, pull request previews and the
 * end-to-end tests (CHAT_MODEL=fake). It costs nothing and answers from the corpus it receives, so
 * the tests exercise the real endpoint, quota and interface without calling a paid model.
 */

const PATH = /^(?:Página|Page): (\S+)$/m;

export const fakeChatModel: ChatModel = {
  async *answer({ locale, corpus, question }): AsyncIterable<ChatEvent> {
    const firstProject = PATH.exec(corpus)?.[1] ?? '/';
    const words =
      locale === 'es'
        ? `Respuesta de prueba a "${question}". Mira ${firstProject} para un ejemplo.`
        : `Test answer to "${question}". See ${firstProject} for an example.`;
    for (const word of words.split(/(?<= )/)) {
      await Promise.resolve();
      yield { type: 'text', text: word };
    }
    yield {
      type: 'done',
      outcome: 'answered',
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  },
};
