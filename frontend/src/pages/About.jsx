import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

export default function About() {
  return <><Navbar/><main className="legal-page"><article className="legal-card"><p className="eyebrow">About Viraloft</p><h1>Tools, guidance and a clearer way to manage social growth</h1><p>Viraloft is a web platform built to help creators, small businesses and digital teams discover social-media services, manage orders and keep their activity in one dashboard.</p><h2>What we focus on</h2><p>Our goal is to make digital marketing workflows easier to understand. Public pages explain how the platform works while registered users get order tracking, account history and support tools.</p><h2>Responsible use</h2><p>Customers are responsible for following the rules of the social platforms they use. Viraloft does not claim affiliation with TikTok, Meta, YouTube, X, Spotify, Canva, OpenAI or other third-party brands referenced to describe compatible platforms or services.</p><h2>Transparency</h2><p>We publish our privacy, terms, refund and advertising information publicly so visitors can review important policies before registering. Questions can be sent through our <Link to="/contact">contact page</Link>.</p></article></main></>;
}
