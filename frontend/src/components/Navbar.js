import React from 'react';

export default function Navbar({ user, setView, onLogout, activeView }) {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => setView("home")} style={{cursor: 'pointer'}}>
        ✨ BookMind
      </div>
      <div className="nav-links">
        <button 
          className={activeView === 'home' ? 'active' : ''} 
          onClick={() => setView("home")}
        >
          Home
        </button>
        <button 
          className={activeView === 'community' ? 'active' : ''} 
          onClick={() => setView("community")}
        >
          Community
        </button>
        <button 
          className={activeView === 'profile' ? 'active' : ''} 
          onClick={() => setView("profile")}
        >
          @{user.username || "Profile"}
        </button>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}