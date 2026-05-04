import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { ArrowLeft, Megaphone, Users, X } from 'lucide-react';

export default function MyCampaigns() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);

    useEffect(() => {
        const u = auth.getUser();
        if (!u) { navigate('/login'); return; }

        const fetchCampaigns = async () => {
            try {
                const data = await apiCall(`api/get_my_campaigns.php?user_id=${u.id}`);
                setCampaigns(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, [navigate]);

    const viewDonors = async (campaignId: number) => {
        setModalContent({
            title: 'Campaign Donors',
            content: <div className="text-center py-8"><div className="animate-spin h-8 w-8 border-2 border-brand-600 rounded-full border-b-transparent mx-auto"></div></div>
        });
        try {
            const donors = await apiCall(`api/get_campaign_donors.php?campaign_id=${campaignId}`);
            setModalContent({
                title: 'Campaign Donors',
                content: (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900">Donation History</h3>
                            <span className="text-xs bg-brand-100 text-brand-700 font-bold px-2 py-1 rounded-full">{donors.length} Donors</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                            {donors.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-4">No donations yet.</p>
                            ) : donors.map((d: any, idx: number) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-bold text-brand-600 border border-slate-200 uppercase">
                                            {d.donor_name ? d.donor_name.charAt(0) : 'A'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900">{d.donor_name || 'Anonymous'}</p>
                                            <p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="font-bold text-emerald-600 text-lg">
                                            +{formatCurrency(d.amount)}
                                        </div>
                                    </div>
                                    {d.message && <p className="text-xs text-slate-500 italic ml-14 mt-1">"{d.message}"</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            });
        } catch (err) {
            alert('Failed to load donors');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4">
                <div className="max-w-6xl mx-auto fade-in">
                    <div className="mb-8 flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <ArrowLeft className="h-6 w-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">My Campaigns</h1>
                            <p className="text-slate-500">Track the progress of your active funding requests.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full py-12 text-center text-slate-500">Loading campaigns...</div>
                        ) : campaigns.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="mx-auto h-12 w-12 text-slate-300 mb-3"><Megaphone className="h-full w-full"/></div>
                                <h3 className="text-slate-900 font-medium">No campaigns</h3>
                                <p className="text-slate-500 text-sm">You haven't created any campaigns yet.</p>
                            </div>
                        ) : (
                            campaigns.map((c: any, idx) => {
                                const goal = parseFloat(c.goal_amount);
                                const raised = parseFloat(c.raised_amount);
                                const progress = Math.min((raised / goal) * 100, 100);
                                const isFunded = c.status === 'completed' || c.status === 'funded';
                                const daysLeft = c.days_left > 0 ? c.days_left : 0;

                                let statusClass = 'bg-gray-100 text-gray-700';
                                if (c.status === 'active') statusClass = 'bg-blue-100 text-blue-700';
                                if (c.status === 'completed' || c.status === 'funded') statusClass = 'bg-purple-100 text-purple-700';
                                if (c.status === 'pending' || c.status === 'draft') statusClass = 'bg-orange-100 text-orange-700';

                                const color = ['bg-indigo-600', 'bg-pink-600', 'bg-emerald-600', 'bg-orange-500'][idx % 4];

                                return (
                                    <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col">
                                        <div className={`h-40 relative overflow-hidden ${color} flex items-end p-4`}>
                                            <h3 className="font-display font-bold text-xl text-white leading-tight z-10 relative">{c.title}</h3>
                                            <div className="absolute top-4 right-4 z-10">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusClass} shadow-sm backdrop-blur-md bg-opacity-90`}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 flex-1 flex flex-col">
                                            <p className="text-slate-500 text-sm mb-6 line-clamp-2">{c.description}</p>
                                            
                                            <div className="mt-auto">
                                                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                                                    <div className="bg-brand-600 h-2 rounded-full" style={{width: `${progress}%`}}></div>
                                                </div>
                                                <div className="flex justify-between text-sm font-bold mb-6">
                                                    <span className={isFunded ? 'text-purple-600' : 'text-brand-600'}>{formatCurrency(raised)}</span>
                                                    <span className="text-slate-400">of {formatCurrency(goal)}</span>
                                                </div>

                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <div className="text-xs text-slate-400 font-medium uppercase">Backers</div>
                                                        <div className="font-bold text-slate-900 text-lg">{c.donor_count || 0}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-400 font-medium uppercase">Time Left</div>
                                                        <div className="font-bold text-slate-900 text-lg">{isFunded ? 'Done' : `${daysLeft} Days`}</div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3">
                                                    <button onClick={() => viewDonors(c.campaign_id)} className="flex-1 py-2.5 bg-white border border-brand-600 text-brand-600 font-bold rounded-lg hover:bg-brand-50 transition-colors text-sm flex items-center justify-center gap-1">
                                                        <Users className="h-4 w-4" /> View Donors
                                                    </button>
                                                </div>
                                            </div>
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
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="text-xl font-bold text-slate-900 -mt-1">{modalContent.title}</h3>
                             <button onClick={() => setModalContent(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                        </div>
                        {modalContent.content}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
