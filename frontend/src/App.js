import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("auth"); // auth, home, profile

  // Oturum Açma / Kayıt Olma İşlemi
  const handleAuth = async (type, email, password, displayName) => {
    const endpoint = type === "login" ? "login" : "register";
    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name: displayName })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (type === "register") {
          alert("Kayıt Başarılı! Şimdi giriş yapabilirsiniz.");
          return;
        }
        setToken(data.token);
        setUser(data);
        setView("home");
      } else {
        alert(data.error || "İşlem başarısız.");
      }
    } catch (err) { alert("Sunucuya bağlanılamadı."); }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setView("auth");
  };

  return (
    <div className="App">
      {user && <Navbar user={user} setView={setView} onLogout={handleLogout} activeView={view} />}
      
      <div className="main-content">
        {view === "auth" && <AuthView onAuth={handleAuth} />}
        {view === "home" && <HomeView user={user} />}
        {view === "profile" && <ProfileView user={user} />}
      </div>
    </div>
  );
}

// --- BİLEŞENLER ---

// 1. Üst Menü (Navbar)
function Navbar({ user, setView, onLogout, activeView }) {
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
          Ana Sayfa
        </button>
        <button 
          className={activeView === 'profile' ? 'active' : ''} 
          onClick={() => setView("profile")}
        >
          Profilim
        </button>
        <button className="logout-btn" onClick={onLogout}>Çıkış</button>
      </div>
    </nav>
  );
}

// 2. Giriş / Kayıt Ekranı (AuthView)
function AuthView({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo ve Başlık */}
        <div className="auth-brand">
          ✨ BookMind
        </div>
        
        <h2>{isLogin ? "Hoş Geldiniz" : "Hesap Oluştur"}</h2>
        
        {/* Proje Tanımı (Subtitle) */}
        <p className="subtitle">
          İlgi alanlarınıza ve okuma geçmişinize göre kişiselleştirilmiş, yapay zeka destekli kitap öneri sistemi.
        </p>
        
        {!isLogin && (
          <input 
            className="input-field" 
            placeholder="Ad Soyad" 
            onChange={e => setName(e.target.value)} 
          />
        )}
        <input 
          className="input-field" 
          placeholder="E-posta" 
          onChange={e => setEmail(e.target.value)} 
        />
        <input 
          className="input-field" 
          type="password" 
          placeholder="Şifre" 
          onChange={e => setPass(e.target.value)} 
        />
        
        <button 
          className="primary-btn" 
          onClick={() => onAuth(isLogin ? "login" : "register", email, pass, name)}
        >
          {isLogin ? "Giriş Yap" : "Kayıt Ol"}
        </button>
        
        <p className="toggle-text" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap"}
        </p>
      </div>
    </div>
  );
}

