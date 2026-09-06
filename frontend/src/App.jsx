import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { AuthContext } from './context/AuthContext.jsx';
import Home from './pages/Home'; import LoginPage from './pages/LoginPage'; import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard'; import OrdersPage from './pages/OrdersPage'; import CreateOrder from './pages/CreateOrder'; import SupportPage from './pages/SupportPage';
import AdminDashboard from './pages/AdminDashboard'; import AdminMonetization from './pages/AdminMonetization'; import StaffDashboard from './pages/StaffDashboard';
import ProtectedRoute from './components/ProtectedRoute'; import VerifyEmail from './pages/VerifyEmail'; import Services from './pages/Services'; import Terms from './pages/Terms.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy'; import About from './pages/About'; import Contact from './pages/Contact'; import Blog from './pages/Blog'; import { AdSenseLoader } from './components/AdSlot';
const LandingOrDashboard=()=>{const{user}=useContext(AuthContext);return user?<Navigate to="/dashboard" replace/>:<Home/>};
const PublicOnlyRoute=({children})=>{const{user}=useContext(AuthContext);return user?<Navigate to="/dashboard" replace/>:children};
export default function App(){return <AuthProvider><BrowserRouter><AdSenseLoader/><Routes>
<Route path="/" element={<LandingOrDashboard/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/verify-email" element={<VerifyEmail/>}/>
<Route path="/terms" element={<Terms/>}/><Route path="/privacy" element={<PrivacyPolicy/>}/><Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/><Route path="/blog" element={<Blog/>}/><Route path="/services" element={<PublicOnlyRoute><Services/></PublicOnlyRoute>}/>
<Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/><Route path="/orders" element={<ProtectedRoute><OrdersPage/></ProtectedRoute>}/><Route path="/create-order" element={<ProtectedRoute><CreateOrder/></ProtectedRoute>}/><Route path="/support" element={<ProtectedRoute><SupportPage/></ProtectedRoute>}/>
<Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard/></ProtectedRoute>}/><Route path="/admin/monetization" element={<ProtectedRoute roles={['admin']}><AdminMonetization/></ProtectedRoute>}/><Route path="/staff" element={<ProtectedRoute roles={['staff','admin']}><StaffDashboard/></ProtectedRoute>}/><Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></BrowserRouter></AuthProvider>}
