import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/utils';
import { ArrowLeft, Layers, ArrowRight, GraduationCap, Heart, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'student' | 'donor'>('student');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRedirect = (data: { restricted?: boolean; role: string }) => {
      if (data.restricted) navigate('/recovery-dashboard');
      else if (data.role === 'admin') navigate('/admin-dashboard');
      else if (data.role === 'donor') navigate('/donor-dashboard');
      else navigate('/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      email: { value: string };
      password: { value: string };
    };
    setLoading(true);
    const result = await auth.login(target.email.value, target.password.value);
    setLoading(false);
    if (result.success) {
      handleRedirect({ role: result.role! });
    } else {
      alert(result.message);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      fname: { value: string };
      lname: { value: string };
      email: { value: string };
      password: { value: string };
    };
    if (!target.fname.value || !target.email.value || !target.password.value) {
      alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    const fullName = `${target.fname.value} ${target.lname.value}`;
    const result = await auth.signup(fullName, target.email.value, target.password.value, role);
    setLoading(false);
    if (result.success) {
      handleRedirect({ role: result.role! });
    } else {
      alert(result.message);
    }
  };

  const quickLogin = async (r: 'student' | 'donor' | 'admin') => {
    const emails = { student: 'rahim@uiu.ac.bd', donor: 'fatema@foundation.org', admin: 'admin@unifund.bd' };
    setLoading(true);
    const result = await auth.login(emails[r], 'password');
    setLoading(false);
    if (result.success) handleRedirect({ role: result.role! });
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-4 lg:p-0 overflow-hidden font-sans text-slate-900">
      <div className="w-full h-full flex overflow-hidden bg-white shadow-2xl">
        {/* Left Form Section */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-white relative z-10 overflow-y-auto">
          <div className="mb-12">
            <Link to="/" className="inline-flex items-center gap-2 mb-8 text-slate-400 hover:text-brand-600 transition-colors group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Platform
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/20">
                <Layers className="text-white h-6 w-6" />
              </div>
              <span className="font-display font-bold text-2xl text-slate-900 tracking-tight">Loan & CrowdFunding</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-slate-900 mb-3 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-lg">Please enter your details to access your workspace.</p>
          </div>

          <div className="bg-slate-100 p-1.5 rounded-xl flex mb-8 w-full max-w-sm relative">
            <div className="absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out" style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}></div>
            <button onClick={() => setMode('login')} className={`flex-1 relative z-10 py-2.5 text-sm text-center transition-colors ${mode === 'login' ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>Sign In</button>
            <button onClick={() => setMode('signup')} className={`flex-1 relative z-10 py-2.5 text-sm text-center transition-colors hover:text-slate-700 ${mode === 'signup' ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>Create Account</button>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6 fade-in">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <input type="email" name="email" placeholder="name@company.com" required className="w-full px-4 py-3.5 rounded-xl input-modern outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                    <a href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700">Forgot password?</a>
                  </div>
                  <input type="password" name="password" placeholder="••••••••••••" required className="w-full px-4 py-3.5 rounded-xl input-modern outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2 group">
                Sign In <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-6 fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                  <input type="text" name="fname" placeholder="First Name" required className="w-full px-4 py-3.5 rounded-xl input-modern outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                  <input type="text" name="lname" placeholder="Last Name" required className="w-full px-4 py-3.5 rounded-xl input-modern outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <input type="email" name="email" placeholder="name@company.com" required className="w-full px-4 py-3.5 rounded-xl input-modern outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">I am a...</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="cursor-pointer group relative">
                    <input type="radio" name="role" value="student" className="peer sr-only" checked={role === 'student'} onChange={() => setRole('student')} />
                    <div className="p-4 rounded-xl border-2 border-slate-100 bg-white hover:border-brand-200 peer-checked:border-brand-600 peer-checked:bg-brand-50 transition-all h-full flex flex-col items-center text-center">
                      <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="font-bold text-slate-900 mb-1">Student</div>
                      <div className="text-xs text-slate-500">Apply for loans</div>
                    </div>
                    {role === 'student' && <div className="absolute top-3 right-3 text-brand-600 transition-opacity"><CheckCircle2 className="h-4 w-4 fill-brand-100" /></div>}
                  </label>
                  <label className="cursor-pointer group relative">
                    <input type="radio" name="role" value="donor" className="peer sr-only" checked={role === 'donor'} onChange={() => setRole('donor')} />
                    <div className="p-4 rounded-xl border-2 border-slate-100 bg-white hover:border-brand-200 peer-checked:border-brand-600 peer-checked:bg-brand-50 transition-all h-full flex flex-col items-center text-center">
                      <div className="h-10 w-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Heart className="h-5 w-5" />
                      </div>
                      <div className="font-bold text-slate-900 mb-1">Donor</div>
                      <div className="text-xs text-slate-500">Give support</div>
                    </div>
                    {role === 'donor' && <div className="absolute top-3 right-3 text-brand-600 transition-opacity"><CheckCircle2 className="h-4 w-4 fill-brand-100" /></div>}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <input type="password" name="password" placeholder="Create a strong password" required className="w-full px-4 py-3.5 rounded-xl input-modern outline-none" />
              </div>
              <button disabled={loading} type="submit" className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                Create Account
              </button>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Access (Demo Mode)</p>
            <div className="flex flex-wrap gap-3">
              {(['student', 'donor', 'admin'] as const).map(r => (
                  <button key={r} onClick={() => quickLogin(r)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:border-brand-300 hover:text-brand-600 transition-all capitalize">
                    {r}
                  </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Visual Section */}
        <div className="hidden lg:flex w-[55%] bg-mesh relative items-center justify-center p-16 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 max-w-lg">
                <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl mb-12 transform hover:scale-[1.02] transition-transform duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 p-0.5">
                            <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-white">Enterprise Security</h3>
                            <p className="text-brand-200 text-sm">Bank-grade encryption & verification.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-2 bg-white/10 rounded-full w-full overflow-hidden">
                            <div className="h-full bg-brand-400 w-3/4 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex justify-between text-sm text-brand-100">
                            <span>System Status</span>
                            <span className="text-green-400 font-medium">Operational</span>
                        </div>
                    </div>
                </div>

                <h2 className="font-display text-5xl font-bold leading-tight mb-6">
                    Finance the <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-purple-300">Next Generation.</span>
                </h2>
                <p className="text-lg text-brand-100/80 leading-relaxed mb-8">
                    Join the ecosystem trusted by over 50 universities and 10,000+ students worldwide. Secure, transparent, and community-driven.
                </p>

                <div className="flex items-center gap-6">
                    <div className="flex -space-x-3">
                        <img className="w-10 h-10 rounded-full border-2 border-slate-900" src="https://api.dicebear.com/7.x/avataaars/svg?seed=A" alt="" />
                        <img className="w-10 h-10 rounded-full border-2 border-slate-900" src="https://api.dicebear.com/7.x/avataaars/svg?seed=B" alt="" />
                        <img className="w-10 h-10 rounded-full border-2 border-slate-900" src="https://api.dicebear.com/7.x/avataaars/svg?seed=C" alt="" />
                        <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-white">+2k</div>
                    </div>
                    <div className="h-12 w-px bg-white/20"></div>
                    <div>
                        <div className="font-bold text-2xl text-white">4.9/5</div>
                        <div className="text-xs text-brand-200 uppercase tracking-wider">User Rating</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
