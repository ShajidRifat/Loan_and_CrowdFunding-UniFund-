import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth } from '../lib/utils';
import { ArrowLeft, X, AlertTriangle } from 'lucide-react';

export default function FraudCenter() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const data = await apiCall('api/fraud_alerts.php');
            setAlerts(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const u = auth.getUser();
        if (!u || u.role !== 'admin') { navigate('/dashboard'); return; }
        fetchAlerts();
    }, [navigate]);

    const openInvestigation = (userId: number) => {
        const alert = alerts.find(a => a.user.id == userId);
        if (!alert) return;

        const user = alert.user;
        const isBlocked = user.status === 'banned';

        const handleBlockState = async (shouldBlock: boolean) => {
            try {
                const newStatus = shouldBlock ? 'banned' : 'active';
                await apiCall('api/admin_users.php', 'PUT', { id: userId, status: newStatus });
                fetchAlerts();
                setModalContent(null);
            } catch (err: any) {
                alert(err.message || 'Action failed');
            }
        };

        setModalContent({
            title: 'Investigation Details',
            content: (
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <img src={user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name.replace(' ','')} className="h-16 w-16 rounded-full border-2 border-slate-100" alt="Avatar"/>
                        <div>
                            <h4 className="text-lg font-bold text-slate-900">{user.name}</h4>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            <p className="text-xs text-brand-600 font-bold uppercase mt-1">{user.role}</p>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
                        <h5 className="text-red-800 font-bold text-sm mb-1 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4"/> Alert Trigger
                        </h5>
                        <p className="text-red-600 text-sm">{alert.activity}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase font-bold">CGPA</p>
                            <p className="text-lg font-bold text-slate-900">{user.cgpa}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase font-bold">Current Status</p>
                            <p className={`text-lg font-bold ${isBlocked ? 'text-red-600' : 'text-emerald-600'}`}>{isBlocked ? 'Blocked' : 'Active'}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setModalContent(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        {isBlocked ? (
                            <button onClick={() => handleBlockState(false)} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">Unblock User</button>
                        ) : (
                            <button onClick={() => handleBlockState(true)} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">Block User</button>
                        )}
                    </div>
                </div>
            )
        });
    };

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4">
                <div className="max-w-7xl mx-auto fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Suspicious Activity Monitor</h1>
                                <p className="text-slate-500">Real-time alerts on potential fraud patterns.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-900">User</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900">Activity</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900">Risk Score</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">Loading alerts...</td></tr>
                                ) : alerts.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">No suspicious activity detected.</td></tr>
                                ) : (
                                    alerts.map((alert: any, idx: number) => {
                                        const user = alert.user;
                                        const isBlocked = user.status === 'banned';
                                        
                                        let riskClass = 'bg-orange-100 text-orange-800';
                                        if (alert.severity === 'High') riskClass = 'bg-red-100 text-red-800';
                                        if (alert.severity === 'Low') riskClass = 'bg-slate-100 text-slate-600';

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{user.name}</div>
                                                    <div className="text-xs text-slate-500">ID: {user.id}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-900">{alert.activity}</div>
                                                    <div className="text-xs text-slate-500">{new Date(alert.date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskClass}`}>
                                                        {user.risk_tier || 'Medium'} ({alert.severity})
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isBlocked ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">Blocked</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Flagged</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => openInvestigation(user.id)} className="text-brand-600 hover:text-brand-700 font-bold text-sm bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors">
                                                        Investigate
                                                    </button>
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

            {modalContent && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                             <h3 className="text-xl font-bold text-slate-900">{modalContent.title}</h3>
                             <button onClick={() => setModalContent(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                        </div>
                        {modalContent.content}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
