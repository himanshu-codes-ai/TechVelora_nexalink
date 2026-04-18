import React from 'react';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  
  if (src) {
    return (
      <img 
        src={src} 
        alt={name || 'Avatar'} 
        className={`avatar avatar-${size} ${className}`}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }

  return (
    <div className={`avatar avatar-${size} ${className}`}>
      {initials}
    </div>
  );
}
