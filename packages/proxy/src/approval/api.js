"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApi = startApi;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const queue_1 = require("./queue");
const logger_1 = require("../observability/logger");
function startApi(injectRequest) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get('/pending', (req, res) => {
        try {
            res.json((0, queue_1.getPending)());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/stats', (req, res) => {
        try {
            res.json((0, queue_1.getStats)());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.post('/approve/:id', async (req, res) => {
        const id = req.params.id;
        try {
            const approval = (0, queue_1.getApproval)(id);
            if (!approval || approval.status !== 'pending') {
                return res.status(400).json({ error: 'Ticket not found or already resolved' });
            }
            // Extract original json-rpc id to correlate
            const parsedReq = JSON.parse(approval.raw_request);
            const reqId = parsedReq.id;
            // Inject into running proxy and wait for response
            const result = await injectRequest(approval.raw_request, reqId);
            (0, queue_1.resolveApproval)(id, 'approved', JSON.stringify(result));
            res.json({ status: 'approved', result });
        }
        catch (err) {
            logger_1.logger.error(`Error approving ${id}: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    });
    app.post('/deny/:id', (req, res) => {
        const id = req.params.id;
        try {
            (0, queue_1.resolveApproval)(id, 'denied');
            res.json({ status: 'denied' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    const port = process.env.STRUCTURA_API_PORT || 4000;
    app.listen(port, () => {
        logger_1.logger.info(`Dashboard API running on port ${port}`);
    });
}
//# sourceMappingURL=api.js.map