import React from 'react';

export default function RatingsTable({ ratings, onBookClick, onEdit, onDelete }) {
  if (ratings.length === 0) return <p className="empty-text">No books rated yet.</p>;
  
  return (
    <table className="ratings-table">
      <thead>
        <tr>
          <th style={{width: '60px'}}>Cover</th>
          <th>Book</th>
          <th>Rating</th>
          <th>Review</th>
          <th>Date</th>
          {(onEdit || onDelete) && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {ratings.map((r, i) => (
          <tr key={i}>
            <td>
              <img 
                src={r.image_url && r.image_url.length > 5 ? r.image_url : "https://via.placeholder.com/40x60"} 
                alt="cover"
                style={{width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer'}}
                onClick={() => onBookClick(r.book_id)}
              />
            </td>
            <td 
              onClick={() => onBookClick(r.book_id)}
              style={{fontWeight: '600', color: '#2c3e50', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#bdc3c7'}}
            >
              {r.book_title}
            </td>
            <td style={{color:'#f1c40f'}}>{'★'.repeat(r.rating)}</td>
            <td style={{color: '#555', fontStyle: 'italic', fontSize:'0.9rem'}}>
              {r.review ? (r.review.length > 40 ? r.review.substring(0, 40) + "..." : r.review) : "-"}
            </td>
            <td style={{color:'#777', fontSize:'0.8rem'}}>
              {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}
            </td>
            {(onEdit || onDelete) && (
              <td style={{display: 'flex', gap: '8px'}}>
                {onEdit && (
                  <button 
                    onClick={() => onEdit(r)} 
                    title="Edit Rating"
                    style={{background: 'white', border: '1px solid #3498db', color: '#3498db', padding: '5px 8px', borderRadius: '5px', cursor: 'pointer'}}
                  >
                    ✏️
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(r.book_id)} 
                    title="Delete Rating"
                    style={{background: 'white', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 8px', borderRadius: '5px', cursor: 'pointer'}}
                  >
                    🗑️
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}