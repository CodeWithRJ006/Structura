import { useState, useEffect } from 'react';
import { fetchStats, fetchPending, approveTicket, denyTicket, Stats, ApprovalRecord } from './api';

function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<ApprovalRecord[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [s, p] = await Promise.all([fetchStats(), fetchPending()]);
      setStats(s);
      setPending(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await approveTicket(id);
      setLastResult(JSON.stringify(res.result, null, 2));
      await loadData();
    } catch (err) {
      alert('Error approving ticket');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await denyTicket(id);
      await loadData();
    } catch (err) {
      alert('Error denying ticket');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Structura Dashboard</h1>
      
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-gray-500 text-sm">Pending Approvals</h3>
            <p className="text-2xl font-bold">{stats.totalQueued}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-gray-500 text-sm">Total Approved</h3>
            <p className="text-2xl font-bold">{stats.totalApproved}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-gray-500 text-sm">Total Denied</h3>
            <p className="text-2xl font-bold">{stats.totalDeniedHuman}</p>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-green-800 font-bold mb-2">Last Execution Result</h3>
          <pre className="text-xs overflow-auto max-h-40">{lastResult}</pre>
          <button className="mt-2 text-sm text-green-700 underline" onClick={() => setLastResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Args</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pending.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No pending items</td></tr>
            )}
            {pending.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.tool} <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{item.source}</span></td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.reason}</td>
                <td className="px-6 py-4 text-sm text-gray-500"><pre className="text-xs">{item.args_json}</pre></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.round((Date.now() - item.created_at) / 1000)}s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleApprove(item.id)} className="text-green-600 hover:text-green-900 mr-4">Approve</button>
                  <button onClick={() => handleDeny(item.id)} className="text-red-600 hover:text-red-900">Deny</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
