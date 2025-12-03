import React, { useState, useEffect } from 'react';
import { API_URL, toggleLike, searchUsers } from '../api/api';

export default function CommunityView({ onUserClick, onBookClick }) {
  const [recentRatings, setRecentRatings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Fetch Feed Data
  useEffect(() => { 
    fetch(`${API_URL}/books/ratings/recent`).then(res => res.json()).then(setRecentRatings); 
  }, []);

  // Search Function
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 1) {
      setIsSearching(true);
      const results = await searchUsers(query);
      setUserResults(results);
    } else {
      setIsSearching(false);
      setUserResults([]);
    }
  };

  return (
    <div className="view-container">
      
      {/* --- SEARCH BAR --- */}
      <div className="card-panel full-width" style={{marginBottom: '20px', textAlign:'center'}}>
        <input 
          type="text"
          placeholder="🔍 Search for users (e.g. 'john')..." 
          value={searchQuery}
          onChange={handleSearch}
          className="input-field"
          style={{maxWidth: '500px', margin: '0 auto'}}
        />
      </div>

      <div className="card-panel full-width">
        <h3>
          {isSearching ? `🔍 Results for "${searchQuery}"` : "👥 Community Feed"}
        </h3>

        {/* --- SEARCH RESULTS --- */}
        {isSearching && (
          <div className="user-search-results">
            {userResults.length === 0 ? (
              <p className="empty-text">User not found.</p>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px'}}>
                {userResults.map((u, i) => (
                  <div 
                    key={i} 
                    onClick={() => onUserClick(u.uid)}
                    style={{
                      padding: '15px', 
                      border: '1px solid #eee', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#f9f9f9'
                    }}
                  >
                    <div className="avatar" style={{width: '40px', height: '40px', fontSize: '1.2rem', margin: 0}}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight: 'bold'}}>@{u.username}</div>
                      <div style={{fontSize: '0.8rem', color: '#666'}}>View Profile</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <hr className="divider" style={{margin: '30px 0'}} />
          </div>
        )}

        {/* --- COMMUNITY FEED --- */}
        <div className="community-feed" style={{opacity: isSearching ? 0.5 : 1}}>
           {recentRatings.map((r, i) => {
            const myId = window.currentUser?.uid;
            const isLiked = (r.liked_by || []).includes(myId);
            
            return (
              <div key={i} className="feed-item" style={{display: 'flex', alignItems: 'flex-start'}}>
                {/* LEFT: Avatar */}
                <div className="feed-avatar" onClick={() => onUserClick(r.user_id)}>
                  {r.display_name ? r.display_name[0].toUpperCase() : "?"}
                </div>

                {/* CENTER: Content */}
                <div className="feed-content" style={{flex: 1}}>
                  <div className="feed-header">
                    <strong className="feed-user" onClick={() => onUserClick(r.user_id)}>@{r.display_name || "Anonymous"}</strong>
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

                {/* RIGHT: Book Cover */}
                {r.image_url && (
                    <img 
                        src={r.image_url} 
                        alt="Book Cover" 
                        onClick={() => onBookClick(r.book_id)}
                        style={{
                            width: '60px', 
                            height: '90px', 
                            objectFit: 'cover', 
                            borderRadius: '4px',
                            marginLeft: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                    />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}