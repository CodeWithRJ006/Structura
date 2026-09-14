"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyPending = notifyPending;
const logger_1 = require("../observability/logger");
function notifyPending(id, tool, reason, args) {
    const webhookUrl = process.env.STRUCTURA_SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        logger_1.logger.info(`Notification disabled (STRUCTURA_SLACK_WEBHOOK_URL unset). Pending item ${id} queued.`);
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
        logger_1.logger.error(`Failed to send slack notification for ${id}:`, err);
    });
}
//# sourceMappingURL=notify.js.map