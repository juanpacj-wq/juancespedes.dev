import type { ChatBudget } from '../ports/chat';

/** `off`: the kill switch is off. `paused`: the provider balance is below the minimum. */
export type ChatStatus = 'on' | 'off' | 'paused';

export interface GetChatStatusDeps {
  readonly enabled: boolean;
  readonly budget: ChatBudget;
}

/**
 * Whether "Ask me" would take a question now, for the daily budget check (ADR 0017). It says
 * nothing about the balance itself, only whether the chat is paused because of it.
 */
export const makeGetChatStatus =
  ({ enabled, budget }: GetChatStatusDeps) =>
  async (): Promise<ChatStatus> => {
    if (!enabled) return 'off';
    return (await budget.hasFunds()) ? 'on' : 'paused';
  };

export type GetChatStatus = ReturnType<typeof makeGetChatStatus>;
