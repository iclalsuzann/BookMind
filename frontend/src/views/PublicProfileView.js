import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/api';
import RatingsTable from '../components/RatingsTable';

export default function PublicProfileView({ targetUserId, onBack, onBookClick }) {
  const [targetUser, setTargetUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const currentUser = window.currentUser;

  useEffect(() => {
    fetch(`${API_URL}/auth/user/${targetUserId}`).then(res => res.json()).then(setTargetUser);
    fetch(`${API_URL}/books/users/${targetUserId}/ratings`).then(res => res.json()).then(setRatings);
    
    // Check follow status
    if (currentUser) {
      fetch(`${API_URL}/auth/is_following?follower_id=${currentUser.uid}&following_id=${targetUserId}`)
        .then(res => res.json())
        .then(data => setIsFollowing(data.is_following));
    }
  }, [targetUserId, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    
    setFollowLoading(true);
    const endpoint = isFollowing ? '/auth/unfollow' : '/auth/follow';
    
    try {
      await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_id: currentUser.uid,
          following_id: targetUserId
        })
      });
      
      setIsFollowing(!isFollowing);
      
      // Refresh user info (update follower count)
      fetch(`${API_URL}/auth/user/${targetUserId}`).then(res => res.json()).then(setTargetUser);
    } catch (e) {
      console.error('Follow operation failed:', e);
    }
    setFollowLoading(false);
  };

  if (!targetUser) return <div className="view-container">Loading...</div>;

  return (
    <div className="view-container">
      <button className="secondary-btn" onClick={onBack} style={{marginBottom:'20px'}}>← Back</button>
      <div className="profile-header">
        <div className="avatar" style={{background: '#9b59b6'}}>
            {targetUser.username ? targetUser.username[0].toUpperCase() : "?"}
        </div>
        <h2>@{targetUser.username}</h2>
        
        <div style={{display: 'flex', gap: '20px', justifyContent: 'center', margin: '15px 0', fontSize: '0.9rem', color: '#666'}}>
          <span><strong>{targetUser.followers_count || 0}</strong> Followers</span>
          <span><strong>{targetUser.following_count || 0}</strong> Following</span>
        </div>
        
        {currentUser && currentUser.uid !== targetUserId && (
          <button 
            className={isFollowing ? "secondary-btn" : "primary-btn"}
            onClick={handleFollowToggle}
            disabled={followLoading}
            style={{marginTop: '10px', minWidth: '120px'}}
          >
            {followLoading ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
          </button>
        )}
      </div>
      <div className="card-panel full-width">
        <h3>📚 Library of @{targetUser.username}</h3>
        {/* We don't pass onEdit or onDelete here because visitors shouldn't edit others' profiles */}
        <RatingsTable ratings={ratings} onBookClick={onBookClick} />
      </div>
    </div>
  );
}