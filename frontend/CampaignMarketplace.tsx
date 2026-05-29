import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { 
    ArrowLeft, Star, Users, Heart, ClipboardCheck, X
} from 'lucide-react';

export default function CampaignMarketplace() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [modalContent, setModalContent] = useState<{title: string, content: React.ReactNode} | null>(null);

    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        const u = auth.getUser();
        if (!u) { navigate('/login'); return; }
        setUser(u);

        const fetchCampaigns = async () => {
            try {
                const data = await apiCall('api/get_marketplace_campaigns.php');
                setCampaigns(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, [navigate]);

    const openRatingModal = (campId: string | number, title: string) => {
        setModalContent({
            title: 'Rate this Campaign',
            content: <RatingForm campId={campId} campaignTitle={title} onClose={() => setModalContent(null)} onSuccess={() => {
                setModalContent(null);
            }} userId={user.id} />
        });
    };

    const openDonationModal = (campId: string | number) => {
        setModalContent({
            title: 'Support Campaign',
            content: <DonationForm campId={campId} onClose={() => setModalContent(null)} userId={user.id} />
        });
    };

    const openDonorModal = async (campId: string | number, title: string) => {
        setModalContent({
            title: 'Campaign Donors',
            content: (
                <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-brand-600 rounded-full border-b-transparent"></div>
                </div>
            )
        });

        try {
            const donors = await apiCall(`api/get_campaign_donors.php?campaign_id=${campId}`);
            setModalContent({
                title: 'Campaign Donors',
                content: (
                    <div>
                        <div className="mb-4 text-center">
                            <h3 className="text-sm text-slate-500">Supporters of</h3>
                            <p className="font-bold text-slate-900">{title}</p>
                        </div>
                        {!donors || donors.length === 0 ? (
                            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500 text-sm">No donors yet. Be the first!</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {donors.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs uppercase">
                                                {d.donor_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{d.donor_name}</p>
                                                <p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-emerald-600 text-sm">+{formatCurrency(d.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-6">
                            <button onClick={() => setModalContent(null)} className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors">Close</button>
                        </div>
                    </div>
                )
            });
        } catch (err) {
            setModalContent({ title: 'Error', content: <p className="text-red-500 text-center py-4">Failed to load donors</p> });
        }
    };

    const filters = ['All', 'Emergency', 'Project', 'Education', 'Medical'];
    const filteredCampaigns = campaigns.filter(c => activeFilter === 'All' || c.category === activeFilter || c.category_id === activeFilter);

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4">
                <div className="mb-8 flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Campaign Marketplace</h1>
                        <p className="text-slate-500 text-sm">Discover and support great initiatives.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                    {filters.map(f => (
                        <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === f ? 'bg-brand-600 text-white shadow-md shadow-brand-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                            {f === 'All' ? 'All Campaigns' : f}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                        No active campaigns found. Check back later!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
                        {filteredCampaigns.map((camp: any, idx: number) => {
                            const raised = parseFloat(camp.raised_amount || 0);
                            const goal = parseFloat(camp.goal_amount || 1);
                            const percent = Math.min(100, Math.round((raised / goal) * 100));
                            const canDonate = user && ['donor', 'student', 'admin'].includes(user.role);
                            const studentName = camp.student_name || 'User';

                            return (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full group hover:shadow-md transition-shadow">
                                    <div className="h-40 bg-slate-100 relative">
                                        {camp.image_url ? (
                                            <img src={camp.image_url} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100"></div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-brand-700 shadow-sm">
                                            {camp.category}
                                        </div>
                                        <div className="absolute -bottom-6 left-6">
                                            <div className="h-12 w-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-sm">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${studentName.replace(' ', '')}`} className="h-full w-full" alt="Avatar"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-8 px-6 pb-6 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">{camp.title}</h4>
                                                <p className="text-xs text-slate-500">{camp.university || 'University'} • {camp.major || 'Major'}</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-50 px-1.5 py-0.5 rounded">
                                                <Star className="h-3 w-3 fill-current" /> {camp.average_rating || camp.rating || 'N/A'}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-grow">{camp.description}</p>
                                        
                                        <div className="mt-auto space-y-3">
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className="bg-brand-500 h-full rounded-full" style={{width: `${percent}%`}}></div>
                                            </div>
                                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                                <span>{formatCurrency(raised)} raised</span>
                                                <span>{percent}%</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 pt-2">
                                                <button onClick={() => openDonorModal(camp.id, camp.title)} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1">
                                                    <Users className="h-3 w-3" /> Donors
                                                </button>
                                                <button onClick={() => openRatingModal(camp.id, camp.title)} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors flex items-center justify-center gap-1">
                                                    <Star className="h-3 w-3" /> Rate
                                                </button>
                                                {canDonate ? (
                                                    <button onClick={() => openDonationModal(camp.id)} className="col-span-2 bg-slate-900 hover:bg-brand-600 text-white text-sm font-bold py-2 rounded-lg transition-colors shadow-lg shadow-slate-200 hover:shadow-brand-200">
                                                        Donate Now
                                                    </button>
                                                ) : (
                                                    <button className="col-span-2 bg-slate-100 text-slate-400 cursor-not-allowed text-sm font-bold py-2 rounded-lg" disabled>
                                                        View Only
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modalContent && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">{modalContent.title}</h3>
                            <button onClick={() => setModalContent(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                        </div>
                        {modalContent.content}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function RatingForm({ campId, campaignTitle, onClose, onSuccess, userId }: any) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submitRating = async () => {
        if (rating === 0) { alert('Please select a star rating.'); return; }
        setSubmitting(true);
        try {
            await apiCall('api/rate_campaign.php', 'POST', {
                campaign_id: campId,
                donor_id: userId,
                rating,
                comment
            });
            alert('Rating submitted!');
            onSuccess();
        } catch (err: any) {
            alert(err.message || 'Failed to submit rating.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="text-center">
            <p className="text-sm text-slate-500 mb-6">How impactful was "{campaignTitle}"?</p>
            <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(val => (
                    <button key={val} type="button" 
                        className={`transition-colors ${(hover || rating) >= val ? 'text-yellow-400' : 'text-slate-300'}`}
                        onMouseEnter={() => setHover(val)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(val)}>
                        <Star className={`h-8 w-8 ${(hover || rating) >= val ? 'fill-current' : ''}`} />
                    </button>
                ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none mb-4"
                placeholder="Write a short review (optional)..." rows={3}></textarea>
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button onClick={submitRating} disabled={submitting} className="flex-1 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 shadow-lg shadow-brand-200">
                    {submitting ? 'Submitting...' : 'Submit'}
                </button>
            </div>
        </div>
    );
}

function DonationForm({ campId, onClose, userId }: any) {
    const [amount, setAmount] = useState(500);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [limits, setLimits] = useState<{ already_donated: number; remaining_goal: number } | null>(null);
    const [loadingLimits, setLoadingLimits] = useState(true);

    useEffect(() => {
        const fetchLimits = async () => {
            try {
                const data = await apiCall(`api/get_user_donation_limit.php?campaign_id=${campId}&user_id=${userId}`);
                setLimits(data);
                
                const maxAllowed = Math.min(50000 - (data.already_donated || 0), data.remaining_goal || 0);
                if (maxAllowed > 0 && maxAllowed < 500) {
                    setAmount(maxAllowed);
                } else if (maxAllowed <= 0) {
                    setAmount(0);
                }
            } catch (err) {
                console.error("Failed to load donation limits", err);
            } finally {
                setLoadingLimits(false);
            }
        };
        fetchLimits();
    }, [campId, userId]);

    const alreadyDonated = limits?.already_donated || 0;
    const remainingGoal = limits?.remaining_goal || 0;
    const maxAllowed = Math.max(0, Math.min(50000 - alreadyDonated, remainingGoal));

    const processDonation = async () => {
        if (!amount || amount <= 0) { alert('Please enter a valid amount'); return; }
        if (amount > maxAllowed) {
            alert(`Maximum allowed donation for this transaction is ৳${maxAllowed.toLocaleString()}`);
            return;
        }
        setStatus('processing');
        try {
            await apiCall('api/donate.php', 'POST', {
                campaign_id: campId,
                donor_id: userId,
                amount: amount,
                message: "Donation via Marketplace",
                is_anonymous: 0
            });
            setStatus('success');
        } catch (err: any) {
            setErrorMsg(err.message || 'Unknown error occurred');
            setStatus('error');
        }
    };

    if (loadingLimits) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-4"></div>
                <p className="text-sm text-slate-500">Checking donation allowance...</p>
            </div>
        );
    }

    if (status === 'processing') return (
        <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-600 mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Donation...</h3>
            <p className="text-slate-500">Thank you for your generosity.</p>
        </div>
    );

    if (status === 'success') return (
        <div className="text-center py-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <ClipboardCheck className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
            <p className="text-slate-500 mb-8">You successfully donated <strong>{formatCurrency(amount)}</strong>.</p>
            <button onClick={() => window.location.reload()} className="px-8 py-3 w-full bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                Done
            </button>
        </div>
    );

    if (status === 'error') return (
        <div className="text-center p-6">
            <div className="text-red-500 mb-4"><span className="h-12 w-12 mx-auto flex items-center justify-center bg-red-100 rounded-full"><X className="h-6 w-6"/></span></div>
            <h3 className="text-lg font-bold mb-2">Transaction Failed</h3>
            <p className="text-slate-500 text-sm mb-4">{errorMsg}</p>
            <button onClick={onClose} className="px-6 w-full py-2 bg-slate-200 rounded-lg font-bold text-slate-700">Close</button>
        </div>
    );

    return (
        <div className="text-center">
            <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
                <Heart className="h-8 w-8" />
            </div>
            <p className="text-slate-600 mb-6">Donate to this Campaign</p>
            <div className="text-left">
                <div className="bg-slate-50 p-4 rounded-xl mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Donation Amount</label>
                        {alreadyDonated > 0 && (
                            <span className="text-[10px] text-slate-400 font-bold">You previously gave ৳{alreadyDonated.toLocaleString()}</span>
                        )}
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold">৳</span>
                        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} min="10" max={maxAllowed} disabled={maxAllowed <= 0} className="w-full pl-8 pr-4 py-3 rounded-lg border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-slate-100 disabled:text-slate-400" />
                    </div>
                    {maxAllowed <= 0 ? (
                        <p className="text-[11px] text-red-500 mt-2 font-bold animate-pulse">
                            You've hit the ৳50,000 limit for this campaign (or it's fully funded).
                        </p>
                    ) : (
                        <p className="text-[11px] text-slate-500 mt-2 font-medium">
                            Max allowed: <span className="font-bold text-slate-700">৳{maxAllowed.toLocaleString()}</span> (৳50,000 cumulative limit per donor/campaign).
                        </p>
                    )}
                </div>
                {maxAllowed > 0 ? (
                    <button onClick={processDonation} className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-500/20">
                        Confirm Donation
                    </button>
                ) : (
                    <button className="w-full py-3 bg-slate-200 text-slate-400 font-bold rounded-xl cursor-not-allowed" disabled>
                        Limit Reached
                    </button>
                )}
            </div>
        </div>
    );
}
