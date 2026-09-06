import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const articles = [
  ['A practical social-media growth checklist', 'Set a clear goal, improve the profile visitors land on, publish consistently, measure meaningful actions and use paid promotion only when it supports a defined objective.'],
  ['What to measure beyond follower count', 'Reach, watch time, saves, shares, qualified profile visits, enquiries and conversions usually reveal more about content quality than a single vanity metric.'],
  ['How to prepare a campaign before spending money', 'Define the audience, creative promise, landing experience, budget limit and success metric first. Small controlled tests make it easier to learn before scaling.'],
];

export default function Blog() {
  return <><Navbar/><main className="content-page"><header className="content-hero"><p className="eyebrow">Viraloft Resources</p><h1>Practical guides for creators and small businesses</h1><p>Original, plain-language notes about social media planning, measurement and responsible digital promotion.</p></header><section className="article-grid">{articles.map(([title, body], i)=><article className="article-card" key={title}><span>Guide {String(i+1).padStart(2,'0')}</span><h2>{title}</h2><p>{body}</p><Link to="/services">Explore Viraloft services →</Link></article>)}</section></main></>;
}
