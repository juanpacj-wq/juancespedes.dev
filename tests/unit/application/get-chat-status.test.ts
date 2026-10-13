import { describe, expect, it, vi } from 'vitest';

import { makeGetChatStatus } from '../../../src/application/use-cases/get-chat-status';

const budget = (hasFunds: boolean) => ({ hasFunds: vi.fn(() => Promise.resolve(hasFunds)) });

describe('getChatStatus', () => {
  it('is on with funds and paused without them', async () => {
    expect(await makeGetChatStatus({ enabled: true, budget: budget(true) })()).toBe('on');
    expect(await makeGetChatStatus({ enabled: true, budget: budget(false) })()).toBe('paused');
  });

  it('is off with the kill switch off, without reading the balance', async () => {
    const funds = budget(false);
    expect(await makeGetChatStatus({ enabled: false, budget: funds })()).toBe('off');
    expect(funds.hasFunds).not.toHaveBeenCalled();
  });
});