// Yıldız Bileşeni (Fare hareketlerini doğru algılar)
function StarRating({ onRate }) {
  const [hover, setHover] = useState(0); // Fare hangi yıldızın üzerinde?

  return (
    <div className="star-rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="star"
          // Eğer yıldızın numarası, fareyle gelinen numaradan küçük veya eşitse SARI yap
          style={{ color: star <= hover ? "#f1c40f" : "#bdc3c7" }}
          onMouseEnter={() => setHover(star)}
          onClick={() => onRate(star)}
          title={`${star} Puan Ver`}
        >
          ★
        </span>
      ))}
    </div>
  );
}
// 3. Ana Sayfa (HomeView) - Arama ve Öneriler
function HomeView({ user }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Kitap Arama (UC-4)
  const searchBooks = async () => {
    if (!query) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/books/search?query=${query}`);
    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  // GÜNCELLENDİ: Puan Verme (UC-2) - Artık puanı (score) parametre olarak alıyor
  const rateBook = async (book, score) => {
    try {
      await fetch(`${API_URL}/books/${book.book_id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.uid, 
          rating: score,  // Tıklanan yıldız değeri buraya geliyor
          book_title: book.title,
          review: "" // İstersen buraya inceleme metni de ekletebiliriz
        })
      });
      alert(`"${book.title}" için ${score} yıldız kaydedildi! ⭐`);
    } catch (error) {
      alert("Puanlama sırasında hata oluştu.");
    }
  };

  // Öneri Getirme (UC-3)
  const getRecs = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/books/users/${user.uid}/recommendations`);
    const data = await res.json();
    setRecs(data);
    setLoading(false);
  };

  // Yıldızları Oluşturan Yardımcı Fonksiyon
  const renderStars = (book) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className="star"
            onClick={() => rateBook(book, star)}
            title={`${star} Puan Ver`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="view-container">
      <div className="hero-section">
        <h1>Merhaba, {user.display_name || "Okur"}! 👋</h1>
        <p>Bugün ne keşfetmek istersin?</p>
        
        <div className="search-bar">
          <input 
            placeholder="Kitap adı veya yazar ara... (Örn: Harry Potter)" 
            onChange={e => setQuery(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && searchBooks()}
          />
          <button onClick={searchBooks}>🔍 Ara</button>
        </div>
      </div>

      <div className="content-grid">
        {/* Sol Panel: Arama Sonuçları */}
        <div className="card-panel">
          <h3>🔍 Arama Sonuçları</h3>
          {results.length === 0 && !loading && <p className="empty-text">Arama yapmak için yukarıyı kullanın.</p>}
          
          <div className="book-list">
            {results.map(b => (
              <div key={b.book_id} className="book-item">
                <img 
                  src={b.image_url && b.image_url.length > 5 ? b.image_url : "https://via.placeholder.com/50x75?text=No+Img"} 
                  alt={b.title} 
                  className="book-cover-img" 
                />
                
                <div className="book-info">
                  <strong>{b.title}</strong>
                  <span>{b.author}</span>
                  <span style={{fontSize: '0.8rem', color: '#888'}}>{b.year}</span>
                  
                  <div style={{marginTop: '5px'}}>
                    <span style={{fontSize:'0.8rem', color:'#555', marginRight:'5px'}}>Puanla:</span>
                    {/* Yeni Bileşeni Burada Kullanıyoruz */}
                    <StarRating onRate={(score) => rateBook(b, score)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Panel: Öneriler */}
        <div className="card-panel">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
            <h3>✨ Sana Özel Öneriler</h3>
            <button className="secondary-btn" onClick={getRecs}>Yenile ↻</button>
          </div>
          
          {recs.length === 0 && !loading && <p className="empty-text">Öneri almak için sol taraftan kitapları puanlayın.</p>}

          <div className="book-list">
            {recs.map((b, i) => (
              <div key={i} className="book-item recommend-item">
                 <img 
                  src={b.image_url && b.image_url.length > 5 ? b.image_url : "https://via.placeholder.com/50x75?text=No+Img"} 
                  alt={b.title} 
                  className="book-cover-img" 
                />
                <div className="book-info">
                  <strong>{b.title}</strong>
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

// 4. Profil Sayfası (ProfileView)
function ProfileView({ user }) {
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    async function fetchRatings() {
      try {
        const res = await fetch(`${API_URL}/books/users/${user.uid}/ratings`);
        const data = await res.json();
        setRatings(data);
      } catch (e) { console.error("Ratingler çekilemedi"); }
    }
    fetchRatings();
  }, [user.uid]);

  return (
    <div className="view-container">
      <div className="profile-header">
        <div className="avatar">
          {user.display_name ? user.display_name[0].toUpperCase() : "U"}
        </div>
        <h2>{user.display_name || user.email}</h2>
        <p>{user.email}</p>
      </div>

      <div className="card-panel full-width">
        <h3>📚 Okuma Geçmişim ve Puanlarım</h3>
        {ratings.length === 0 ? (
          <p className="empty-text">Henüz hiç kitap puanlamadınız. Ana sayfaya gidip kitap arayabilirsiniz.</p>
        ) : (
          <table className="ratings-table">
            <thead>
              <tr>
                <th>Kitap Adı</th>
                <th>Puan</th>
                <th>İnceleme</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((r, i) => (
                <tr key={i}>
                  <td style={{fontWeight:'500'}}>{r.book_title}</td>
                  <td style={{color:'#f1c40f'}}>{'★'.repeat(r.rating)}</td>
                  <td>{r.review || "-"}</td>
                  <td style={{color:'#777', fontSize:'0.9rem'}}>
                    {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "Bugün"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;