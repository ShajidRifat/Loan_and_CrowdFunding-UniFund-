import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { ArrowLeft, FileClock, Banknote, FileCheck, RefreshCw, Gift, Heart } from 'lucide-react';

export default function History() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = auth.getUser();
        if (!u) { navigate('/login'); return; }

        const fetchHistory = async () => {
            try {
                const data = await apiCall(`api/get_transaction_history.php?user_id=${u.id}`);
                setTransactions(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [navigate]);

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 pt-4">
                <div className="max-w-6xl mx-auto fade-in">
                    <div className="mb-8 flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <ArrowLeft className="h-6 w-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="font-display text-2xl font-bold text-slate-900">Payment History</h1>
                            <p className="text-slate-500 text-sm mt-1">View all your transactions and financial activity</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-700">Type</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Amount</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Description</th>
                                        <th className="px-6 py-4 font-bold text-slate-700 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading history...</td></tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="mx-auto h-12 w-12 text-slate-300 mb-3"><FileClock className="h-full w-full"/></div>
                                                <p className="text-slate-500 font-medium">No transactions found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx: any, i: number) => {
                                            const isDebit = ['withdrawal', 'repayment', 'donation_sent'].includes(tx.type);
                                            const colorClass = isDebit ? 'text-slate-900' : 'text-emerald-600 font-bold';
                                            const sign = isDebit ? '-' : '+';
                                            const typeLabel = (tx.type || '').replace('_', ' ').toUpperCase();

                                            let typeIcon = <Banknote className="h-4 w-4" />;
                                            if (tx.type.includes('loan')) typeIcon = <FileCheck className="h-4 w-4" />;
                                            if (tx.type.includes('repayment')) typeIcon = <RefreshCw className="h-4 w-4" />;
                                            if (tx.type === 'donation_received') typeIcon = <Gift className="h-4 w-4" />;
                                            if (tx.type === 'donation_sent') typeIcon = <Heart className="h-4 w-4" />;

                                            return (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                                {typeIcon}
                                                            </div>
                                                            <span className="font-medium text-slate-900 text-xs tracking-wide">{typeLabel}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 ${colorClass}`}>
                                                        {sign}{formatCurrency(Math.abs(tx.amount))}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate" title={tx.description || ''}>
                                                        {tx.description || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-400 text-sm font-mono">
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
