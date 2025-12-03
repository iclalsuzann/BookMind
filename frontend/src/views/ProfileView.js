import React, { useState, useEffect } from 'react';
import { API_URL, getUserWishlist, deleteRating } from '../api/api';
import RatingsTable from '../components/RatingsTable';
import ReviewModal from '../components/ReviewModal';
import ConfirmModal from '../components/ConfirmModal';

export default function ProfileView({ user, onBookClick, showNotification }) {
  const [profileUser, setProfileUser] = useState(user);
  
  const [ratings, setRatings] = useState([]);
  const [recs, setRecs] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [activeTab, setActiveTab] = useState("reviews"); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  
  // States for Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookIdToDelete, setBookIdToDelete] = useState(null);

  const fetchUserData = () => {
    // 1. Fetch updated user info (followers etc.)
    fetch(`${API_URL}/auth/user/${user.uid}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setProfileUser(data); 
        }
      })
      .catch(err => console.error("User fetch error:", err));

    // 2. Fetch Ratings
    fetch(`${API_URL}/books/users/${user.uid}/ratings`).then(r => r.json()).then(setRatings);
    
    // 3. Fetch Recommendations
    fetch(`${API_URL}/books/users/${user.uid}/recommendations`).then(r => r.json()).then(setRecs);
    
    // 4. Fetch Reading List
    getUserWishlist(user.uid).then(setWishlist);
  };

  useEffect(() => { fetchUserData(); }, [user.uid]);

  // DELETE HANDLERS
  const handleDeleteClick = (bookId) => {
    setBookIdToDelete(bookId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!bookIdToDelete) return;

    const success = await deleteRating(bookIdToDelete, user.uid);
    if (success) {
      showNotification("Rating deleted successfully.", "success");
      fetchUserData(); // Refresh list
    } else {
      showNotification("Failed to delete rating.", "error");
    }
    // Close modal and reset ID
    setIsDeleteModalOpen(false);
    setBookIdToDelete(null);
  };

  // EDIT HANDLERS
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
      {/* EDIT MODAL */}
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

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this rating? This action cannot be undone."
      />

      <div className="profile-header">
        <div className="avatar">
            {profileUser.username ? profileUser.username[0].toUpperCase() : "?"}
        </div>
        <h2>@{profileUser.username || "Unknown"}</h2>
        <p>{profileUser.email}</p>
        
        <div style={{display: 'flex', gap: '20px', justifyContent: 'center', margin: '15px 0', fontSize: '0.9rem', color: '#666'}}>
          <span><strong>{profileUser.followers_count || 0}</strong> Followers</span>
          <span><strong>{profileUser.following_count || 0}</strong> Following</span>
        </div>
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
        {/* --- TAB MENU --- */}
        <div style={{display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #eee'}}>
            <h3 
                onClick={() => setActiveTab("reviews")}
                style={{
                    cursor: 'pointer', 
                    borderBottom: activeTab === 'reviews' ? '3px solid #3498db' : 'none',
                    paddingBottom: '10px',
                    color: activeTab === 'reviews' ? '#2c3e50' : '#95a5a6'
                }}
            >
                📚 Reading History
            </h3>
            <h3 
                onClick={() => setActiveTab("wishlist")}
                style={{
                    cursor: 'pointer', 
                    borderBottom: activeTab === 'wishlist' ? '3px solid #3498db' : 'none',
                    paddingBottom: '10px',
                    color: activeTab === 'wishlist' ? '#2c3e50' : '#95a5a6'
                }}
            >
                🔖 Reading List
            </h3>
        </div>

        {/* --- CONTENT --- */}
        {activeTab === "reviews" ? (
            <RatingsTable 
                ratings={ratings} 
                onBookClick={onBookClick} 
                onEdit={handleEditClick} 
                onDelete={handleDeleteClick} 
            />
        ) : (
            /* READING LIST GRID */
            <div className="profile-recs-grid" style={{justifyContent: 'flex-start'}}>
                {wishlist.length === 0 && <p className="empty-text">Your reading list is empty.</p>}
                {wishlist.map((b, i) => (
                  <div key={i} className="mini-book-card" onClick={() => onBookClick(b.book_id)}>
                    <img src={b.image_url} alt={b.book_title} />
                    <div className="mini-book-title">{b.book_title}</div>
                  </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}