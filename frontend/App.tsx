import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import DonorDashboard from './pages/DonorDashboard';
import RecoveryDashboard from './pages/RecoveryDashboard';
import ApplyLoan from './pages/ApplyLoan';
import CreateCampaign from './pages/CreateCampaign';
import CampaignMarketplace from './pages/CampaignMarketplace';
import Profile from './pages/Profile';
import History from './pages/History';
import MyLoans from './pages/MyLoans';
import MyCampaigns from './pages/MyCampaigns';
import AdminUsers from './pages/AdminUsers';
import FraudCenter from './pages/FraudCenter';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/donor-dashboard" element={<DonorDashboard />} />
        <Route path="/recovery-dashboard" element={<RecoveryDashboard />} />
        <Route path="/apply-loan" element={<ApplyLoan />} />
        <Route path="/create-campaign" element={<CreateCampaign />} />
        <Route path="/campaign-marketplace" element={<CampaignMarketplace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
        <Route path="/my-loans" element={<MyLoans />} />
        <Route path="/my-campaigns" element={<MyCampaigns />} />
        <Route path="/admin-users" element={<AdminUsers />} />
        <Route path="/fraud-center" element={<FraudCenter />} />
      </Routes>
    </Router>
  );
}

export default App;
