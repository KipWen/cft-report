import './proxy';
import { NotifyContext, LogLevel } from './notify';

const LEVEL_COLORS: Record<LogLevel, number> = {
  INFO: 0x3498db,
  SUCCESS: 0x2ecc71,
  WARNING: 0xf1c40f,
  ERROR: 0xe74c3c,
};

function truncate(text: string, maxLength = 3800): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '\n... [Truncated]' : text;
}

export async function sendToDiscord(ctx: NotifyContext) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const userId = process.env.DISCORD_USER_ID;

  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not set, skipping notification');
    return;
  }

  const fields = [];
  if (ctx.reportDate) fields.push({ name: 'Report Date', value: ctx.reportDate, inline: true });
  if (ctx.attempt) fields.push({ name: 'Attempt', value: `${ctx.attempt}${ctx.maxAttempts ? ` / ${ctx.maxAttempts}` : ''}`, inline: true });
  if (ctx.durationMs != null) fields.push({ name: 'Duration', value: `${(ctx.durationMs / 1000).toFixed(2)}s`, inline: true });
  fields.push({ name: 'Environment', value: process.env.NODE_ENV === 'production' ? 'Production' : 'Development', inline: true });

  let errorMsg = '';
  if (ctx.error) {
    errorMsg = ctx.error instanceof Error ? ctx.error.message : String(ctx.error);
    if (ctx.error instanceof Error && ctx.error.stack) {
      errorMsg = `${errorMsg}\n\nStack:\n${ctx.error.stack}`;
    }
  }

  const descriptionLines = [];
  if (ctx.message) descriptionLines.push(ctx.message);
  if (errorMsg) {
    descriptionLines.push(`\`\`\`text\n${truncate(errorMsg)}\n\`\`\``);
  }

  const mention = userId ? `<@${userId}> ` : '';

  const payload = {
    content: mention || undefined,
    embeds: [
      {
        title: ctx.title,
        description: descriptionLines.join('\n\n') || undefined,
        color: LEVEL_COLORS[ctx.level],
        fields: fields.length ? fields : undefined,
        timestamp: new Date().toISOString(),
        footer: { text: 'CFTC Automation Bot' },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Discord API returned ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('Failed to send Discord notification:', err);
  }
}
