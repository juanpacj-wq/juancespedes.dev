import type { ChatBudget } from '../../application/ports/chat';
import type { KvLike } from '../security/kv-chat-quota';

/*
 * Balance guard for "Ask me" on DeepSeek (ADR 0017). The account is prepaid, so the balance is
 * the hard ceiling on spending; this pauses the chat before it runs out, below `minimumUsd`.
 * - The balance is read from DeepSeek's `/user/balance` and cached in KV for ten minutes, so
 *   questions do not each call it and a top-up resumes the chat within that time.
 * - Only the USD balance counts, and only while DeepSeek reports the account as available.
 * - Any failure (DeepSeek, KV, an unexpected answer) pauses the chat: this guard protects money.
 */

export interface DeepSeekBudgetOptions {
  readonly apiKey: string;
  readonly minimumUsd: number;
  readonly kv: KvLike;
  /** Injected for tests; defaults to the global fetch. */
  readonly fetch?: typeof fetch;
  readonly endpoint?: string;
  /** Called when the balance cannot be read; the chat is paused meanwhile. */
  readonly onError?: (error: unknown) => void;
}

interface BalanceResponse {
  readonly is_available?: boolean;
  readonly balance_infos?: readonly {
    readonly currency?: string;
    readonly total_balance?: string;
  }[];
}

export const BALANCE_CACHE_KEY = 'chat:balance';
const CACHE_SECONDS = 10 * 60;

const usdBalance = (body: BalanceResponse): number => {
  if (body.is_available !== true) return 0;
  const usd = body.balance_infos?.find((info) => info.currency === 'USD');
  const amount = Number(usd?.total_balance);
  return Number.isFinite(amount) ? amount : 0;
};

export const makeDeepSeekBudget = ({
  apiKey,
  minimumUsd,
  kv,
  fetch: fetchImpl = fetch,
  endpoint = 'https://api.deepseek.com/user/balance',
  onError,
}: DeepSeekBudgetOptions): ChatBudget => ({
  async hasFunds() {
    try {
      const cached = await kv.get(BALANCE_CACHE_KEY);
      if (cached !== null) return Number(cached) >= minimumUsd;

      const response = await fetchImpl(endpoint, {
        headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok)
        throw new Error(`DeepSeek balance answered HTTP ${String(response.status)}`);
      const balance = usdBalance((await response.json()) as BalanceResponse);
      await kv.put(BALANCE_CACHE_KEY, String(balance), { expirationTtl: CACHE_SECONDS });
      return balance >= minimumUsd;
    } catch (error) {
      onError?.(error);
      return false;
    }
  },
});

/** For providers without a prepaid balance to watch (the fake model, Claude with its own cap). */
export const unlimitedBudget: ChatBudget = { hasFunds: () => Promise.resolve(true) };
