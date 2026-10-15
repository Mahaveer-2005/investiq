import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import AppBackground from './components/AppBackground';
import Navbar        from './components/Navbar';
import ChatBot       from './components/ChatBot';

import Login       from './pages/Login';
import Register    from './pages/Register';
import Dashboard   from './pages/Dashboard';
import Stocks      from './pages/Stocks';
import StockDetail from './pages/StockDetail';
import Portfolio   from './pages/Portfolio';
import IPO         from './pages/IPO';
import RealEstate  from './pages/RealEstate';
import Behavior    from './pages/Behavior';
import AddMoney    from './pages/AddMoney';
import Screener    from './pages/Screener';
import News        from './pages/News';
import Analytics   from './pages/Analytics';
import Alerts      from './pages/Alerts';
import Backtest    from './pages/Backtest';
import Tax from './pages/Tax';
import SIP from './pages/SIP';
import Advisor from './pages/Advisor';
import Intraday from './pages/Intraday';
import Fundamental from './pages/Fundamental';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div style={{ width:44, height:44, border:'4px solid rgba(99,102,241,0.3)', borderTop:'4px solid #6366f1', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppContent() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight:'100vh', position:'relative' }}>
      <AppBackground />
      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', paddingBottom:40 }}>
        {user && <Navbar />}
        <Routes>
          <Route path="/login"          element={<PublicRoute><Login      /></PublicRoute>} />
          <Route path="/register"       element={<PublicRoute><Register   /></PublicRoute>} />
          <Route path="/dashboard"      element={<PrivateRoute><Dashboard   /></PrivateRoute>} />
          <Route path="/stocks"         element={<PrivateRoute><Stocks      /></PrivateRoute>} />
          <Route path="/stocks/:symbol" element={<PrivateRoute><StockDetail /></PrivateRoute>} />
          <Route path="/portfolio"      element={<PrivateRoute><Portfolio   /></PrivateRoute>} />
          <Route path="/ipo"            element={<PrivateRoute><IPO         /></PrivateRoute>} />
          <Route path="/realestate"     element={<PrivateRoute><RealEstate  /></PrivateRoute>} />
          <Route path="/behavior"       element={<PrivateRoute><Behavior    /></PrivateRoute>} />
          <Route path="/addmoney"       element={<PrivateRoute><AddMoney    /></PrivateRoute>} />
          <Route path="/screener"       element={<PrivateRoute><Screener    /></PrivateRoute>} />
          <Route path="/news"           element={<PrivateRoute><News        /></PrivateRoute>} />
          <Route path="/analytics"      element={<PrivateRoute><Analytics   /></PrivateRoute>} />
          <Route path="/alerts"         element={<PrivateRoute><Alerts      /></PrivateRoute>} />
          <Route path="/backtest"       element={<PrivateRoute><Backtest    /></PrivateRoute>} />
          <Route path="/"               element={<Navigate to="/dashboard" replace />} />
          <Route path="*"               element={<Navigate to="/dashboard" replace />} />
          <Route path="/tax" element={<PrivateRoute><Tax /></PrivateRoute>} />
          <Route path="/sip" element={<PrivateRoute><SIP /></PrivateRoute>} />
          <Route path="/advisor" element={<PrivateRoute><Advisor /></PrivateRoute>} />
          <Route path="/intraday" element={<PrivateRoute><Intraday /></PrivateRoute>} />
<Route path="/fundamental" element={<PrivateRoute><Fundamental /></PrivateRoute>} />
<Route path="/fundamental/:symbol" element={<PrivateRoute><Fundamental /></PrivateRoute>} />
        </Routes>
        {user && <ChatBot />}
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background:'#1a1f35', color:'#e2e8f0', border:'1px solid rgba(99,102,241,0.3)', backdropFilter:'blur(10px)' },
          success: { iconTheme: { primary:'#10b981', secondary:'#fff' } },
          error:   { iconTheme: { primary:'#ef4444', secondary:'#fff' } },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
       <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}