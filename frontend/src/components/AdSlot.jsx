import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

let cachedSettings;
let pending;
const loadSettings = () => {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (!pending) pending = api.get('/api/site/settings').then((r) => (cachedSettings = r.data || {})).catch(() => ({}));
  return pending;
};

export function AdSenseLoader() {
  const [client, setClient] = useState('');
  useEffect(() => { loadSettings().then((s) => s.adsEnabled && setClient(s.adsenseClientId || '')); }, []);
  useEffect(() => {
    if (!client || document.querySelector('script[data-viraloft-adsense]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.viraloftAdsense = 'true';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.appendChild(script);
  }, [client]);
  return null;
}

export default function AdSlot({ placement, className = '' }) {
  const [slot, setSlot] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    loadSettings().then((s) => setSlot((s.adSlots || []).find((x) => x.placement === placement) || null));
  }, [placement]);
  useEffect(() => {
    if (!slot?.code || !ref.current) return;
    ref.current.innerHTML = slot.code;
    ref.current.querySelectorAll('script').forEach((oldScript) => {
      const script = document.createElement('script');
      [...oldScript.attributes].forEach((a) => script.setAttribute(a.name, a.value));
      script.text = oldScript.text;
      oldScript.replaceWith(script);
    });
  }, [slot]);
  if (!slot) return null;
  return <aside aria-label="Advertisement" className={`ad-slot ${className}`}><span className="ad-label">Advertisement</span><div ref={ref} /></aside>;
}
