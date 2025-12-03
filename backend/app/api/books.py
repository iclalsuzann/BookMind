import pandas as pd  # <--- BU SATIRI EKLEMELİSİN
from flask import Blueprint, request, jsonify
from app.ml.recommender import recommender_engine
from firebase_admin import firestore
import datetime
import random
from collections import Counter

books_bp = Blueprint('books', __name__)

# UC-4: Search Books (Değişmedi)
@books_bp.route('/search', methods=['GET'])
def search_books():
    query = request.args.get('query', '').lower()
    all_books = recommender_engine.books_data.to_dict('records')
    results = [b for b in all_books if query in str(b['title']).lower() or query in str(b['author']).lower()]
    return jsonify(results[:20]), 200

# Sadece rate_book fonksiyonunu değiştirmen yeterli:
# backend/app/api/books.py içindeki rate_book fonksiyonu (GÜNCELLENDİ)

@books_bp.route('/<book_id>/rate', methods=['POST'])
def rate_book(book_id):
    data = request.json
    user_id = data.get('user_id')
    
    db = firestore.client()
    
    # Kullanıcı adını çek
    user_ref = db.collection('users').document(user_id).get()
    current_username = "Anonim"
    if user_ref.exists:
        user_info = user_ref.to_dict()
        current_username = user_info.get('username', 'Anonim')

    rating_data = {
        "user_id": user_id,
        "book_id": str(book_id), # String olduğundan emin olalım
        "rating": data.get('rating'),
        "review": data.get('review', ''),
        "book_title": data.get('book_title', 'Unknown Book'),
        "display_name": current_username,
        "timestamp": datetime.datetime.now()
    }

    # KONTROL: Bu kullanıcı bu kitabı daha önce puanlamış mı?
    existing_query = db.collection('ratings') \
        .where('user_id', '==', user_id) \
        .where('book_id', '==', str(book_id)) \
        .stream()
    
    existing_doc_id = None
    for doc in existing_query:
        existing_doc_id = doc.id
        break
    
    if existing_doc_id:
        # Varsa GÜNCELLE (Update)
        db.collection('ratings').document(existing_doc_id).set(rating_data, merge=True)
        print("Mevcut puan güncellendi.")
    else:
        # Yoksa YENİ EKLE (Add)
        db.collection('ratings').add(rating_data)
        print("Yeni puan eklendi.")
    
    return jsonify({"success": True}), 200

# GÜNCELLENDİ: Topluluk Akışı (ID eklendi)
@books_bp.route('/ratings/recent', methods=['GET'])
def get_recent_ratings():
    db = firestore.client()
    ratings_ref = db.collection('ratings').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20).stream()
    
    results = []
    for doc in ratings_ref:
        data = doc.to_dict()
        data['id'] = doc.id  # <-- ÖNEMLİ: Doküman ID'sini ekliyoruz
        results.append(data)
    return jsonify(results), 200

# GÜNCELLENDİ: Bir Kitabın Yorumları (ID eklendi)
@books_bp.route('/<book_id>/reviews', methods=['GET'])
def get_book_reviews(book_id):
    db = firestore.client()
    ratings_ref = db.collection('ratings').where('book_id', '==', str(book_id)).stream()
    
    results = []
    for doc in ratings_ref:
        data = doc.to_dict()
        data['id'] = doc.id # <-- ÖNEMLİ: Doküman ID'sini ekliyoruz
        results.append(data)
    
    results.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return jsonify(results), 200

# Kullanıcı Puanları 
@books_bp.route('/users/<user_id>/ratings', methods=['GET'])
def get_user_ratings(user_id):
    db = firestore.client()
    ratings_ref = db.collection('ratings').where('user_id', '==', user_id).stream()
    
    # Veri setine erişmek için (Resim URL'lerini buradan alacağız)
    df = recommender_engine.books_data
    
    results = []
    for doc in ratings_ref:
        rating_data = doc.to_dict()
        book_id = rating_data.get('book_id')
        
        # Veri setinden bu kitabın resmini bulmaya çalış
        # (Veritabanında resim URL'i kayıtlı olmadığı için buradan eşleştiriyoruz)
        try:
            # ID'yi string yaparak ara
            match = df[df['book_id'].astype(str) == str(book_id)]
            if not match.empty:
                rating_data['image_url'] = match.iloc[0]['image_url']
            else:
                rating_data['image_url'] = None # Bulunamazsa boş kalsın
        except Exception:
            rating_data['image_url'] = None

        results.append(rating_data)
    
    results.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return jsonify(results), 200


