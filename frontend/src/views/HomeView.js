import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../api/api';
import StarRating from '../components/StarRating';
import ReviewModal from '../components/ReviewModal';

export default function HomeView({ user, onBookClick, showNotification }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);

  const getRecs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/books/users/${user.uid}/recommendations`);
      const data = await res.json();
      setRecs(data);
    } catch (e) {}
    setLoading(false);
  }, [user.uid]);

  useEffect(() => { getRecs(); }, [getRecs]); 

  const searchBooks = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/books/search?query=${query}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {}
    setLoading(false);
  };

  const handleStarClick = (book, score) => {
    setSelectedBook(book);
    setSelectedRating(score);
    setIsModalOpen(true);
  };

  const submitReview = async (newScore, reviewText) => {
    if (newScore === 0) {
      showNotification("Please select a rating.", "warning");
      return;
    }
    try {
      await fetch(`${API_URL}/books/${selectedBook.book_id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.uid,
          rating: newScore,
          book_title: selectedBook.title, 
          review: reviewText,
          display_name: user.username
        })
      });
      showNotification("Review saved!", "success");
      setIsModalOpen(false);
      getRecs(); 
    } catch (error) { showNotification("Error occurred.", "error"); }
  };

  return (
    <div className="view-container">
      <ReviewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={submitReview} 
        bookTitle={selectedBook?.title} 
        initialScore={selectedRating} 
      />

      <div className="hero-section">
        <h1>Hello, {user.username || "Reader"}! 👋</h1>
        <div className="search-bar">
          <input 
            placeholder="Search by title or author..." 
            onChange={e => setQuery(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && searchBooks()} 
          />
          <button onClick={searchBooks}>🔍</button>
        </div>
      </div>

      <div className="content-grid">
        {/* Search Results */}
        <div className="card-panel">
          <h3>🔍 Search Results</h3>
          {results.length === 0 && !loading && <p className="empty-text">Start searching above...</p>}
          <div className="book-list">
            {results.map((b, i) => (
               <div key={i} className="book-item">
                 <img 
                  src={b.image_url && b.image_url.length > 5 ? b.image_url : "https://via.placeholder.com/50x75"} 
                  alt="cover" 
                  className="book-cover-img"
                  onClick={() => onBookClick(b.book_id)}
                  style={{cursor: 'pointer'}}
                />
                <div className="book-info">
                  <strong onClick={() => onBookClick(b.book_id)} style={{cursor: 'pointer'}}>
                    {b.title}
                  </strong>
                  <span>{b.author}</span>
                  <div style={{marginTop: '5px'}}>
                    <StarRating onRate={(score) => handleStarClick(b, score)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="card-panel">
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <h3>✨ Recommendations</h3>
            <button className="secondary-btn" onClick={getRecs}>Refresh</button>
          </div>
          <div className="book-list">
             {recs.map((b, i) => (
               <div key={i} className="book-item">
                 <img 
                   src={b.image_url} 
                   className="book-cover-img" 
                   alt="" 
                   onClick={() => onBookClick(b.book_id)}
                   style={{cursor: 'pointer'}}
                 />
                 <div className="book-info">
                   <strong onClick={() => onBookClick(b.book_id)} style={{cursor: 'pointer'}}>
                     {b.title}
                   </strong>
                   <span>{b.author}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}