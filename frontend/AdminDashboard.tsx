import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency, getRiskColor } from '../lib/utils';
import { 
  ClipboardList, Megaphone, Users, Plus, Eye, X, Check, Lock, Unlock, Trash2, AlertTriangle
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      const user = auth.getUser();
      if (!user) { navigate('/login'); return; }
      if (user.role !== 'admin') { navigate('/dashboard'); return; }

      const result = await apiCall(`api/dashboard/admin.php`);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [navigate]);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
        await apiCall('api/admin_users.php', 'POST', {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            password: 'password'
        });
        alert('User created successfully');
        setAddUserModalOpen(false);
        fetchDashboard();
    } catch (err: any) {
        alert(err.message || 'Failed to create user');
    }
  };

  const handleApproveLoan = async (id: string | number) => {
    try {
        await apiCall('api/update_status.php', 'POST', { type: 'loan', id, status: 'approved' });
        fetchDashboard();
    } catch (e) {
        console.error(e);
        alert('Failed to approve loan');
    }
  };

  const handleRejectLoan = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to reject this loan?')) return;
    try {
        await apiCall('api/update_status.php', 'POST', { type: 'loan', id, status: 'rejected' });
        fetchDashboard();
    } catch (e) {
        console.error(e);
        alert('Failed to reject loan');
    }
  };

  const handleApproveCampaign = async (id: string | number) => {
    try {
        await apiCall('api/update_status.php', 'POST', { type: 'campaign', id, status: 'active' });
        fetchDashboard();
    } catch (e) {
        console.error(e);
        alert('Failed to approve campaign');
    }
  };

  const performCampaignRejection = async (id: string | number) => {
    setModalContent(null);
    try {
        await apiCall('api/update_status.php', 'POST', { type: 'campaign', id, status: 'rejected' });
        fetchDashboard();
    } catch (e: any) {
        console.error('Rejection Failed:', e);
        alert('Failed to update campaign: ' + e.message);
    }
  };

  const handleRejectCampaign = async (id: string | number) => {
    setModalContent({
        title: 'Confirm Rejection',
        content: (
            <div className="text-center p-4">
                <div className="bg-red-100 text-red-600 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Campaign?</h3>
                <p className="text-slate-500 mb-6">Are you sure you want to reject/stop this campaign? This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => setModalContent(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">Cancel</button>
                    <button onClick={() => performCampaignRejection(id)} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-500/30">Confirm Reject</button>
                </div>
            </div>
        )
    });
  };

  const toggleUserBlock = async (id: string | number, currentStatus: string) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    try {
        await apiCall('api/admin_users.php', 'PUT', { id, status: newStatus });
        fetchDashboard();
    } catch (e) {
        console.error(e);
        alert('Failed to update user status');
    }
  };

  const deleteUser = async (id: string | number) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
        await apiCall(`api/admin_users.php?id=${id}`, 'DELETE');
        fetchDashboard();
    } catch (e) {
        console.error(e);
        alert('Failed to delete user');
    }
  };

  const viewLoanDetails = (id: string | number) => {
      const loan = data?.loans?.find((l: any) => l.loan_id == id);
      if (!loan) return;
      setModalContent({
          title: 'Loan Details',
          content: (
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Applicant</div>
                          <div className="font-bold text-slate-900">{loan.student_name}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Risk Tier</div>
                          <div className={`font-bold border px-2 py-0.5 rounded-md inline-block ${getRiskColor(loan.risk_tier)}`}>{loan.risk_tier || 'N/A'}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Principal Amount</div>
                          <div className="font-bold text-slate-900">{formatCurrency(loan.principal_amount)}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Interest Rate / Tenure</div>
                          <div className="font-bold text-slate-900">{loan.interest_rate}% / {loan.tenure_months} months</div>
                      </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                      <div className="text-xs text-slate-500 mb-2">Application Reason / Description</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{loan.loan_reason || loan.description || 'No detailed description provided.'}</p>
                  </div>
              </div>
          )
      });
  };

  const viewCampaignDetails = (id: string | number) => {
      const camp = data?.campaigns?.find((c: any) => c.campaign_id == id);
      if (!camp) return;
      setModalContent({
          title: 'Campaign Details',
          content: (
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Creator</div>
                          <div className="font-bold text-slate-900">{camp.student_name || 'Student'}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Status</div>
                          <div className="font-bold text-slate-900 uppercase text-sm">{camp.status}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Funding Goal</div>
                          <div className="font-bold text-slate-900">{formatCurrency(camp.goal_amount)}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Deadline Date</div>
                          <div className="font-bold text-slate-900">{camp.end_date}</div>
                      </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                      <div className="text-xs text-slate-500 mb-2">Campaign Story</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{camp.description || 'No detailed description provided.'}</p>
                  </div>
              </div>
          )
      });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingLoans = data?.loans?.filter((l: any) => l.status === 'pending') || [];
  const campaigns = data?.campaigns || [];
  const users = data?.users || [];

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
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto"
      >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-slate-500 text-sm font-medium mb-1">Pending Review</div>
                  <div className="text-3xl font-bold text-yellow-600">{data?.stats?.pending_reviews || 0}</div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-slate-500 text-sm font-medium mb-1">Total Volume</div>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(data?.stats?.total_volume || 0)}</div>
              </motion.div>
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-slate-500 text-sm font-medium mb-1">Active Users</div>
                  <div className="text-3xl font-bold text-brand-600">{data?.stats?.active_users || 0}</div>
              </motion.div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-600" /> Pending Approvals
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {pendingLoans.length > 0 ? pendingLoans.map((loan: any, idx: number) => (
                  <motion.div variants={itemVariants} whileHover={{ y: -4 }} key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="font-bold text-slate-900">{loan.loan_title || loan.title}</h3>
                              <p className="text-xs text-slate-500">by {loan.student_name || 'Unknown'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${getRiskColor(loan.risk_tier || 'High')}`}>{loan.risk_tier || 'N/A'} Risk</span>
                      </div>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2 flex-grow">{loan.loan_reason || loan.description || 'No description'}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                          <div className="font-bold text-slate-900">{formatCurrency(loan.principal_amount)}</div>
                          <div className="flex gap-2">
                              <button onClick={() => viewLoanDetails(loan.loan_id)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View Details"><Eye className="h-4 w-4" /></button>
                              <button onClick={() => handleRejectLoan(loan.loan_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><X className="h-4 w-4" /></button>
                              <button onClick={() => handleApproveLoan(loan.loan_id)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><Check className="h-3 w-3" /> Approve</button>
                          </div>
                      </div>
                  </motion.div>
              )) : (
                  <div className="col-span-full text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">No pending loans.</p>
                  </div>
              )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand-600" /> Campaign Approvals
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {campaigns.length > 0 ? campaigns.map((camp: any, idx: number) => (
                  <motion.div variants={itemVariants} whileHover={{ y: -4 }} key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full relative">
                        <span className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded ${camp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} uppercase`}>{camp.status}</span>
                        <h3 className="font-bold text-slate-900 mb-1 pr-16">{camp.title}</h3>
                        <p className="text-xs text-slate-500 mb-4">Goal: {formatCurrency(camp.goal_amount)}</p>
                        <div className="flex items-center justify-end gap-2 mt-auto">
                            <button onClick={() => viewCampaignDetails(camp.campaign_id)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View Details"><Eye className="h-4 w-4" /></button>
                            {(camp.status === 'draft' || camp.status === 'active') && <button onClick={() => handleRejectCampaign(camp.campaign_id)} className="text-xs font-bold text-red-600 hover:text-red-700">Reject/Stop</button>}
                            {camp.status === 'draft' && <button onClick={() => handleApproveCampaign(camp.campaign_id)} className="text-xs font-bold text-brand-600 hover:text-brand-700">Approve</button>}
                        </div>
                  </motion.div>
              )) : (
                  <div className="col-span-full text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">No campaigns found.</p>
                  </div>
              )}
          </div>

          <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-600" /> User Management
              </h2>
              <button onClick={() => setAddUserModalOpen(true)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add User
              </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4 font-semibold text-slate-900">User</th>
                          <th className="px-6 py-4 font-semibold text-slate-900">Role</th>
                          <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                          <th className="px-6 py-4 font-semibold text-slate-900 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {users.map((u: any, idx: number) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={u.avatar_url || 'https://via.placeholder.com/40'} className="h-10 w-10 rounded-full border border-slate-200" alt="Avatar"/>
                                        <div>
                                            <div className="font-bold text-slate-900">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 uppercase text-xs font-bold text-slate-500">{u.role}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.status === 'banned' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {u.status || 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                         {u.role !== 'admin' && (
                                             <>
                                                <button onClick={() => toggleUserBlock(u.id, u.status)} className={`p-2 ${u.status === 'banned' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'} rounded-lg transition-colors`} title={u.status === 'banned' ? 'Unblock' : 'Block'}>
                                                    {u.status === 'banned' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                                </button>
                                                <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                             </>
                                         )}
                                     </div>
                                </td>
                            </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
      {isAddUserModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Add New User</h3>
                  <form onSubmit={handleAddUser}>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                              <input type="text" name="name" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                              <input type="email" name="email" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                              <select name="role" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500">
                                  <option value="student">Student</option>
                                  <option value="admin">Admin</option>
                                  <option value="analyst">Fraud Analyst</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setAddUserModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                          <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30">Create User</button>
                      </div>
                  </form>
              </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {modalContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">{modalContent.title}</h3>
                      <button onClick={() => setModalContent(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="h-6 w-6" />
                      </button>
                  </div>
                  {modalContent.content}
              </motion.div>
          </motion.div>
      )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
