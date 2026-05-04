import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth } from '../lib/utils';
import { ArrowLeft, Plus, Eye, Lock, Unlock, Trash2, X } from 'lucide-react';

export default function AdminUsers() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await apiCall('api/admin_users.php');
            setUsers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const u = auth.getUser();
        if (!u || u.role !== 'admin') { navigate('/dashboard'); return; }
        fetchUsers();
    }, [navigate]);

    const viewUser = async (id: number) => {
        try {
            const data = await apiCall(`api/get_profile.php?user_id=${id}`);
            if (data && data.user) {
                const u = data.user;
                const p = data.profile || {};
                
                setModalContent({
                    title: 'User Profile',
                    content: (
                        <div>
                            <div className="flex flex-col items-center mb-6">
                                <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name?.replace(' ', '')}`} className="h-24 w-24 rounded-full border-4 border-slate-50 shadow-sm mb-3" alt="Avatar"/>
                                <h4 className="text-2xl font-bold text-slate-900">{u.full_name}</h4>
                                <p className="text-slate-500">{u.email}</p>
                                <div className="flex gap-2 mt-2">
                                     <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-md">{u.role}</span>
                                     <span className={`px-2 py-1 ${u.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} text-xs font-bold uppercase rounded-md`}>{u.status || 'Active'}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1">Status</div>
                                    <div className="text-xl font-bold text-slate-900 capitalize">{u.status || 'Active'}</div>
                                </div>
                                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1">User ID</div>
                                    <div className="text-xs font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 inline-block overflow-hidden text-ellipsis max-w-full" title={u.id}>{u.id}</div>
                                </div>
                            </div>

                            {u.role === 'student' && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-bold text-slate-900 mb-2">Academic Info</h5>
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">University</span>
                                            <span className="font-medium">{p.university || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Major</span>
                                            <span className="font-medium">{p.major || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                 <button onClick={() => setModalContent(null)} className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">Close</button>
                            </div>
                        </div>
                    )
                });
            }
        } catch (e) {
            alert('Failed to load user details');
        }
    };

    const toggleUserBlock = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
        try {
            await apiCall('api/admin_users.php', 'PUT', { id, status: newStatus });
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Toggle block failed');
        }
    };

    const deleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
        try {
            await apiCall(`api/admin_users.php?id=${id}`, 'DELETE');
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Delete failed');
        }
    };

    const openAddUser = () => {
        setModalContent({
            title: 'Add New User',
            content: <AddUserForm onClose={() => setModalContent(null)} onSuccess={() => { setModalContent(null); fetchUsers(); }} />
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
                                <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                                <p className="text-slate-500">Manage all platform users, roles, and access.</p>
                            </div>
                        </div>
                        <button onClick={openAddUser} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/30">
                            <Plus className="h-4 w-4" /> Add User
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-900">User</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900">Role</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-900 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-slate-500">Loading users...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-slate-500">No users found.</td></tr>
                                ) : (
                                    users.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name?.replace(' ', '')}`} className="h-10 w-10 rounded-full border border-slate-200" alt="Avatar"/>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{u.full_name}</div>
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
                                                <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                                    <button onClick={() => viewUser(u.id)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View Profile">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {u.role !== 'admin' && (
                                                        <>
                                                            <button onClick={() => toggleUserBlock(u.id, u.status)} className={`p-2 rounded-lg transition-colors ${u.status === 'banned' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`} title={u.status === 'banned' ? 'Unblock' : 'Block'}>
                                                                {u.status === 'banned' ? <Unlock className="h-4 w-4"/> : <Lock className="h-4 w-4"/>}
                                                            </button>
                                                            <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalContent && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
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

function AddUserForm({ onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({ name: '', email: '', role: 'student' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiCall('api/admin_users.php', 'POST', {
                ...formData,
                password: 'Password123!'
            });
            onSuccess();
        } catch (err: any) {
            alert(err.message || 'Create failed');
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500">
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                        <option value="donor">Donor</option>
                    </select>
                </div>
            </div>
            <div className="flex gap-3 mt-6">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30">
                    {submitting ? 'Creating...' : 'Create User'}
                </button>
            </div>
        </form>
    );
}
