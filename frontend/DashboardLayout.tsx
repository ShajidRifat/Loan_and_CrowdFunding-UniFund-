import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../../lib/utils';
import type { User } from '../../lib/utils';
import { 
  Layers, LogOut, Bell, ChevronDown, User as UserIcon, Settings, Heart, LayoutDashboard, Search, FileClock, PlusCircle, Banknote, Megaphone, Users, AlertTriangle
} from 'lucide-react';

interface Props {
  children: ReactNode;
}

const icons: Record<string, any> = {
  'layout-dashboard': LayoutDashboard,
  'user': UserIcon,
  'file-clock': FileClock,
  'search': Search,
  'plus-circle': PlusCircle,
  'banknote': Banknote,
  'megaphone': Megaphone,
  'heart': Heart,
  'users': Users,
  'alert-triangle': AlertTriangle
};

export default function DashboardLayout({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.getUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.restricted && currentUser.role === 'student') {
      const allowedPages = ['/my-loans', '/history', '/login', '/profile'];
      if (!allowedPages.includes(location.pathname)) {
        navigate('/my-loans');
        return;
      }
    }

    setUser(currentUser);
  }, [navigate, location.pathname]);

  if (!user) return null;

  let links = [];
  if (user.role === 'student') {
    if (user.restricted) {
      links = [
        { icon: 'alert-triangle', text: 'Active Loan Restriction', href: '/my-loans' },
        { icon: 'banknote', text: 'My Loans (Pay Here)', href: '/my-loans' },
        { icon: 'user', text: 'My Profile', href: '/profile' },
        { icon: 'file-clock', text: 'Payment History', href: '/history' },
      ];
    } else {
      links = [
        { icon: 'layout-dashboard', text: 'Dashboard', href: '/dashboard' },
        { icon: 'user', text: 'My Profile', href: '/profile' },
        { icon: 'file-clock', text: 'Payment History', href: '/history' },
        { icon: 'search', text: 'Browse Campaigns', href: '/campaign-marketplace' },
        { icon: 'plus-circle', text: 'Apply for Loan', href: '/apply-loan' },
        { icon: 'banknote', text: 'My Loans', href: '/my-loans' },
        { icon: 'megaphone', text: 'Create Campaign', href: '/create-campaign' },
        { icon: 'heart', text: 'My Campaigns', href: '/my-campaigns' },
      ];
    }
  } else if (user.role === 'donor') {
    links = [
      { icon: 'layout-dashboard', text: 'Impact Dashboard', href: '/donor-dashboard' },
      { icon: 'user', text: 'My Profile', href: '/profile' },
      { icon: 'search', text: 'Browse Campaigns', href: '/campaign-marketplace' },
      { icon: 'file-clock', text: 'Payment History', href: '/history' },
    ];
  } else if (user.role === 'admin') {
    links = [
      { icon: 'layout-dashboard', text: 'Overview', href: '/admin-dashboard' },
      { icon: 'users', text: 'Users', href: '/admin-users' },
      { icon: 'search', text: 'Browse Campaigns', href: '/campaign-marketplace' },
      { icon: 'alert-triangle', text: 'Fraud Center', href: '/fraud-center' },
      { icon: 'file-clock', text: 'Payment History', href: '/history' },
    ];
  } else {
    links = [
      { icon: 'layout-dashboard', text: 'Dashboard', href: '/dashboard' },
      { icon: 'user', text: 'My Profile', href: '/profile' },
      { icon: 'file-clock', text: 'Payment History', href: '/history' },
    ];
  }

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
        <aside className="w-64 fixed inset-y-0 left-0 z-50 transition-transform duration-300 transform -translate-x-full md:translate-x-0 bg-white border-r border-slate-200" id="sidebar-container">
            <div className="h-full flex flex-col bg-white border-r border-slate-200">
                <div className="p-6 flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 min-w-[2rem] bg-brand-600 rounded-lg flex items-center justify-center">
                        <Layers className="text-white h-5 w-5" />
                    </div>
                    <span className="logo-text font-display font-bold text-lg text-slate-900 leading-tight whitespace-nowrap">Loan &<br/>CrowdFunding</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                    {links.map((link, idx) => {
                        const Icon = icons[link.icon] || LayoutDashboard;
                        const isActive = location.pathname.includes(link.href);
                        return (
                            <Link key={idx} to={link.href} className={`flex items-center gap-3 px-4 py-3 text-slate-600 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all group ${isActive ? 'bg-brand-50 text-brand-600 font-semibold' : ''}`}>
                                <Icon className="h-5 w-5 min-w-[1.25rem] group-hover:scale-110 transition-transform" />
                                <span className="sidebar-text whitespace-nowrap">{link.text}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden" title="View Profile">
                        <img src={user.avatar} className="h-10 w-10 min-w-[2.5rem] rounded-full border border-slate-200 bg-white" alt="User" />
                        <div className="flex-1 min-w-0 sidebar-text">
                            <div className="font-bold text-sm text-slate-900 truncate">{user.name}</div>
                            <div className="text-xs text-slate-500 truncate">{user.role}</div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 sidebar-text" />
                    </div>
                    <button onClick={handleLogout} className="mt-2 w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium overflow-hidden">
                        <LogOut className="h-4 w-4 min-w-[1rem]" /> <span className="sidebar-text">Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>

        <main className="flex-1 ml-0 md:ml-64 flex flex-col h-screen overflow-y-auto relative" onClick={() => { setShowNotifications(false); setShowProfile(false); }}>
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-slate-900 capitalize">{location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}</h1>
                        <p className="text-slate-500 text-sm mt-1">Welcome back, <span>{user.name.split(' ')[0]}</span>!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowProfile(false); }} className="relative p-2 text-slate-400 hover:text-brand-600 transition-colors">
                                <Bell className="h-6 w-6" />
                                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-900">Notifications</h3>
                                        <button className="text-xs text-brand-600 font-medium hover:underline">Mark all read</button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        <div className="p-3 bg-slate-50 text-center">
                                            <span className="text-xs text-slate-500">No new notifications</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); setShowNotifications(false); }} className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold shadow-lg shadow-brand-500/20 hover:ring-4 hover:ring-brand-100 transition-all overflow-hidden">
                                {user.avatar ? <img src={user.avatar} className="h-10 w-10 object-cover" alt="User" /> : <span>{user.name.charAt(0)}</span>}
                            </button>
                            {showProfile && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="p-4 border-b border-slate-50">
                                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    <div className="py-2">
                                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors">
                                            <UserIcon className="h-4 w-4" /> My Profile
                                        </Link>
                                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors">
                                            <Settings className="h-4 w-4" /> Settings
                                        </Link>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                            <LogOut className="h-4 w-4" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <AnimatePresence mode="wait">
                <motion.div 
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="p-8 max-w-7xl mx-auto w-full space-y-8"
                >
                  {children}
                </motion.div>
            </AnimatePresence>
        </main>
    </div>
  );
}
