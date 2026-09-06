import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return <footer className="site-footer"><div className="footer-grid"><div><strong className="footer-brand">Viraloft</strong><p>Social media tools, order management and practical digital growth resources.</p></div><div><h3>Company</h3><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/blog">Resources</Link></div><div><h3>Legal</h3><Link to="/privacy">Privacy</Link><Link to="/terms">Terms & Policies</Link></div><div><h3>Platform</h3><Link to="/services">Services</Link><Link to="/login">Login</Link><Link to="/register">Register</Link></div></div><div className="footer-bottom">© {new Date().getFullYear()} Viraloft. Third-party trademarks belong to their respective owners.</div></footer>;
}
