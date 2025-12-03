import React, { useState, useEffect } from 'react';
import { API_URL, toggleLike, toggleWishlist, checkWishlistStatus, deleteRating } from '../api/api';
import StarRating from '../components/StarRating';
import ReviewModal from '../components/ReviewModal';
import ConfirmModal from '../components/ConfirmModal';

export default function BookDetailView({ bookId, user, onBack, showNotification, onBookClick }) {
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Rating States
  const [selectedRating, setSelectedRating] = useState(0); // Saved rating from DB
  const [tempRating, setTempRating] = useState(0); // Temporary rating for popup
  const [myReviewText, setMyReviewText] = useState(""); 

  // Reading List States
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const detailsRes = await fetch(`${API_URL}/books/${bookId}/details`);
      const detailsData = await detailsRes.json();
      setBook(detailsData);

      const reviewsRes = await fetch(`${API_URL}/books/${bookId}/reviews`);
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData);

      // Find user's existing review
      const myReview = reviewsData.find(r => r.user_id === user.uid);
      if (myReview) {
        setSelectedRating(myReview.rating);
        setMyReviewText(myReview.review || "");
      } else {
        setSelectedRating(0);
        setMyReviewText("");
      }

      const status = await checkWishlistStatus(bookId, user.uid);
      setInWishlist(status);

    } catch (e) { console.error("Error", e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [bookId, user.uid]);

  // FUNCTION WHEN STAR IS CLICKED
  const handleRateClick = (score) => {
    setTempRating(score); // Set temp rating only
    setIsModalOpen(true); // Open modal
  };

  // CLICK ON EDIT BUTTON
  const handleEditClick = () => {
    setTempRating(selectedRating);
    setIsModalOpen(true);
  };

  // SAVE REVIEW IN POPUP
  const submitReview = async (newScore, newText) => {
    if (newScore === 0) { showNotification("Please select a rating.", "warning"); return; }

    try {
      await fetch(`${API_URL}/books/${bookId}/rate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.uid, rating: newScore, book_title: book.title, 
          review: newText, display_name: user.username 
        })
      });
      showNotification("Review Saved!", "success");
      setIsModalOpen(false);
      
      // Update local state after save
      setSelectedRating(newScore);
      setMyReviewText(newText);
      
      fetchData(); // Refresh list
    } catch (e) {
      showNotification("Error saving review", "error");
    }
  };

  const handleWishlistToggle = async () => {
    setWishlistLoading(true);
    const res = await toggleWishlist(bookId, user.uid, book.title, book.image_url);
    
    if (res.status === "added") {
        setInWishlist(true);
        showNotification("Added to your Reading List! 📚", "success");
    } else if (res.status === "removed") {
        setInWishlist(false);
        showNotification("Removed from Reading List.", "warning");
    }
    setWishlistLoading(false);
  };

  const handleDeleteRating = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    const success = await deleteRating(bookId, user.uid);
    if (success) {
        showNotification("Rating deleted.", "success");
        setSelectedRating(0);
        setMyReviewText("");
        fetchData();
    }
    setIsDeleteModalOpen(false);
  };

  if (loading) return <div className="view-container">Loading...</div>;
  if (!book) return <div className="view-container">Book not found.</div>;

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : "N/A";

  return (
    <div className="view-container">
      <button className="secondary-btn" onClick={onBack} style={{marginBottom:'20px'}}>← Back</button>
      
      <ReviewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={submitReview} 
        bookTitle={book.title} 
        initialScore={selectedRating > 0 ? selectedRating : tempRating} 
        initialText={myReviewText} 
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        message="Delete your rating for this book?"
      />

      <div className="book-detail-layout">
        <div className="detail-left">
          <img src={book.image_url} alt={book.title} className="detail-cover" />
          
          <button 
            className={`wishlist-btn ${inWishlist ? 'active' : ''}`} 
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            style={{
                width: '100%', padding: '10px', marginBottom: '15px',
                border: '1px solid #3498db',
                background: inWishlist ? '#3498db' : 'white',
                color: inWishlist ? 'white' : '#3498db',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            {wishlistLoading ? '...' : (inWishlist ? '✓ On Reading List' : '+ Add to Reading List')}
          </button>

          <div className="detail-actions">
            <div style={{marginBottom:'15px', fontSize:'1.2rem', fontWeight:'bold'}}>
              Average Rating: ⭐ {avgRating}
            </div>
            
            <div style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee'}}>
              <p style={{margin: '0 0 10px 0', color: '#555', fontWeight:'bold'}}>Your Rating:</p>
              
              {selectedRating > 0 ? (
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '1.8rem', color: '#f1c40f', marginBottom: '10px'}}>
                    {"★".repeat(selectedRating)}
                  </div>
                  {myReviewText && <div style={{fontSize:'0.9rem', fontStyle:'italic', color:'#555', marginBottom: '10px'}}>"{myReviewText}"</div>}
                  
                  <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                    <button 
                        style={{background: 'none', border: '1px solid #3498db', color: '#3498db', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.8rem'}}
                        onClick={handleEditClick}
                    >
                        ✏️ Edit
                    </button>
                    <button 
                        style={{background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.8rem'}}
                        onClick={handleDeleteRating}
                    >
                        🗑️ Delete
                    </button>
                  </div>
                </div>
              ) : (
                <StarRating onRate={handleRateClick} />
              )}
            </div>
          </div>
        </div>

        <div className="detail-right">
          <h1 className="detail-title">{book.title}</h1>
          <h3 className="detail-author">Author: {book.author}</h3>
          <div className="detail-meta">
            <p><strong>Publisher:</strong> {book.publisher}</p>
            <p><strong>Year:</strong> {book.year}</p>
            <p><strong>ISBN:</strong> {book.book_id}</p>
          </div>
          <hr className="divider" />
          <h3>💬 Community Reviews ({reviews.length})</h3>
          <div className="reviews-list">
            {reviews.length === 0 ? <p>No reviews yet.</p> : null}
            {reviews.map((r, i) => {
               const myId = window.currentUser?.uid;
               const isLiked = (r.liked_by || []).includes(myId);
               return (
                <div key={i} className="review-card">
                  <div className="review-header">
                    <strong>@{r.display_name || "Anonymous"}</strong>
                    <span className="review-date">{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}</span>
                  </div>
                  <div className="review-stars">{'★'.repeat(r.rating)}</div>
                  <p className="review-text">{r.review}</p>
                  <div 
                    className="review-actions" 
                    style={{marginTop:'10px', cursor:'pointer', fontSize:'0.9rem', color: isLiked ? '#e74c3c' : '#777'}}
                    onClick={async () => {
                       const newReviews = [...reviews];
                       const likes = newReviews[i].liked_by || [];
                       if (likes.includes(myId)) newReviews[i].liked_by = likes.filter(id => id !== myId);
                       else newReviews[i].liked_by = [...likes, myId];
                       setReviews(newReviews);
                       await toggleLike(r.id, myId);
                    }}
                  >
                     {isLiked ? "❤️" : "🤍"} {(r.liked_by || []).length}
                  </div>
                </div>
               );
            })}
          </div>
        </div>
      </div>
      
      <SimilarBooksSection bookId={bookId} onBookClick={onBookClick} />
    </div>
  );
}

function SimilarBooksSection({ bookId, onBookClick }) {
  const [similarBooks, setSimilarBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarBooks = async () => {
      try {
        const res = await fetch(`${API_URL}/books/${bookId}/similar`);
        if (res.ok) {
          const data = await res.json();
          setSimilarBooks(data);
        }
      } catch (e) {
        console.error("Failed to load similar books:", e);
      }
      setLoading(false);
    };

    fetchSimilarBooks();
  }, [bookId]);

  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Loading similar books...</div>;
  if (similarBooks.length === 0) return null;

  return (
    <div style={{marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px'}}>
      <h3 style={{marginBottom: '20px'}}>📚 Similar Books</h3>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px'}}>
        {similarBooks.map((book, idx) => (
          <div 
            key={idx} 
            style={{
              cursor: 'pointer', 
              textAlign: 'center',
              transition: 'transform 0.2s',
            }}
            onClick={() => onBookClick(book.book_id)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img 
              src={book.image_url} 
              alt={book.title}
              style={{
                width: '100%',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '10px'
              }}
            />
            <div style={{fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
              {book.title}
            </div>
            <div style={{fontSize: '0.75rem', color: '#666'}}>
              {book.author}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}