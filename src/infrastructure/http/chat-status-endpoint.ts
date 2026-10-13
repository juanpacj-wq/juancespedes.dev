import type { RateLimiter } from '../../application/ports/contact';
import type { GetChatStatus } from '../../application/use-cases/get-chat-status';

/*
 * GET /api/chat-status (ADR 0017): `{"chat":"on"|"off"|"paused"}` for the daily budget workflow,
 * which opens an issue while the chat is paused for a low balance. It never reveals the balance.
 * Rate limited, since every miss of the balance cache costs a call to DeepSeek.
 */

export interface ChatStatusEndpointDeps {
  readonly getChatStatus: GetChatStatus;
  readonly rateLimiter: RateLimiter;
  readonly visitorKeyFor: (ip: string) => Promise<string>;
}

const headers = { 'cache-control': 'no-store' };

export const makeChatStatusEndpoint =
  ({ getChatStatus, rateLimiter, visitorKeyFor }: ChatStatusEndpointDeps) =>
  async (request: Request): Promise<Response> => {
    const visitor = await visitorKeyFor(request.headers.get('cf-connecting-ip') ?? 'unknown');
    if (!(await rateLimiter.allow(`chat-status:${visitor}`))) {
      return Response.json({ error: 'rate-limited' }, { status: 429, headers });
    }
    return Response.json({ chat: await getChatStatus() }, { headers });
  };
