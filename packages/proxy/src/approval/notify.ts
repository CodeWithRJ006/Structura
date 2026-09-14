import { logger } from '../observability/logger';

export function notifyPending(id: string, tool: string, reason: string, args: Record<string, unknown>) {
  const webhookUrl = process.env.STRUCTURA_SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.info(`Notification disabled (STRUCTURA_SLACK_WEBHOOK_URL unset). Pending item ${id} queued.`);
    return;
  }

  const amountStr = args.amount ? ` (Amount: ${args.amount})` : '';
  const message = {
    text: `*Approval Required*\n*Ticket*: ${id}\n*Tool*: ${tool}${amountStr}\n*Reason*: ${reason}`
  };

  // Fire and forget
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  }).catch(err => {
    logger.error(`Failed to send slack notification for ${id}:`, err);
  });
}
