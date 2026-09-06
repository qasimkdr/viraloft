import React, { Suspense, lazy, useContext } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthProvider, { AuthContext } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import RouteTheme from './components/RouteTheme';
import { AdSenseLoader } from './components/AdSlot';

const Home = lazy(() => import('./pages/Home'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Services = lazy(() => import('./pages/Services'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Blog = lazy(() => import('./pages/Blog'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const CreateOrder = lazy(() => import('./pages/CreateOrder'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminMonetization = lazy(() => import('./pages/AdminMonetization'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));

const LandingOrDashboard = () => {
  const { user } = useContext(AuthContext);
  return user ? <Navigate to="/dashboard" replace /> : <Home />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div className="route-loading-orb" />
      <div>
        <strong>Loading Viraloft</strong>
        <span>Preparing your workspace…</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <RouteTheme>
      <AdSenseLoader />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingOrDashboard />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/services" element={<PublicOnlyRoute><Services /></PublicOnlyRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/create-order" element={<ProtectedRoute><CreateOrder /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/monetization" element={<ProtectedRoute roles={['admin']}><AdminMonetization /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute roles={['staff', 'admin']}><StaffDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteTheme>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