@books_bp.route('/users/<user_id>/recommendations', methods=['GET'])
def get_recommendations(user_id):
    db = firestore.client()
    ratings_ref = db.collection('ratings').where('user_id', '==', user_id).stream()
    
    user_ratings = [doc.to_dict() for doc in ratings_ref]
    
    # 1. Okunanları listele (Tekrar önermemek için)
    read_book_titles = {r.get('book_title') for r in user_ratings}

    # 2. Kitapları Puanlarına Göre Ayır
    five_star_books = [r for r in user_ratings if r.get('rating', 0) == 5]
    four_star_books = [r for r in user_ratings if r.get('rating', 0) == 4]
    
    # Listeleri tarihe göre sırala (En yeni en üstte)
    five_star_books.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    four_star_books.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

    recommendations = []
    
    # Eğer hiç beğenilen yoksa (Soğuk Başlangıç)
    if not five_star_books and not four_star_books:
        recommendations = recommender_engine.get_popular_books(n=10)
    else:
        seed_books = []
        
        # --- AĞIRLIKLI TOHUM SEÇİMİ (STRATEJİ) ---
        # Hedefimiz analiz için toplam ~10 kitap seçmek.
        # Öncelik: 5 yıldızlılar. Yer kalırsa: 4 yıldızlılar.
        
        # Adım A: 5 Yıldızlılardan en fazla 7 tane al (En yenilerden veya rastgele)
        if len(five_star_books) > 7:
             seed_books.extend(random.sample(five_star_books, 7))
        else:
             seed_books.extend(five_star_books)
        
        # Adım B: Kalan kontenjanı (toplam 10'a tamamlayacak şekilde) 4 yıldızlılardan doldur
        slots_left = 10 - len(seed_books)
        if slots_left > 0 and four_star_books:
            if len(four_star_books) > slots_left:
                seed_books.extend(random.sample(four_star_books, slots_left))
            else:
                seed_books.extend(four_star_books)
        
        # --- AĞIRLIKLI BENZERLİK ARAMASI ---
        raw_recs = []
        for book in seed_books:
            title = book.get('book_title')
            rating = book.get('rating', 0)
            
            # STRATEJİ: 5 yıldız verdiyse daha fazla benzer kitap getir (Daha baskın olsun)
            # 5 Puan -> 5 Benzer Kitap getir
            # 4 Puan -> 2 Benzer Kitap getir
            limit = 5 if rating == 5 else 2
            
            similars = recommender_engine.get_recommendations(title)
            
            # Okunanları çıkar ve limite göre ekle
            count = 0
            for rec in similars:
                if rec['title'] not in read_book_titles:
                    raw_recs.append(rec)
                    count += 1
                    if count >= limit: break
        
        # --- FREKANS ANALİZİ ---
        # Hangi kitap önerisi kaç kere geçti? (Hem Harry Potter'a hem Yüzüklerin Efendisi'ne benzeyenler öne çıksın)
        rec_counter = Counter([b['title'] for b in raw_recs])
        unique_recs_map = {b['title']: b for b in raw_recs}
        
        # En çok tekrar edenden aza doğru sırala
        sorted_titles = [title for title, count in rec_counter.most_common()]
        recommendations = [unique_recs_map[title] for title in sorted_titles]

    # Yetersiz kalırsa popüler ekle
    if len(recommendations) < 5:
        recommendations.extend(recommender_engine.get_popular_books(n=5))

    return jsonify(recommendations[:12]), 200

# backend/app/api/books.py içindeki get_book_details fonksiyonu

@books_bp.route('/<book_id>/details', methods=['GET'])
def get_book_details(book_id):
    # Pandas DataFrame'i al
    df = recommender_engine.books_data
    
    # DÜZELTME BURADA:
    # Hem veritabanındaki 'book_id'yi hem de gelen 'book_id'yi string'e (yazıya) çevirip karşılaştırıyoruz.
    # Böylece int/str uyuşmazlığı ortadan kalkar.
    book_row = df[df['book_id'].astype(str) == str(book_id)]
    
    if book_row.empty:
        return jsonify({"error": "Kitap bulunamadı"}), 404
        
    # İlk eşleşen satırı al ve sözlüğe çevir
    book_info = book_row.iloc[0].to_dict()
    
    # NaN (Boş) değerleri temizle
    clean_info = {k: (v if pd.notna(v) else "Bilgi Yok") for k, v in book_info.items()}
    
    return jsonify(clean_info), 200

# YENİ: Benzer Kitaplar Endpoint
@books_bp.route('/<book_id>/similar', methods=['GET'])
def get_similar_books(book_id):
    """Belirli bir kitaba benzer kitapları döndürür"""
    df = recommender_engine.books_data
    
    # Kitabı bul
    book_row = df[df['book_id'].astype(str) == str(book_id)]
    
    if book_row.empty:
        return jsonify({"error": "Kitap bulunamadı"}), 404
    
    # Kitap başlığını al
    book_title = book_row.iloc[0]['title']
    
    # Öneri motorunu kullanarak benzer kitapları al
    similar_books = recommender_engine.get_recommendations(book_title)
    
    # NaN değerlerini temizle
    clean_books = []
    for book in similar_books:
        clean_book = {k: (v if pd.notna(v) else "Bilgi Yok") for k, v in book.items()}
        clean_books.append(clean_book)
    
    return jsonify(clean_books), 200

# YENİ: Yorumu Beğen / Beğenmekten Vazgeç (Toggle Like)
@books_bp.route('/ratings/<rating_id>/like', methods=['POST'])
def like_rating(rating_id):
    user_id = request.json.get('user_id')
    db = firestore.client()
    
    rating_ref = db.collection('ratings').document(rating_id)
    doc = rating_ref.get()
    
    if not doc.exists:
        return jsonify({"error": "Yorum bulunamadı"}), 404
        
    data = doc.to_dict()
    liked_by = data.get('liked_by', []) # Beğenenlerin listesi (Array)
    
    if user_id in liked_by:
        # Zaten beğenmiş -> Çıkar (Unlike)
        liked_by.remove(user_id)
        action = "unliked"
    else:
        # Beğenmemiş -> Ekle (Like)
        liked_by.append(user_id)
        action = "liked"
        
    rating_ref.update({'liked_by': liked_by})
    
    return jsonify({"success": True, "action": action, "likes_count": len(liked_by)}), 200
