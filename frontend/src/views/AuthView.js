import React, { useState } from 'react';

export default function AuthView({ onAuth }) {
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