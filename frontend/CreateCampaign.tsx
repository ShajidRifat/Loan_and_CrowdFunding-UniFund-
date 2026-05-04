import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { 
    ArrowLeft, Image as ImageIcon, Info, ClipboardCheck
} from 'lucide-react';

export default function CreateCampaign() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: '1',
        tagline: '',
        goal: '',
        deadline: '',
        description: ''
    });

    const categoryText: Record<string, string> = {
        '1': 'Education', '2': 'Medical', '3': 'Emergency', '4': 'Project'
    };

    useEffect(() => {
        const user = auth.getUser();
        if (!user) navigate('/login');
        if (user?.role !== 'student') navigate('/dashboard');

        if (editId) {
            // Load campaign for editing
            const loadEditData = async () => {
                try {
                    const campaigns = await apiCall(`api/get_my_campaigns.php?user_id=${user?.id}`);
                    const camp = campaigns.find((c: any) => c.id == editId);
                    if (camp) {
                        setFormData({
                            title: camp.title,
                            category: camp.category_id || camp.category,
                            tagline: camp.tagline || '',
                            goal: camp.goal_amount,
                            deadline: camp.end_date,
                            description: camp.description
                        });
                        if (camp.image_url) {
                            setCoverImage(camp.image_url);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load edit mode');
                }
            };
            loadEditData();
        }
    }, [navigate, editId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setCoverImage(ev.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleNext = () => {
        if (step === 1 && (!formData.title || !formData.category)) {
            alert('Please fill in required fields');
            return;
        }
        if (step === 2) {
            if (!formData.goal || !formData.deadline) {
                alert('Please set a goal and deadline');
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (new Date(formData.deadline) < today) {
                alert('Deadline cannot be in the past');
                return;
            }
        }
        setStep(s => Math.min(s + 1, 3));
    };

    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = auth.getUser();
            const payload = {
                studentId: user?.id,
                title: formData.title,
                goal_amount: parseFloat(formData.goal),
                end_date: formData.deadline,
                category_id: formData.category,
                description: formData.description,
                tagline: formData.tagline,
                cover_image: coverImage
            };
            
            if (editId) {
                alert('Edit functionality not yet linked to API directly here, check implementation plan');
            } else {
                await apiCall('api/create_campaign.php', 'POST', payload);
                setSuccessModal(true);
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to create campaign');
        } finally {
            setLoading(false);
        }
    };

    const daysLeft = formData.deadline ? Math.max(0, Math.ceil((new Date(formData.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 30;

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4">
                <div className="max-w-6xl mx-auto fade-in">
                    <div className="mb-8 flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <ArrowLeft className="h-6 w-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{editId ? 'Edit Campaign' : 'Start a Campaign'}</h1>
                            <p className="text-slate-500">Raise funds from the community for your goals.</p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-7">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 p-4">
                                    <div className="flex items-center justify-between max-w-xs mx-auto">
                                        {[
                                            {num: 1, label: 'Basics'},
                                            {num: 2, label: 'Funding'},
                                            {num: 3, label: 'Story'},
                                        ].map((item, idx) => (
                                            <div key={item.num} className="contents">
                                                <div className={`step-indicator flex flex-col items-center gap-2 ${step === item.num ? 'active' : ''}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                                        step >= item.num ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-100 text-slate-400'
                                                    }`}>{item.num}</div>
                                                    <span className={`text-xs font-bold ${step >= item.num ? 'text-brand-600' : 'text-slate-400'}`}>{item.label}</span>
                                                </div>
                                                {idx < 2 && (
                                                    <div className="h-1 flex-1 bg-slate-200 mx-2 rounded-full overflow-hidden">
                                                        <div className="h-full bg-brand-600 transition-all duration-500" style={{width: step > item.num ? '100%' : '0%'}}></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 md:p-8">
                                    {step === 1 && (
                                        <div className="space-y-6 fade-in">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Campaign Title</label>
                                                <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Help me attend the AI Conference"
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                                                <select name="category" value={formData.category} onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all cursor-pointer">
                                                    <option value="1">Education</option>
                                                    <option value="2">Medical</option>
                                                    <option value="3">Emergency</option>
                                                    <option value="4">Project</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Short Tagline</label>
                                                <input type="text" name="tagline" value={formData.tagline} onChange={handleChange} maxLength={60} placeholder="A short summary (max 60 chars)"
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-6 fade-in">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Funding Goal</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold">৳</span>
                                                    <input type="number" name="goal" value={formData.goal} onChange={handleChange} required min="500" placeholder="5000"
                                                        className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Deadline</label>
                                                <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-6 fade-in">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Cover Image</label>
                                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-brand-400 transition-all cursor-pointer group relative">
                                                    <input type="file" onChange={handleFileChange} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    {coverImage ? (
                                                        <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden">
                                                            <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium opacity-0 hover:opacity-100 transition-opacity">Change Image</div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                                                <ImageIcon className="h-6 w-6" />
                                                            </div>
                                                            <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                                                            <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Detailed Story</label>
                                                <textarea name="description" value={formData.description} onChange={handleChange} required rows={6} placeholder="Tell your story. Why is this important to you? How will the funds be used?"
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"></textarea>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-8 mt-6 border-t border-slate-100">
                                        {step > 1 && (
                                            <button type="button" onClick={handleBack} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                                Back
                                            </button>
                                        )}
                                        <div className="flex gap-3 ml-auto">
                                            <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-2.5 text-slate-500 font-bold hover:text-slate-700 transition-colors flex items-center">Cancel</button>
                                            {step < 3 ? (
                                                <button type="button" onClick={handleNext} className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/30">
                                                    Next Step
                                                </button>
                                            ) : (
                                                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/30">
                                                    {loading ? 'Submitting...' : (editId ? 'Save Changes' : 'Launch Campaign')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <div className="sticky top-8">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Live Preview</h3>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden transform transition-all hover:scale-[1.02]">
                                    <div className="h-48 bg-slate-100 relative overflow-hidden group">
                                        <img src={coverImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}
                                            alt="Campaign Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute top-4 right-4">
                                            <span className="px-3 py-1 rounded-full bg-white/90 text-xs font-bold text-brand-600 uppercase tracking-wider shadow-sm backdrop-blur-sm">
                                                {categoryText[formData.category] || 'Education'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">U</div>
                                            <span className="text-xs font-medium text-slate-500">by <span className="text-slate-900">You</span></span>
                                        </div>
                                        <h3 className="font-display font-bold text-xl text-slate-900 mb-2 leading-tight">{formData.title || 'Your Campaign Title'}</h3>
                                        <p className="text-slate-500 text-sm mb-6 line-clamp-2">{formData.tagline || 'Your short tagline will appear here...'}</p>
                                        <div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                                                <div className="bg-brand-600 h-2 rounded-full w-[0%]"></div>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold mb-6">
                                                <span className="text-brand-600">৳0</span>
                                                <span className="text-slate-400">of <span>{formatCurrency(formData.goal || 0)}</span></span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                                                <div>
                                                    <div className="text-xs text-slate-400 font-medium uppercase">Backers</div>
                                                    <div className="font-bold text-slate-900">0</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400 font-medium uppercase">Days Left</div>
                                                    <div className="font-bold text-slate-900">{daysLeft}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    <p className="text-sm text-blue-700">
                                        <strong>Tip:</strong> Campaigns with a personal video or high-quality cover image raise <strong>2x more funds</strong> on average.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {successModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <ClipboardCheck className="h-10 w-10 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Submitted for Review!</h2>
                        <p className="text-slate-500 mb-8">Your campaign <strong>{formData.title}</strong> has been submitted. An admin will review it shortly. Once approved, it will be visible to donors.</p>
                        <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
