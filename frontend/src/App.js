import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { API_URL } from './api/api';

// Components
import Navbar from './components/Navbar';
import Notification from './components/Notification';

// Views
import AuthView from './views/AuthView';
import HomeView from './views/HomeView';
import ProfileView from './views/ProfileView';
import CommunityView from './views/CommunityView';
import PublicProfileView from './views/PublicProfileView';
import BookDetailView from './views/BookDetailView';

function App() {
  // --- State Definitions ---
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

  // --- Logout Handler ---
  const handleLogout = useCallback(() => { 
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setToken(null); 
    setUser(null); 
    setView("auth"); 
  }, []);

  // --- Session Timeout Handler ---
  useEffect(() => {
    if (!user) return;

    const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      localStorage.setItem('lastActivity', Date.now().toString());
      timeoutId = setTimeout(() => {
        showNotification("Session expired due to inactivity.", "warning");
        handleLogout();
      }, TIMEOUT_DURATION);
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Check last activity on page load
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
  }, [user, handleLogout]);

  // --- Auto Logout on Tab/Window Close ---
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // Auto logout when tab/browser closes
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // --- Auth Handler (Login/Register) ---
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
        
        // Fetch user details including follow stats
        const userDetailsRes = await fetch(`${API_URL}/auth/user/${data.uid}`);
        const userDetails = await userDetailsRes.json();
        
        const fullUserData = {
          ...data,
          followers_count: userDetails.followers_count || 0,
          following_count: userDetails.following_count || 0
        };
        
        // Persist session
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(fullUserData));

        setToken(data.token);
        setUser(fullUserData);
        setView("home");
      } else {
        showNotification(data.error || "Operation failed.", "error");
      }
    } catch (err) { showNotification("Server connection error.", "error"); }
  };

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
        
        {view === "home" && (
          <HomeView user={user} onBookClick={goToBookDetail} showNotification={showNotification} />
        )}
        
        {view === "profile" && (
          <ProfileView user={user} onBookClick={goToBookDetail} showNotification={showNotification} />
        )}
        
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
            onBookClick={goToBookDetail}
          />
        )}
      </div>
    </div>
  );
}

export default App;