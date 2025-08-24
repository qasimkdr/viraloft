import React from 'react';
export default function GradientBackdrop({ soft=false }) {
  return <div className={`app-gradient ${soft ? 'app-gradient--soft' : ''}`} aria-hidden="true" />;
}
