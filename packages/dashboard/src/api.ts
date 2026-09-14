const API_BASE = 'http://localhost:4000';

export interface Stats {
  totalQueued: number;
  totalApproved: number;
  totalDeniedHuman: number;
}

export interface ApprovalRecord {
  id: string;
  tool: string;
  args_json: string;
  source: string;
  reason: string;
  created_at: number;
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchPending(): Promise<ApprovalRecord[]> {
  const res = await fetch(`${API_BASE}/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending');
  return res.json();
}

export async function approveTicket(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/approve/${id}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to approve');
  return res.json();
}

export async function denyTicket(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/deny/${id}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to deny');
  return res.json();
}
