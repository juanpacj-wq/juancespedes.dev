import type { ChatQuota, QuotaDecision } from '../../application/ports/chat';

/** The slice of a Workers KV namespace the quota needs. */
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface KvChatQuotaOptions {
  readonly kv: KvLike;
  readonly perVisitor: number;
  readonly perDay: number;
  /** The day the counters belong to, `YYYY-MM-DD` in UTC. */
  readonly today: () => string;
}

const TWO_DAYS = 2 * 24 * 60 * 60;

/*
 * Daily question quotas on Workers KV (ADR 0017): one counter per anonymized visitor and one for
 * the whole site, both expiring after two days. KV is eventually consistent, so under bursts a
 * few extra questions can slip through; the per-minute rate limit and the provider balance guard
 * (deepseek-budget.ts) bound that. A KV failure denies the question: this guard protects money.
 */
export const makeKvChatQuota = ({
  kv,
  perVisitor,
  perDay,
  today,
}: KvChatQuotaOptions): ChatQuota => ({
  async consume(visitorKey): Promise<QuotaDecision> {
    const day = today();
    const visitorCounter = `chat:visitor:${day}:${visitorKey}`;
    const dayCounter = `chat:day:${day}`;
    try {
      const [visitor, total] = await Promise.all([kv.get(visitorCounter), kv.get(dayCounter)]);
      const visitorCount = Number(visitor ?? '0');
      const totalCount = Number(total ?? '0');
      if (visitorCount >= perVisitor) return 'visitor-limit';
      if (totalCount >= perDay) return 'daily-limit';
      await Promise.all([
        kv.put(visitorCounter, String(visitorCount + 1), { expirationTtl: TWO_DAYS }),
        kv.put(dayCounter, String(totalCount + 1), { expirationTtl: TWO_DAYS }),
      ]);
      return 'allowed';
    } catch {
      return 'daily-limit';
    }
  },
});

/**
 * An anonymous, daily-rotating visitor id: SHA-256 of the IP, the day and a secret pepper. The
 * raw IP is never stored, and the pepper keeps the small IPv4 space from being brute-forced.
 */
export const visitorKey = async (ip: string, day: string, pepper: string): Promise<string> => {
  const data = new TextEncoder().encode(`${ip}|${day}|${pepper}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};
