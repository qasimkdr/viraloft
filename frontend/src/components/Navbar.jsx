import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const publicLinks = [{to:'/',label:'Home'},{to:'/services',label:'Services'},{to:'/blog',label:'Resources'},{to:'/about',label:'About'}];
  const memberLinks = [{to:'/dashboard',label:'Dashboard'},{to:'/orders',label:'Orders'},{to:'/create-order',label:'New Order'},{to:'/support',label:'Support'}];
  const roleLinks = [...(user?.role==='admin'?[{to:'/admin',label:'Admin'}]:[]),...(user?.role==='staff'?[{to:'/staff',label:'Staff'}]:[])];
  const links = user ? [...roleLinks,...memberLinks] : publicLinks;
  const NavLink=({to,label})=><Link to={to} className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${location.pathname===to?'bg-white/15 text-white':'text-slate-300 hover:text-white hover:bg-white/10'}`}>{label}</Link>;

  return <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#070b16]/80 backdrop-blur-xl"><div className="max-w-7xl mx-auto px-4"><div className="h-16 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 text-white"><img src="/LogoIcon.png" alt="Viraloft" className="h-8 w-8 object-contain"/><span className="font-bold text-lg tracking-tight">Viraloft</span></Link><div className="hidden md:flex items-center gap-1">{links.map(l=><NavLink key={l.to}{...l}/>)}</div><div className="hidden md:flex items-center gap-2">{user?<button onClick={logout} className="h-10 px-4 rounded-xl border border-white/15 text-white hover:bg-white/10">Logout</button>:<><Link to="/login" className="h-10 px-4 inline-flex items-center text-slate-200 font-semibold">Login</Link><Link to="/register" className="h-10 px-5 inline-flex items-center rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/20">Get started</Link></>}</div><button onClick={()=>setOpen(v=>!v)} aria-label="Toggle menu" aria-expanded={open} className="md:hidden h-10 w-10 rounded-xl border border-white/15 text-white">{open?'×':'☰'}</button></div></div>{open&&<div className="md:hidden border-t border-white/10 bg-[#080d19] px-4 py-4"><div className="flex flex-col gap-1">{links.map(l=><NavLink key={l.to}{...l}/>)}{!user&&<><NavLink to="/contact" label="Contact"/><NavLink to="/privacy" label="Privacy"/><NavLink to="/terms" label="Terms"/><NavLink to="/login" label="Login"/><NavLink to="/register" label="Register"/></>}{user&&<button onClick={logout} className="text-left px-3 py-2 text-slate-300">Logout</button>}</div></div>}</nav>;
}
