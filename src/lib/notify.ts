import { sendToDiscord } from './discord';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface NotifyContext {
  level: LogLevel;
  title: string;
  reportDate?: string;
  error?: unknown;
  message?: string;
  attempt?: number;
  maxAttempts?: number;
  durationMs?: number;
}

export async function notify(ctx: NotifyContext) {
  try {
    await Promise.allSettled([
      sendToDiscord(ctx),
    ]);
  } catch (err) {
    console.error('Notify system error:', err);
  }
}
