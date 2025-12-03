import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_URL = "http://localhost:5000/api";

/**
 * Global API Helper: Toggle Like on a Review
 */
const toggleLike = async (ratingId, userId) => {
  try {
    await fetch(`${API_URL}/books/ratings/${ratingId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });
    return true;
  } catch (e) { return false; }
};

function App() {
  // Initialize state from localStorage to persist session
  const [, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [view, setView] = useState(user ? "home" : "auth"); 
  const [targetUserId, setTargetUserId] = useState(null);
  const [activeBookId, setActiveBookId] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Expose user globally for helper components
  window.currentUser = user; 

  // --- Notification Handler ---
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
  };

  // --- Session Timeout Handler ---
  useEffect(() => {
    if (!user) return;

    const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 dakika
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      localStorage.setItem('lastActivity', Date.now().toString());
      timeoutId = setTimeout(() => {
        showNotification("Session expired due to inactivity.", "warning");
        handleLogout();
      }, TIMEOUT_DURATION);
    };

    // Kullanıcı aktivitelerini dinle
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Sayfa yüklendiğinde son aktiviteyi kontrol et
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceLastActivity > TIMEOUT_DURATION) {
        showNotification("Session expired due to inactivity.", "warning");
        handleLogout();
        return;
      }
    }

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  // --- Auto Logout on Tab/Window Close ---
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // Sekme/tarayıcı kapanırken otomatik logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // --- Authentication Handlers ---

  const handleAuth = async (type, email, password, username, switchToLogin) => {
    const endpoint = type === "login" ? "login" : "register";
    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username, 
          password: password, 
          email: type === "register" ? email : undefined 
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (type === "register") {
          showNotification("Registration Successful! Please Login.", "success");
          switchToLogin();
          return;
        }
        
        // Persist session
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));

        setToken(data.token);
        setUser(data);
        setView("home");
      } else {
        showNotification(data.error || "Operation failed.", "error");
      }
    } catch (err) { showNotification("Server connection error.", "error"); }
  };

  const handleLogout = useCallback(() => { 
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setToken(null); 
    setUser(null); 
    setView("auth"); 
  }, []);

  // --- Navigation Handlers ---

  const goToUserProfile = (uid) => {
    if (uid === user.uid) {
      setView("profile"); 
    } else {
      setTargetUserId(uid);
      setView("public_profile");
    }
  };

  const goToBookDetail = (bookId) => {
    setActiveBookId(bookId);
    setView("book_detail");
  };

  // --- Main Render ---
  return (
    <div className="App">
      {notification.show && <Notification message={notification.message} type={notification.type} />}
      {user && <Navbar user={user} setView={setView} onLogout={handleLogout} activeView={view} />}
      
      <div className="main-content">
        {view === "auth" && <AuthView onAuth={handleAuth} />}
        
        {view === "home" && <HomeView user={user} onBookClick={goToBookDetail} showNotification={showNotification} />}
        
        {view === "profile" && <ProfileView user={user} onBookClick={goToBookDetail} showNotification={showNotification} />}
        
        {view === "community" && (
          <CommunityView 
            onUserClick={goToUserProfile} 
            onBookClick={goToBookDetail} 
          />
        )}
        
        {view === "public_profile" && (
          <PublicProfileView 
            targetUserId={targetUserId} 
            onBack={() => setView("community")} 
            onBookClick={goToBookDetail} 
          />
        )}
        
        {view === "book_detail" && (
          <BookDetailView 
            bookId={activeBookId} 
            user={user} 
            onBack={() => setView("home")} 
            showNotification={showNotification}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// CHILD COMPONENTS
// ==========================================

function Navbar({ user, setView, onLogout, activeView }) {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => setView("home")} style={{cursor: 'pointer'}}>✨ BookMind</div>
      <div className="nav-links">
        <button className={activeView === 'home' ? 'active' : ''} onClick={() => setView("home")}>Home</button>
        <button className={activeView === 'community' ? 'active' : ''} onClick={() => setView("community")}>Community</button>
        <button className={activeView === 'profile' ? 'active' : ''} onClick={() => setView("profile")}>
          @{user.username || "Profile"}
        </button>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}

function AuthView({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(""); 
  const [pass, setPass] = useState(""); 
  const [username, setUsername] = useState(""); 

  const handleSubmit = () => {
    onAuth(isLogin ? "login" : "register", email, pass, username, () => setIsLogin(true));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">✨ BookMind</div>
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="subtitle">AI-powered personalized book recommendation system.</p>
        
        <input 
          className="input-field" 
          placeholder="Username" 
          onChange={e => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        
        {!isLogin && (
          <input 
            className="input-field" 
            placeholder="Email (for contact)" 
            onChange={e => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        )}
        
        <input 
          className="input-field" 
          type="password" 
          placeholder="Password" 
          onChange={e => setPass(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        
        <button className="primary-btn" onClick={handleSubmit}>
          {isLogin ? "Login" : "Register"}
        </button>
        <p className="toggle-text" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "No account? Register here" : "Have an account? Login here"}
        </p>
      </div>
    </div>
  );
}

function HomeView({ user, onBookClick, showNotification }) {
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

function ProfileView({ user, onBookClick, showNotification }) {
  const [ratings, setRatings] = useState([]);
  const [recs, setRecs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 

  const fetchUserData = () => {
    fetch(`${API_URL}/books/users/${user.uid}/ratings`).then(r => r.json()).then(setRatings);
    fetch(`${API_URL}/books/users/${user.uid}/recommendations`).then(r => r.json()).then(setRecs);
  };

  useEffect(() => { fetchUserData(); }, [user.uid]);

  const handleEditClick = (ratingItem) => {
    setEditingItem(ratingItem);
    setIsModalOpen(true);
  };

  const submitEdit = async (newScore, newText) => {
    if (!editingItem) return;
    await fetch(`${API_URL}/books/${editingItem.book_id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        user_id: user.uid, rating: newScore, book_title: editingItem.book_title, 
        review: newText, display_name: user.username 
      })
    });
    showNotification("Updated successfully!", "success");
    setIsModalOpen(false);
    setEditingItem(null);
    fetchUserData();
  };

  return (
    <div className="view-container">
      {editingItem && (
        <ReviewModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={submitEdit} 
          bookTitle={editingItem.book_title} 
          initialScore={editingItem.rating}
          initialText={editingItem.review}
        />
      )}

      <div className="profile-header">
        <div className="avatar">{user.username?.[0]?.toUpperCase()}</div>
        <h2>@{user.username}</h2>
        <p>{user.email}</p>
      </div>

      <div className="card-panel full-width" style={{marginBottom: '25px'}}>
        <h3>✨ Top Picks for You</h3>
        {recs.length === 0 ? (
          <p className="empty-text">Generating recommendations...</p>
        ) : (
          <div className="profile-recs-grid">
            {recs.slice(0, 5).map((b, i) => (
              <div key={i} className="mini-book-card" title={b.title} onClick={() => onBookClick(b.book_id)}>
                <img src={b.image_url && b.image_url.length > 5 ? b.image_url : "https://via.placeholder.com/100x150"} alt={b.title} />
                <div className="mini-book-title">{b.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-panel full-width">
        <h3>📚 Reading History</h3>
        <RatingsTable ratings={ratings} onBookClick={onBookClick} onEdit={handleEditClick} />
      </div>
    </div>
  );
}

function CommunityView({ onUserClick, onBookClick }) {
  const [recentRatings, setRecentRatings] = useState([]);
  
  useEffect(() => { 
    fetch(`${API_URL}/books/ratings/recent`).then(res => res.json()).then(setRecentRatings); 
  }, []);

  return (
    <div className="view-container">
      <div className="card-panel full-width">
        <h3>👥 Community Feed</h3>
        <div className="community-feed">
          {recentRatings.map((r, i) => {
            const myId = window.currentUser?.uid;
            const isLiked = (r.liked_by || []).includes(myId);
            
            return (
              <div key={i} className="feed-item">
                <div className="feed-avatar" onClick={() => onUserClick(r.user_id)}>
                  {r.display_name ? r.display_name[0].toUpperCase() : "?"}
                </div>
                <div className="feed-content">
                  <div className="feed-header">
                    <strong className="feed-user" onClick={() => onUserClick(r.user_id)}>@{r.display_name || "Anonim"}</strong>
                    <span> reviewed a book:</span>
                  </div>
                  
                  <div className="feed-book-title" onClick={() => onBookClick(r.book_id)} style={{cursor:'pointer', color:'#2980b9', display:'inline-block'}}>
                    {r.book_title}
                  </div>

                  <div className="feed-stars" style={{color:'#f1c40f'}}>{"★".repeat(r.rating)}</div>
                  {r.review && <div className="feed-review">"{r.review}"</div>}
                  
                  <div className="feed-footer" style={{display:'flex', justifyContent:'space-between', marginTop:'10px', alignItems:'center'}}>
                    <div className={`like-btn ${isLiked ? 'liked' : ''}`} onClick={async () => {
                       const newRatings = [...recentRatings];
                       const likes = newRatings[i].liked_by || [];
                       if (likes.includes(myId)) newRatings[i].liked_by = likes.filter(id => id !== myId);
                       else newRatings[i].liked_by = [...likes, myId];
                       setRecentRatings(newRatings);
                       await toggleLike(r.id, myId);
                    }}>
                      {isLiked ? "❤️" : "🤍"} {(r.liked_by || []).length} Likes
                    </div>
                    <div className="feed-date">{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PublicProfileView({ targetUserId, onBack, onBookClick }) {
  const [targetUser, setTargetUser] = useState(null);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/auth/user/${targetUserId}`).then(res => res.json()).then(setTargetUser);
    fetch(`${API_URL}/books/users/${targetUserId}/ratings`).then(res => res.json()).then(setRatings);
  }, [targetUserId]);

  if (!targetUser) return <div className="view-container">Loading...</div>;

  return (
    <div className="view-container">
      <button className="secondary-btn" onClick={onBack} style={{marginBottom:'20px'}}>← Back</button>
      <div className="profile-header">
        <div className="avatar" style={{background: '#9b59b6'}}>{targetUser.username?.[0]?.toUpperCase()}</div>
        <h2>@{targetUser.username}</h2>
        <p>BookMind Reader</p>
      </div>
      <div className="card-panel full-width"><h3>📚 Library of @{targetUser.username}</h3><RatingsTable ratings={ratings} onBookClick={onBookClick} /></div>
    </div>
  );
}

function BookDetailView({ bookId, user, onBack, showNotification }) {
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedRating, setSelectedRating] = useState(0); 
  const [myReviewText, setMyReviewText] = useState(""); 

  const fetchData = async () => {
    setLoading(true);
    try {
      const detailsRes = await fetch(`${API_URL}/books/${bookId}/details`);
      const detailsData = await detailsRes.json();
      setBook(detailsData);

      const reviewsRes = await fetch(`${API_URL}/books/${bookId}/reviews`);
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData);

      const myReview = reviewsData.find(r => r.user_id === user.uid);
      if (myReview) {
        setSelectedRating(myReview.rating);
        setMyReviewText(myReview.review || "");
      } else {
        setSelectedRating(0);
        setMyReviewText("");
      }
    } catch (e) { console.error("Error", e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [bookId, user.uid]);

  const handleRateClick = (score) => {
    setSelectedRating(score);
    setIsModalOpen(true);
  };

  const submitReview = async (newScore, newText) => {
    if (newScore === 0) { showNotification("Please select a rating.", "warning"); return; }

    await fetch(`${API_URL}/books/${bookId}/rate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        user_id: user.uid, rating: newScore, book_title: book.title, 
        review: newText, display_name: user.username 
      })
    });
    showNotification("Review Saved!", "success");
    setIsModalOpen(false);
    fetchData(); 
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
        initialScore={selectedRating} 
        initialText={myReviewText} 
      />

      <div className="book-detail-layout">
        <div className="detail-left">
          <img src={book.image_url} alt={book.title} className="detail-cover" />
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
                  <button 
                    style={{background: 'none', border: '1px solid #3498db', color: '#3498db', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.8rem'}}
                    onClick={() => setIsModalOpen(true)}
                  >
                    ✏️ Edit
                  </button>
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
                    <strong>@{r.display_name || "Anonim"}</strong>
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
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

function RatingsTable({ ratings, onBookClick, onEdit }) {
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
          {onEdit && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {ratings.map((r, i) => (
          <tr key={i}>
            <td>
              <img 
                src={r.image_url && r.image_url.length > 5 ? r.image_url : "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=40&h=60&fit=crop"} 
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
            <td style={{color:'#777', fontSize:'0.8rem'}}>{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}</td>
            {onEdit && (
              <td>
                <button onClick={() => onEdit(r)} style={{background: 'white', border: '1px solid #3498db', color: '#3498db', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize:'0.8rem'}}>✏️</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StarRating({ onRate, value = 0 }) {
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

function ReviewModal({ isOpen, onClose, onSubmit, bookTitle, initialScore = 0, initialText = "" }) {
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

function Notification({ message, type }) {
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

export default App;