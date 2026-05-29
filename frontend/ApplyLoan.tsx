import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { apiCall, auth, formatCurrency } from '../lib/utils';
import { 
  ArrowLeft, ChevronDown, UploadCloud, FileText, CheckCircle, ArrowRight, Check
} from 'lucide-react';

export default function ApplyLoan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    amount: 5000,
    purpose: '',
    term: '',
    parentName: '',
    parentPhone: '',
    parentEmployment: '',
    parentIncome: '',
    termsChecked: false
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  useEffect(() => {
    const user = auth.getUser();
    if (!user) navigate('/login');
    if (user?.role !== 'student') navigate('/dashboard');
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.amount || !formData.purpose || !formData.term) {
        alert('Please fill in all fields (Amount, Purpose, Term)');
        return;
      }
    }
    if (step === 2) {
      if (!formData.parentName || !formData.parentPhone) {
        alert('Please fill in parent details (Name, Phone)');
        return;
      }
    }
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const selectedFiles = Array.from(e.target.files);
          setFiles(selectedFiles);
          
          const base64Files: string[] = [];
          for (const file of selectedFiles) {
              const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                      const result = ev.target?.result as string;
                      if (file.type.startsWith('image/')) {
                          const img = new Image();
                          img.onload = () => {
                              const MAX_WIDTH = 800;
                              const MAX_HEIGHT = 800;
                              let width = img.width;
                              let height = img.height;
                              if (width > height) {
                                  if (width > MAX_WIDTH) {
                                      height *= MAX_WIDTH / width;
                                      width = MAX_WIDTH;
                                  }
                              } else {
                                  if (height > MAX_HEIGHT) {
                                      width *= MAX_HEIGHT / height;
                                      height = MAX_HEIGHT;
                                  }
                              }
                              const canvas = document.createElement('canvas');
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                  ctx.drawImage(img, 0, 0, width, height);
                                  resolve(canvas.toDataURL('image/jpeg', 0.7));
                              } else {
                                  resolve(result);
                              }
                          };
                          img.src = result;
                      } else {
                          resolve(result);
                      }
                  };
                  reader.readAsDataURL(file);
              });
              base64Files.push(base64);
          }
          setUploadedDocs(base64Files);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termsChecked) {
      alert('Please agree to the Terms & Conditions');
      return;
    }
    if (formData.amount <= 0 || formData.amount > 50000) {
      alert('Maximum loan requested amount is ৳50,000');
      return;
    }
    setLoading(true);
    try {
      const user = auth.getUser();
      await apiCall('api/apply_loan.php', 'POST', {
        studentId: user?.id,
        amount: formData.amount,
        purpose: `${formData.purpose} Loan`,
        duration: parseInt(formData.term),
        category: formData.purpose,
        documents: uploadedDocs.length > 0 ? JSON.stringify(uploadedDocs) : null
      });
      setSuccessModal(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  const emi = Math.ceil((formData.amount * 1.05) / (parseInt(formData.term) || 12));

  return (
    <DashboardLayout>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                  <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-slate-100 transition-colors" title="Go Back">
                      <ArrowLeft className="h-6 w-6 text-slate-600" />
                  </button>
                  <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900">Apply for Loan</h1>
                      <p className="text-slate-500 text-sm mt-1">Fill out the form below to apply for an instant loan</p>
                  </div>
              </div>
          </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              
              <div className="mb-10">
                  <div className="flex items-center justify-between relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
                      
                      {[
                        { num: 1, label: 'Loan Details' },
                        { num: 2, label: 'Personal Info' },
                        { num: 3, label: 'Documents' }
                      ].map((item) => (
                          <div key={item.num} className={`step-indicator flex flex-col items-center gap-2 bg-white px-2 ${step === item.num ? 'active' : ''}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors duration-300 ${
                                  step > item.num ? 'bg-emerald-500 text-white' : 
                                  step === item.num ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 
                                  'bg-slate-100 text-slate-400'
                              }`}>
                                  {step > item.num ? <Check className="h-5 w-5" /> : item.num}
                              </div>
                              <span className={`text-xs font-bold ${step > item.num ? 'text-emerald-600' : step === item.num ? 'text-brand-600' : 'text-slate-400'}`}>
                                {item.label}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                  {step === 1 && (
                      <div className="wizard-step fade-in">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="h-8 w-1 bg-brand-600 rounded-full"></div>
                              <h2 className="font-display text-xl font-bold text-slate-900">Loan Details</h2>
                          </div>

                          <div className="mb-8">
                              <label className="block text-sm font-bold text-slate-900 mb-4">Loan Amount</label>
                              <div className="relative mb-6">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                      <span className="text-slate-400 font-bold">৳</span>
                                  </div>
                                  <input type="number" name="amount" value={formData.amount} onChange={handleChange} min="500" max="50000"
                                      className="block w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold text-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                              </div>
                              <div className="px-2">
                                  <input type="range" name="amount" min="500" max="50000" step="500" value={formData.amount} onChange={handleChange}
                                      className="w-full accent-brand-600" />
                                  <div className="flex justify-between mt-2 text-xs font-medium text-slate-400">
                                      <span>৳500</span>
                                      <span>৳25,000</span>
                                      <span>৳50,000</span>
                                  </div>
                              </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6 mb-8">
                              <div>
                                  <label className="block text-sm font-bold text-slate-900 mb-2">Purpose of Loan</label>
                                  <div className="relative">
                                      <select name="purpose" value={formData.purpose} onChange={handleChange}
                                          className="block w-full pl-4 pr-10 py-4 bg-white border border-slate-200 rounded-xl text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none transition-all cursor-pointer">
                                          <option value="" disabled>Select purpose</option>
                                          <option value="Tuition">Tuition Fees</option>
                                          <option value="Equipment">Laptop / Equipment</option>
                                          <option value="Housing">Housing / Rent</option>
                                          <option value="Books">Books & Supplies</option>
                                          <option value="Personal">Personal Emergency</option>
                                      </select>
                                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                          <ChevronDown className="h-5 w-5" />
                                      </div>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-900 mb-2">Repayment Period</label>
                                  <div className="relative">
                                      <select name="term" value={formData.term} onChange={handleChange}
                                          className="block w-full pl-4 pr-10 py-4 bg-white border border-slate-200 rounded-xl text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none transition-all cursor-pointer">
                                          <option value="" disabled>Select period</option>
                                          <option value="3">3 Months</option>
                                          <option value="6">6 Months</option>
                                          <option value="12">12 Months</option>
                                          <option value="24">24 Months</option>
                                      </select>
                                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                          <ChevronDown className="h-5 w-5" />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-brand-50 rounded-xl p-6 border border-brand-100">
                              <div className="flex justify-between items-center">
                                  <div>
                                      <p className="text-sm font-medium text-brand-700">Estimated Monthly Installment</p>
                                      <p className="text-xs text-brand-500 mt-1">Includes 5% interest for students</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-2xl font-bold text-brand-700">{formatCurrency(emi)}</p>
                                      <p className="text-xs text-brand-500">per month</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {step === 2 && (
                      <div className="wizard-step fade-in">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="h-8 w-1 bg-brand-600 rounded-full"></div>
                              <h2 className="font-display text-xl font-bold text-slate-900">Parent/Guardian Info</h2>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-sm font-bold text-slate-900 mb-2">Parent's Name</label>
                                  <input type="text" name="parentName" value={formData.parentName} onChange={handleChange}
                                      className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-900 mb-2">Phone Number</label>
                                  <input type="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange}
                                      className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-900 mb-2">Employment Status</label>
                                  <select name="parentEmployment" value={formData.parentEmployment} onChange={handleChange}
                                      className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none transition-all cursor-pointer">
                                      <option value="" disabled>Select status</option>
                                      <option value="Employed">Employed</option>
                                      <option value="Self-Employed">Self-Employed</option>
                                      <option value="Retired">Retired</option>
                                      <option value="Other">Other</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-900 mb-2">Monthly Income</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                          <span className="text-slate-400 font-bold">৳</span>
                                      </div>
                                      <input type="number" name="parentIncome" value={formData.parentIncome} onChange={handleChange}
                                          className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all" />
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {step === 3 && (
                      <div className="wizard-step fade-in">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="h-8 w-1 bg-brand-600 rounded-full"></div>
                              <h2 className="font-display text-xl font-bold text-slate-900">Documents & Review</h2>
                          </div>

                          <div className="space-y-4 mb-8">
                              <label className="block text-sm font-bold text-slate-900">Upload Documents</label>
                              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-brand-500 hover:bg-brand-50 transition-all cursor-pointer group relative">
                                  <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:bg-white group-hover:text-brand-600 transition-colors">
                                      <UploadCloud className="h-6 w-6" />
                                  </div>
                                  <p className="text-slate-900 font-medium mb-1">Click to upload or drag and drop</p>
                                  <p className="text-slate-500 text-xs">Student ID, National ID, or Academic Transcript (PDF, JPG)</p>
                                  <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              </div>
                              <div className="space-y-2">
                                  {files.map((file, i) => (
                                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                          <FileText className="h-5 w-5 text-brand-600" />
                                          <span className="text-sm font-medium text-slate-700 truncate flex-1">{file.name}</span>
                                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                              <input type="checkbox" name="termsChecked" checked={formData.termsChecked} onChange={handleChange}
                                  className="mt-1 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                              <label className="text-sm text-slate-600">
                                  I agree to the <a href="#" className="text-brand-600 font-bold hover:underline">Terms & Conditions</a> and <a href="#" className="text-brand-600 font-bold hover:underline">Privacy Policy</a>. I certify that the information provided is true and accurate.
                              </label>
                          </div>
                      </div>
                  )}

                  <div className="flex justify-between pt-6 border-t border-slate-100">
                      {step > 1 && (
                          <button type="button" onClick={handleBack} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                              Back
                          </button>
                      )}
                      
                      {step < 3 ? (
                          <button type="button" onClick={handleNext} className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 ml-auto">
                              Next Step <ArrowRight className="h-5 w-5" />
                          </button>
                      ) : (
                          <button type="submit" disabled={loading} className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 ml-auto">
                              {loading ? 'Submitting...' : 'Submit Application'} <Check className="h-5 w-5" />
                          </button>
                      )}
                  </div>
              </form>
          </div>
      </div>

      {successModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                      <Check className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
                  <p className="text-slate-500 mb-8">Your loan application has been received and is under review. We will notify you shortly.</p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                          Go to Dashboard
                      </button>
                      <button onClick={() => navigate('/my-loans')} className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-colors">
                          View Application
                      </button>
                  </div>
              </div>
          </div>
      )}
    </DashboardLayout>
  );
}
