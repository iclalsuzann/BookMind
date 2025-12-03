import React, { useState } from 'react';

export default function StarRating({ onRate, value = 0 }) {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="star-rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hover > 0 ? star <= hover : star <= value;
        return (
          <span
            key={star}
            className="star"
            style={{ color: isActive ? "#f1c40f" : "#bdc3c7" }}
            onMouseEnter={() => setHover(star)}
            onClick={() => onRate(star)}
            title={`${star} Stars`}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}