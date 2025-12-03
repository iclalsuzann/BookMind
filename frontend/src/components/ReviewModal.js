import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';

export default function ReviewModal({ isOpen, onClose, onSubmit, bookTitle, initialScore = 0, initialText = "" }) {
  const [score, setScore] = useState(initialScore);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setScore(initialScore);
      setText(initialText || "");
    }
  }, [isOpen, initialScore, initialText]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>"{bookTitle}"</h3>
        <div style={{marginBottom: '15px'}}>
          <p style={{marginBottom:'5px', color:'#666', fontSize:'0.9rem'}}>Your Rating:</p>
          <StarRating onRate={setScore} value={score} />
        </div>
        <textarea 
          className="review-textarea" 
          placeholder="Write your review here... (Optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="submit-btn" onClick={() => onSubmit(score, text)}>Save</button>
        </div>
      </div>
    </div>
  );
}