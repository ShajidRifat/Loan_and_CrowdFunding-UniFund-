import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { ArrowLeft, Inbox, Plus, CheckCircle2, CreditCard, Sparkles, Info, X } from 'lucide-react';

export default function MyLoans() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);

    useEffect(() => {
        const u = auth.getUser();
        if (!u) { navigate('/login'); return; }
        setUser(u);

        const fetchLoans = async () => {
            try {
                const data = await apiCall(`api/get_my_loans.php?user_id=${u.id}`);
                setLoans(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLoans();
    }, [navigate]);

    const activeLoans = loans.filter(loan => {
        const status = (loan.status || '').toLowerCase();
        return status !== 'completed' && status !== 'paid' && loan.status_id != 4 && loan.status_id != 5;
    });

    const viewLoanDetails = async (id: number) => {
        try {
            const response = await apiCall(`api/get_repayment_schedule.php?loan_id=${id}`);
            const schedule = response.schedule || [];
            
            setModalContent({
                title: 'Repayment Schedule',
                content: <ScheduleDetails schedule={schedule} loanId={id} onClose={() => setModalContent(null)} />
            });
        } catch (err) {
            alert('Failed to load schedule');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4">
                <div className="max-w-6xl mx-auto fade-in">
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">My Loans</h1>
                                <p className="text-slate-500">Track and manage your active loan applications.</p>
                            </div>
                        </div>
                        {user?.role === 'student' && (
                            <button onClick={() => navigate('/apply-loan')} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                                <Plus className="h-4 w-4" /> New Application
                            </button>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full py-12 text-center text-slate-500">Loading loans...</div>
                        ) : activeLoans.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="mx-auto h-12 w-12 text-slate-300 mb-3"><Inbox className="h-full w-full"/></div>
                                <h3 className="text-slate-900 font-medium">No active loans</h3>
                                <p className="text-slate-500 text-sm">You don't have any active loans at the moment.</p>
                            </div>
                        ) : (
                            activeLoans.map((loan, idx) => {
                                const amount = parseFloat(loan.principal_amount);
                                const amountPaid = parseFloat(loan.amount_paid || 0);
                                const progress = amount > 0 ? Math.min((amountPaid / amount) * 100, 100) : 0;
                                
                                let statusBadgeClass = 'bg-gray-100 text-gray-700';
                                let statusLabel = loan.status;
                                if (loan.status === 'approved') { statusBadgeClass = 'bg-blue-100 text-blue-700'; statusLabel = 'Approved'; }
                                if (loan.status === 'pending') { statusBadgeClass = 'bg-orange-100 text-orange-700'; statusLabel = 'Pending'; }

                                return (
                                    <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusBadgeClass}`}>
                                                {statusLabel}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">Applied: {new Date(loan.applied_at).toLocaleDateString()}</span>
                                        </div>

                                        <div className="mb-6">
                                            <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(amount)}</div>
                                            <div className="text-slate-500 font-medium">{loan.title || 'Personal Loan'}</div>
                                        </div>

                                        <div className="mb-6">
                                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                                <span>Repayment Progress</span>
                                                <span>{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-600 rounded-full transition-all duration-1000" style={{width: `${progress}%`}}></div>
                                            </div>
                                            <div className="flex justify-between text-xs mt-2">
                                                <span className="text-emerald-600 font-bold">Paid: {formatCurrency(amountPaid)}</span>
                                                <span className="text-slate-400">Remaining: {formatCurrency(amount - amountPaid)}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => viewLoanDetails(loan.id)} className="flex-1 py-2.5 bg-white border border-brand-600 text-brand-600 font-bold rounded-lg hover:bg-brand-50 transition-colors text-sm">
                                                View Schedule
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {modalContent && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
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

function ScheduleDetails({ schedule, loanId, onClose }: any) {
    const totalDue = schedule.reduce((sum: number, item: any) => sum + parseFloat(item.installment_amount), 0);
    const totalPaid = schedule.reduce((sum: number, item: any) => sum + parseFloat(item.status === 'paid' ? item.installment_amount : 0), 0);
    const remaining = totalDue - totalPaid;
    const [activePrompt, setActivePrompt] = useState<{type: 'full' | 'installment', data?: any} | null>(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState('');

    const handleFullPayment = async () => {
        setProcessing(true);
        try {
            await apiCall('api/repay_loan.php', 'POST', {
                user_id: auth.getUser()?.id,
                loan_id: loanId,
                amount: remaining,
                full_settlement: true
            });
            setSuccess(`Loan Settled! Paid ${formatCurrency(remaining)}`);
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            alert(err.message || 'Payment failed');
            setProcessing(false);
        }
    };

    const handleInstallmentPayment = async (instId: number, amount: number) => {
        setProcessing(true);
        try {
            await apiCall('api/repay_loan.php', 'POST', {
                user_id: auth.getUser()?.id,
                loan_id: loanId,
                amount: amount,
                installment_id: instId
            });
            setSuccess(`Paid ${formatCurrency(amount)}`);
            setTimeout(() => { setActivePrompt(null); setSuccess(''); onClose(); }, 2000);
        } catch (err: any) {
            alert(err.message || 'Payment failed');
            setProcessing(false);
        }
    };

    if (success) {
        return (
            <div className="text-center p-8">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">{success}</h3>
            </div>
        );
    }

    if (processing) {
        return (
            <div className="text-center p-8">
                <div className="animate-spin h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Processing Repayment...</p>
            </div>
        );
    }

    if (activePrompt?.type === 'full') {
        return (
            <div className="space-y-4">
                 <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div className="text-sm text-indigo-800">
                        <p className="font-bold">Full Repayment</p>
                        <p className="mt-1">You are about to pay off the entire remaining balance of <strong>{formatCurrency(remaining)}</strong>. This will mark the loan as fully paid!</p>
                    </div>
                </div>
                <button onClick={handleFullPayment} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Confirm Payment
                </button>
                <button onClick={() => setActivePrompt(null)} className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-center">Cancel</button>
            </div>
        );
    }

    if (activePrompt?.type === 'installment') {
        const { item } = activePrompt.data;
        const amt = parseFloat(item.installment_amount);
        return (
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <p className="font-bold">Dynamic Rescheduling Notice</p>
                        <p className="mt-1">You are about to pay <strong>{formatCurrency(amt)}</strong>. After this payment, a 5% interest rate will be compounded on your remaining loan balance, and your future installments will be recalculated and rescheduled.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <input type="checkbox" id="resch" className="mt-1 w-4 h-4 rounded text-brand-600" />
                    <label htmlFor="resch" className="text-sm text-slate-700 leading-tight">I understand that a 5% compounding interest will be applied.</label>
                </div>
                <button onClick={() => {
                    if (!(document.getElementById('resch') as HTMLInputElement).checked) return alert('Please confirm terms');
                    handleInstallmentPayment(item.installment_id, amt);
                }} className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex justify-center gap-2">
                    <CreditCard className="h-5 w-5" /> Confirm Payment
                </button>
                <button onClick={() => setActivePrompt(null)} className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-center">Cancel</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                 <div>
                    <p className="text-slate-500 text-xs uppercase font-bold">Total Remaining</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(remaining)}</p>
                 </div>
                 <div className="text-right">
                     <p className="text-slate-500 text-xs uppercase font-bold">Next Due Date</p>
                     <p className="text-brand-600 font-bold">{schedule.find((s:any) => s.status !== 'paid')?.due_date || 'None'}</p>
                 </div>
            </div>

            {remaining > 0 && (
                <button onClick={() => setActivePrompt({type: 'full'})} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Pay Full Amount ({formatCurrency(remaining)})
                </button>
            )}

            <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                            <th className="p-3">Month</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {schedule.map((item: any) => {
                            const isPaid = item.status === 'paid';
                            return (
                                <tr key={item.installment_id} className="bg-white hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-900">#{item.installment_number}</td>
                                    <td className="p-3 text-slate-500">{item.due_date}</td>
                                    <td className="p-3 font-bold text-slate-900">{formatCurrency(item.installment_amount)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {!isPaid ? (
                                            <button onClick={() => setActivePrompt({type: 'installment', data: {item}})} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors">
                                                Pay
                                            </button>
                                        ) : (
                                            <span className="text-emerald-500 font-bold flex items-center justify-end gap-1"><CheckCircle2 className="h-4 w-4" /> Paid</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
