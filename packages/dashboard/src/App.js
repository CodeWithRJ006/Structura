import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { fetchStats, fetchPending, approveTicket, denyTicket, Stats, ApprovalRecord } from './api';
function App() {
    const [stats, setStats] = useState(null);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastResult, setLastResult] = useState(null);
    const loadData = async () => {
        try {
            const [s, p] = await Promise.all([fetchStats(), fetchPending()]);
            setStats(s);
            setPending(p);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, []);
    const handleApprove = async (id) => {
        try {
            const res = await approveTicket(id);
            setLastResult(JSON.stringify(res.result, null, 2));
            await loadData();
        }
        catch (err) {
            alert('Error approving ticket');
        }
    };
    const handleDeny = async (id) => {
        try {
            await denyTicket(id);
            await loadData();
        }
        catch (err) {
            alert('Error denying ticket');
        }
    };
    return (_jsxs("div", { className: "max-w-5xl mx-auto py-8 px-4", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "Structura Dashboard" }), stats && (_jsxs("div", { className: "grid grid-cols-3 gap-4 mb-8", children: [_jsxs("div", { className: "bg-white p-6 rounded shadow", children: [_jsx("h3", { className: "text-gray-500 text-sm", children: "Pending Approvals" }), _jsx("p", { className: "text-2xl font-bold", children: stats.totalQueued })] }), _jsxs("div", { className: "bg-white p-6 rounded shadow", children: [_jsx("h3", { className: "text-gray-500 text-sm", children: "Total Approved" }), _jsx("p", { className: "text-2xl font-bold", children: stats.totalApproved })] }), _jsxs("div", { className: "bg-white p-6 rounded shadow", children: [_jsx("h3", { className: "text-gray-500 text-sm", children: "Total Denied" }), _jsx("p", { className: "text-2xl font-bold", children: stats.totalDeniedHuman })] })] })), lastResult && (_jsxs("div", { className: "mb-8 p-4 bg-green-50 border border-green-200 rounded", children: [_jsx("h3", { className: "text-green-800 font-bold mb-2", children: "Last Execution Result" }), _jsx("pre", { className: "text-xs overflow-auto max-h-40", children: lastResult }), _jsx("button", { className: "mt-2 text-sm text-green-700 underline", onClick: () => setLastResult(null), children: "Dismiss" })] })), _jsx("div", { className: "bg-white rounded shadow overflow-hidden", children: _jsxs("table", { className: "min-w-full", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tool" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Reason" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Args" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Age" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-200", children: [pending.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-6 py-4 text-center text-gray-500", children: "No pending items" }) })), pending.map(item => (_jsxs("tr", { children: [_jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900", children: [item.tool, " ", _jsx("span", { className: "ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800", children: item.source })] }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500", children: item.reason }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500", children: _jsx("pre", { className: "text-xs", children: item.args_json }) }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: [Math.round((Date.now() - item.created_at) / 1000), "s"] }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium", children: [_jsx("button", { onClick: () => handleApprove(item.id), className: "text-green-600 hover:text-green-900 mr-4", children: "Approve" }), _jsx("button", { onClick: () => handleDeny(item.id), className: "text-red-600 hover:text-red-900", children: "Deny" })] })] }, item.id)))] })] }) })] }));
}
export default App;
//# sourceMappingURL=App.js.map