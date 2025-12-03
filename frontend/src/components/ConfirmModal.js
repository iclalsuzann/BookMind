import React from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{maxWidth: '400px'}}>
        <h3 style={{color: '#e74c3c'}}>⚠️ Delete Rating</h3>
        <p style={{marginBottom: '25px', color: '#555', fontSize: '1.1rem'}}>{message}</p>
        
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          
          <button 
            className="submit-btn" 
            onClick={onConfirm}
            style={{
                background: 'linear-gradient(135deg, #ff7675 0%, #d63031 100%)',
                boxShadow: '0 6px 20px rgba(214, 48, 49, 0.4)'
            }}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}