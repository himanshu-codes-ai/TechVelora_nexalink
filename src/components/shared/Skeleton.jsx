import React from 'react';

export default function Skeleton({ type = 'text', width, height, count = 1, className = '' }) {
  const items = Array.from({ length: count }, (_, i) => i);
  
  if (type === 'card') {
    return (
      <div className={`card card-body ${className}`}>
        <div className="flex gap-3 items-center mb-4">
          <div className="skeleton skeleton-avatar" style={{ width: 40, height: 40 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '100%' }} />
        <div className="skeleton skeleton-text" style={{ width: '90%' }} />
        <div className="skeleton skeleton-text" style={{ width: '75%' }} />
      </div>
    );
  }

  if (type === 'avatar') {
    return <div className={`skeleton skeleton-avatar ${className}`} style={{ width: width || 40, height: height || 40 }} />;
  }

  return items.map(i => (
    <div 
      key={i} 
      className={`skeleton skeleton-text ${className}`} 
      style={{ width: width || `${100 - i * 10}%`, height: height || 14 }} 
    />
  ));
}
