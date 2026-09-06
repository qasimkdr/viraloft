import React from 'react';
import { Link } from 'react-router-dom';
import MonetizationPanel from '../components/admin/MonetizationPanel';

export default function AdminMonetization(){return <div className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between"><div><h1 className="font-semibold text-slate-900">Monetization</h1><p className="text-xs text-slate-500">AdSense, ads.txt and placement controls</p></div><Link to="/admin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">← Admin dashboard</Link></div></header><main className="max-w-6xl mx-auto p-4 sm:p-6"><MonetizationPanel/></main></div>}
