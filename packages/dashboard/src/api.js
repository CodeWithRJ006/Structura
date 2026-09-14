const API_BASE = 'http://localhost:4000';
export async function fetchStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok)
        throw new Error('Failed to fetch stats');
    return res.json();
}
export async function fetchPending() {
    const res = await fetch(`${API_BASE}/pending`);
    if (!res.ok)
        throw new Error('Failed to fetch pending');
    return res.json();
}
export async function approveTicket(id) {
    const res = await fetch(`${API_BASE}/approve/${id}`, { method: 'POST' });
    if (!res.ok)
        throw new Error('Failed to approve');
    return res.json();
}
export async function denyTicket(id) {
    const res = await fetch(`${API_BASE}/deny/${id}`, { method: 'POST' });
    if (!res.ok)
        throw new Error('Failed to deny');
    return res.json();
}
//# sourceMappingURL=api.js.map