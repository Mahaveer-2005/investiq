import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StocksPage from './pages/StocksPage';
import StockDetailPage from './pages/StockDetailPage';
import IPOPage from './pages/IPOPage';
import PortfolioPage from './pages/PortfolioPage';
import FuturesPage from './pages/FuturesPage';
import RealEstatePage from './pages/RealEstatePage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import TradingPage from './pages/TradingPage';
import LearnPage from './pages/LearnPage';
import Layout from './components/common/Layout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#0f0e17',color:'white',fontSize:'1.5rem'}}>⚡ Loading InvestIQ...</div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1e1b2e', color: '#fff', border: '1px solid #7c3aed' } }} />
          <Routes>
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="stocks" element={<StocksPage />} />
              <Route path="stocks/:symbol" element={<StockDetailPage />} />
              <Route path="ipo" element={<IPOPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="futures" element={<FuturesPage />} />
              <Route path="real-estate" element={<RealEstatePage />} />
              <Route path="real-estate/:id" element={<PropertyDetailPage />} />
              <Route path="trade/:symbol" element={<TradingPage />} />
              <Route path="learn" element={<LearnPage />} />
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
