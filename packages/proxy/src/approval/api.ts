import express from 'express';
import cors from 'cors';
import { getPending, getStats, getApproval, resolveApproval } from './queue';
import { logger } from '../observability/logger';
import * as path from 'path';
import * as fs from 'fs';

export function startApi(injectRequest: (rawRequest: string, reqId: number) => Promise<any>) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/pending', (req, res) => {
    try {
      res.json(getPending());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/stats', (req, res) => {
    try {
      res.json(getStats());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/approve/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const approval = getApproval(id);
      if (!approval || approval.status !== 'pending') {
        return res.status(400).json({ error: 'Ticket not found or already resolved' });
      }

      // Extract original json-rpc id to correlate
      const parsedReq = JSON.parse(approval.raw_request);
      const reqId = parsedReq.id;

      // Inject into running proxy and wait for response
      const result = await injectRequest(approval.raw_request, reqId);
      
      resolveApproval(id, 'approved', JSON.stringify(result));
      res.json({ status: 'approved', result });
    } catch (err: any) {
      logger.error(`Error approving ${id}: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/deny/:id', (req, res) => {
    const id = req.params.id;
    try {
      resolveApproval(id, 'denied');
      res.json({ status: 'denied' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static dashboard if STRUCTURA_DASHBOARD_PATH is set
  const dashboardPath = process.env.STRUCTURA_DASHBOARD_PATH;
  if (dashboardPath && fs.existsSync(dashboardPath)) {
    app.use(express.static(dashboardPath));
    // SPA fallback
    app.get('*', (req, res) => res.sendFile(path.join(dashboardPath, 'index.html')));
    logger.info(`Serving static dashboard from ${dashboardPath}`);
  }

  const port = process.env.STRUCTURA_API_PORT || 4000;
  app.listen(port, () => {
    logger.info(`Dashboard API running on port ${port}`);
  });
}

