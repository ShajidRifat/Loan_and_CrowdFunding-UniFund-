import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed w-full z-50 transition-all duration-300 bg-white/70 backdrop-blur-lg border-b border-white/20" id="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="h-10 w-10 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Layers className="text-white h-6 w-6" />
            </div>
            <span className="font-display font-bold text-2xl text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors">
              Loan & CrowdFunding
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-brand-600 font-medium transition-colors relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-brand-600 after:left-0 after:-bottom-1 after:transition-all hover:after:w-full">
              Features
            </a>
            <a href="#how-it-works" className="text-slate-600 hover:text-brand-600 font-medium transition-colors relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-brand-600 after:left-0 after:-bottom-1 after:transition-all hover:after:w-full">
              How it Works
            </a>
            <a href="#impact" className="text-slate-600 hover:text-brand-600 font-medium transition-colors relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-brand-600 after:left-0 after:-bottom-1 after:transition-all hover:after:w-full">
              Impact
            </a>
            <Link to="/login" className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:-translate-y-0.5 btn-ripple">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
