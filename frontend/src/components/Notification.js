import React from 'react';

export default function Notification({ message, type }) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠'
  };

  return (
    <div className={`notification notification-${type}`}>
      <span className="notification-icon">{icons[type]}</span>
      <span className="notification-message">{message}</span>
    </div>
  );
}