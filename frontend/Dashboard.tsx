import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { 
  DollarSign, User as UserIcon, Briefcase, CheckSquare, 
  ArrowDownLeft, ArrowUpRight, Heart, CheckCircle,
  AlertTriangle, History
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{show: boolean, x: number, y: number, value: string}>({ show: false, x: 0, y: 0, value: '' });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const user = auth.getUser();
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role === 'admin') navigate('/admin-dashboard');
        if (user.role === 'donor') navigate('/donor-dashboard');

        const result = await apiCall(`api/dashboard/student.php`);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalLoans = parseFloat(data?.total_debt || '0');
  const activeCampaigns = data?.campaigns?.filter((c: any) => c.status === 'active')?.length || 0;
  const fundedCampaigns = data?.campaigns?.filter((c: any) => parseFloat(c.raised_amount || '0') >= parseFloat(c.goal_amount))?.length || 0;
  const totalRaised = parseFloat(data?.total_raised || '0');
  const computeTrustScore = (creditScore: number): number => {
    const MIN_SCORE = 300;
    const MAX_SCORE = 850;
    const clamped = Math.min(Math.max(creditScore, MIN_SCORE), MAX_SCORE);
    return Math.round(((clamped - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100);
  };

  const creditScore = data?.profile?.credit_score || 'N/A';
  const score = parseInt(creditScore === 'N/A' ? '300' : creditScore) || 300;
  const trustScore = computeTrustScore(score);
  
  const riskTier = data?.profile?.risk_tier || 'High Risk';
  const badgeColor = data?.profile?.badge_color || 'orange';
  const maxLoanAmount = data?.profile?.max_loan_amount ?? 5000;
  const accountStatus = data?.profile?.account_status || 'active';
  
  let tierColor = 'bg-slate-100 text-slate-700 border border-slate-200';
  if (badgeColor === 'green') tierColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  else if (badgeColor === 'yellow') tierColor = 'bg-amber-50 text-amber-700 border border-amber-100';
  else if (badgeColor === 'orange') tierColor = 'bg-orange-50 text-orange-700 border border-orange-100';
  else if (badgeColor === 'red') tierColor = 'bg-red-50 text-red-700 border border-red-100';

  const formatHeaderCase = (str: string) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase()) : '';

  // Calculate SVG
  const history = data?.financial_history || [];
  const svgHeight = 250;
  const svgWidth = 800;
  let points: any[] = [];
  let pathD = '';
  let areaD = '';

  if (history.length > 0) {
    const values = history.map((h: any) => parseFloat(h.total));
    const maxValue = Math.max(...values, 5000) * 1.2;
    const xStep = history.length > 1 ? svgWidth / (history.length - 1) : 0;
    
    points = values.map((val: number, index: number) => ({
        x: index * xStep,
        y: svgHeight - ((val / maxValue) * svgHeight),
        val,
        month: history[index].day
    }));

    pathD = `M ${points[0].x},${points[0].y}`;
    if (points.length > 1) {
        for (let i = 1; i < points.length; i++) {
            const curr = points[i];
            const prev = points[i - 1];
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp2x = curr.x - (curr.x - prev.x) / 2;
            pathD += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
        }
    } else {
        pathD += ` L ${svgWidth},${points[0].y}`;
    }
    areaD = `${pathD} V ${svgHeight} H 0 Z`;
  }

  const handleTooltip = (e: React.MouseEvent, val: number) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const containerRect = (e.currentTarget as HTMLElement).closest('.relative')!.getBoundingClientRect();
      setTooltip({
          show: true,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top,
          value: formatCurrency(val)
      });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <DashboardLayout>
      {/* Account Status Warnings */}
      {accountStatus === 'fraud_review' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6 shadow-sm"
        >
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Account Under Fraud Review</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Our system has flagged potential anomalous activity on your account. Your borrowing capabilities are temporarily restricted while our team reviews this.
            </p>
          </div>
        </motion.div>
      )}

      {accountStatus === 'suspended' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 mb-6 shadow-sm"
        >
          <div className="p-2 bg-red-100 text-red-800 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-red-900 text-sm">Account Suspended</h4>
            <p className="text-xs text-red-700 mt-0.5">
              Your student account has been suspended by an administrator. Please contact UniFund support if you believe this is an error.
            </p>
          </div>
        </motion.div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
          <motion.div variants={itemVariants} whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                  <DollarSign className="h-7 w-7" />
              </div>
              <div>
                  <div className="text-sm text-slate-500 font-medium">Total Outstanding Debt</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalLoans)}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">Current Balance</div>
              </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <UserIcon className="h-7 w-7" />
              </div>
              <div>
                  <div className="text-sm text-slate-500 font-medium">Active Campaigns</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{activeCampaigns}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">{fundedCampaigns} funded</div>
              </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                  <Briefcase className="h-7 w-7" />
              </div>
              <div>
                  <div className="text-sm text-slate-500 font-medium">Funds Raised</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRaised)}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">Across all campaigns</div>
              </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckSquare className="h-7 w-7" />
              </div>
              <div>
                  <div className="text-sm text-slate-500 font-medium">Credit Score</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{creditScore}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">Updated recently</div>
              </div>
          </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display font-bold text-lg text-slate-900">Financial Overview</h3>
              </div>

              <div className="h-64 w-full relative group">
                  <div style={{ opacity: tooltip.show ? 1 : 0, left: tooltip.x, top: tooltip.y }} className="absolute pointer-events-none transition-opacity duration-200 z-10 bg-slate-900 text-white text-xs rounded-lg py-1 px-2 shadow-xl -translate-x-1/2 -translate-y-full mt-[-8px]">
                      <span className="font-bold">{tooltip.value}</span>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>

                  {history.length > 0 ? (
                      <svg viewBox="0 0 800 300" className="w-full h-full overflow-visible">
                          <defs>
                              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                              </linearGradient>
                          </defs>
                          <line x1="0" y1="250" x2="800" y2="250" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="0" y1="175" x2="800" y2="175" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="100" x2="800" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="25" x2="800" y2="25" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                          <path d={areaD} fill="url(#areaGradient)" className="animate-area-fade" />
                          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-line-draw" />

                          <g className="data-points">
                              {points.map((p, i) => (
                                  <circle key={i} cx={p.x} cy={p.y} r="6" fill="#fff" stroke="#6366f1" strokeWidth="2"
                                      className="hover:r-8 transition-all cursor-pointer"
                                      onMouseOver={(e) => handleTooltip(e, p.val)} onMouseOut={() => setTooltip({...tooltip, show: false})} />
                              ))}
                          </g>
                      </svg>
                  ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">No financial history available.</div>
                  )}
                  {history.length > 0 && (
                      <div className="flex justify-between text-xs text-slate-400 font-medium mt-2 px-2">
                          {points.filter((_,i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length/6) === 0).map((p, i) => (
                              <span key={i}>{p.month}</span>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/60 rounded-full blur-3xl -mr-12 -mt-12"></div>
              <div className="relative z-10 flex flex-col items-start">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trust & Risk Score</h3>
                  <div className="flex items-baseline gap-2">
                      <div className="text-5xl font-display font-bold text-slate-900 mb-2">{trustScore}%</div>
                      <span className="text-xs text-slate-500 font-medium font-mono">(Score: {score}/850)</span>
                  </div>
                  <div className="flex flex-col gap-2 mt-1 mb-4 w-full">
                      <div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${tierColor}`}>
                              {riskTier}
                          </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">
                          Borrowing Cap: <span className="text-slate-900 font-bold">{formatCurrency(maxLoanAmount)}</span>
                      </div>
                  </div>
                  
                  <button 
                      onClick={() => setShowHistoryModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-bold transition-colors mt-2 border-b border-transparent hover:border-brand-600 pb-0.5"
                  >
                      <History className="h-3.5 w-3.5" />
                      View Score History
                  </button>
              </div>
              <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 w-full">
                  <h4 className="font-bold text-slate-900 text-xs mb-3 uppercase tracking-wider text-slate-400">Improve Score:</h4>
                  <ul className="text-slate-500 text-xs space-y-2">
                      <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> Pay installments on time (+10)</li>
                      <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> Repay loans completely (+25)</li>
                      <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> Complete campaign milestones (+15)</li>
                  </ul>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display font-bold text-lg text-slate-900">Recent Activity</h3>
              </div>
              <div className="space-y-6">
                  {data?.recent_transactions?.slice(0, 5).map((txn: any, i: number) => {
                      let Icon = ArrowDownLeft;
                      let color = 'green';
                      let title = 'Transaction';
                      if (txn.type === 'loan_disbursal' || txn.type === 'loan_disbursement') { Icon = ArrowDownLeft; color = 'green'; title = 'Loan Disbursed'; }
                      else if (txn.type === 'loan_repayment') { Icon = ArrowUpRight; color = 'blue'; title = 'Repayment Sent'; }
                      else if (txn.type === 'donation') { Icon = Heart; color = 'pink'; title = 'Donation Received'; }
                      const isCredit = parseFloat(txn.amount) > 0;

                      return (
                          <div key={i} className="flex gap-4">
                              <div className={`h-10 w-10 text-${color}-600 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-bold text-slate-900 text-sm">{title}</p>
                                          <p className="text-xs text-slate-500">{txn.description || formatHeaderCase(txn.type)}</p>
                                      </div>
                                      <span className="font-bold text-slate-900 text-sm">{isCredit ? '+' : ''}{formatCurrency(txn.amount)}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{new Date(txn.created_at).toLocaleString()}</p>
                              </div>
                          </div>
                      );
                  })}
                  {(!data?.recent_transactions || data.recent_transactions.length === 0) && (
                      <p className="text-slate-400 text-sm">No recent activity.</p>
                  )}
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <h3 className="font-display font-bold text-lg text-slate-900 mb-6">Upcoming</h3>
              <div className="space-y-4">
                  {data?.upcoming_obligations && data.upcoming_obligations.length > 0 ? (
                      data.upcoming_obligations.map((item: any, i: number) => {
                          const date = new Date(item.due_date);
                          const day = date.getDate();
                          const month = date.toLocaleString('default', { month: 'short' });
                          return (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/50 transition-all group">
                                  <div className="h-12 w-12 rounded-lg bg-slate-100 group-hover:bg-brand-100 flex flex-col items-center justify-center text-slate-500 group-hover:text-brand-600 transition-colors flex-shrink-0">
                                      <span className="text-xs font-bold uppercase leading-none">{month}</span>
                                      <span className="text-lg font-bold leading-none">{day}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="font-bold text-slate-900 text-sm truncate">{item.loan_title}</p>
                                      <p className="text-xs text-slate-500">Due: <span className="font-bold text-slate-700">{formatCurrency(item.installment_amount)}</span></p>
                                  </div>
                                  <button onClick={() => navigate('/my-loans')} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap">Pay</button>
                              </div>
                          )
                      })
                  ) : (
                      <div className="text-center py-8">
                          <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                              <CheckCircle className="h-6 w-6" />
                          </div>
                          <p className="text-sm text-slate-500 font-medium">No upcoming payments!</p>
                          <p className="text-xs text-slate-400">You're all caught up.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Score History Modal */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
              >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                              <History className="h-5 w-5" />
                          </div>
                          <div>
                              <h3 className="font-display font-bold text-lg text-slate-900">Score Audit History</h3>
                              <p className="text-xs text-slate-500">Chronological ledger of credit score updates</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setShowHistoryModal(false)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
                      >
                          ✕
                      </button>
                  </div>

                  {/* Modal Body / Timeline */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6">
                      {data?.score_history && data.score_history.length > 0 ? (
                          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6 py-2">
                              {data.score_history.map((item: any, idx: number) => {
                                  const isPositive = item.delta > 0;
                                  const isCritical = item.delta <= -50;
                                  
                                  let badgeStyle = "bg-slate-50 text-slate-600 border border-slate-100";
                                  if (isPositive) badgeStyle = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                                  else if (isCritical) badgeStyle = "bg-red-50 text-red-700 border border-red-100";
                                  else if (item.delta < 0) badgeStyle = "bg-orange-50 text-orange-700 border border-orange-100";

                                  return (
                                      <div key={idx} className="relative group">
                                          {/* Timeline Node Dot */}
                                          <div className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-125 ${
                                              isPositive ? 'bg-emerald-500' : isCritical ? 'bg-red-500' : item.delta < 0 ? 'bg-orange-500' : 'bg-slate-400'
                                          }`} />

                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                              <div>
                                                  <p className="font-bold text-slate-800 text-sm">{item.event_name}</p>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">
                                                          By: {item.triggered_by}
                                                      </span>
                                                  </div>
                                              </div>
                                              
                                              {/* Score Shift badge */}
                                              <div className="flex items-center gap-2.5 self-start md:self-auto mt-1 md:mt-0">
                                                  <span className="text-xs text-slate-400 font-medium font-mono">
                                                      {item.score_before} → <span className="font-bold text-slate-700">{item.score_after}</span>
                                                  </span>
                                                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${badgeStyle}`}>
                                                      {isPositive ? '+' : ''}{item.delta}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="text-center py-12 text-slate-400">
                              <History className="h-10 w-10 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
                              <p className="text-sm font-medium">No score changes logged yet.</p>
                              <p className="text-xs text-slate-400 mt-1 font-medium">Your current default score is 650 (Medium Risk).</p>
                          </div>
                      )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                          onClick={() => setShowHistoryModal(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                          Close
                      </button>
                  </div>
              </motion.div>
          </div>
      )}
    </DashboardLayout>
  );
}
