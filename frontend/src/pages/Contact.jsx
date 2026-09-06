import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

export default function Contact() {
  return <><Navbar/><main className="legal-page"><article className="legal-card"><p className="eyebrow">Contact</p><h1>How can we help?</h1><p>Existing customers can use the authenticated support center for order-specific help. For general questions, policy questions, business enquiries or privacy requests, you can contact the Viraloft team through the support workflow after creating an account.</p><div className="legal-actions"><Link className="primary-link" to="/register">Create an account</Link><Link className="secondary-link" to="/login">Sign in</Link></div><h2>Before contacting support</h2><p>Please include enough context for us to understand the issue, but never send passwords, one-time codes, private keys or other authentication secrets.</p><h2>Useful links</h2><p>Review our <Link to="/terms">Terms & Policies</Link> and <Link to="/privacy">Privacy Policy</Link> for common policy questions.</p></article></main></>;
}
