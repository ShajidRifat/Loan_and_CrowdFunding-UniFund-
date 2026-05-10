import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { auth } from '../lib/utils';
import { ShieldAlert } from 'lucide-react';

export default function RecoveryDashboard() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col h-full relative items-center justify-center p-8">
        <div className="max-w-xl w-full text-center space-y-6">
            <div className="h-24 w-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <ShieldAlert className="h-12 w-12" />
            </div>

            <h1 className="font-display font-bold text-3xl text-slate-900">Account Restricted</h1>

            <div className="bg-white p-8 rounded-2xl shadow-xl border-l-4 border-red-500 text-left">
                <h3 className="font-bold text-lg text-red-600 mb-2">Notice of Suspension</h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                    Your account has been temporarily suspended due to flagged activity or outstanding compliance issues.
                    While you cannot apply for new loans or create campaigns, you <strong>must still repay your outstanding loans</strong>.
                </p>

                <p className="text-slate-600 mb-6 leading-relaxed">
                    Failure to settle your debts may result in permanent legal action. Please proceed effectively immediately.
                </p>

                <div className="flex gap-4">
                    <button onClick={() => navigate('/my-loans')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors text-center shadow-lg shadow-red-500/20">
                        Go to Repayments
                    </button>
                    <button onClick={auth.logout} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition-colors text-center">
                        Sign Out
                    </button>
                </div>
            </div>

            <p className="text-sm text-slate-400">
                Contact support at <a href="#" className="text-brand-600 hover:underline">legal@unifund.edu</a> for appeals.
            </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
