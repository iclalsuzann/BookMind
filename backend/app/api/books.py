from flask import Blueprint, request, jsonify
from app.ml.recommender import recommender_engine
from firebase_admin import firestore
import datetime
import random

books_bp = Blueprint('books', __name__)

# UC-4: Search Books
@books_bp.route('/search', methods=['GET'])
def search_books():
    query = request.args.get('query', '').lower()
    all_books = recommender_engine.books_data.to_dict('records')
    # Basit arama (Başlık veya Yazar)
    results = [b for b in all_books if query in str(b['title']).lower() or query in str(b['author']).lower()]
    return jsonify(results[:20]), 200

# UC-2: Rate Book
@books_bp.route('/<book_id>/rate', methods=['POST'])
def rate_book(book_id):
    data = request.json
    user_id = data.get('user_id')
    
    rating_data = {
        "user_id": user_id,
        "book_id": book_id,
        "rating": data.get('rating'),
        "review": data.get('review', ''),
        "book_title": data.get('book_title', 'Unknown Book'),
        "timestamp": datetime.datetime.now()
    }

    db = firestore.client()
    db.collection('ratings').add(rating_data)
    
    return jsonify({"success": True}), 200

# Profil: Kullanıcının Puanları
@books_bp.route('/users/<user_id>/ratings', methods=['GET'])
def get_user_ratings(user_id):
    db = firestore.client()
    ratings_ref = db.collection('ratings').where('user_id', '==', user_id).stream()
    
    results = []
    for doc in ratings_ref:
        data = doc.to_dict()
        # Timestamp sıralaması için string formatına gerekebilir ama şimdilik ham veri
        results.append(data)
    
    # Tarihe göre tersten sırala (En yeni en üstte)
    results.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return jsonify(results), 200

# UC-3: AKILLI ÖNERİ SİSTEMİ (GÜNCELLENDİ)
@books_bp.route('/users/<user_id>/recommendations', methods=['GET'])
def get_recommendations(user_id):
    db = firestore.client()
    ratings_ref = db.collection('ratings').where('user_id', '==', user_id).stream()
    
    user_ratings = [doc.to_dict() for doc in ratings_ref]
    
    # 1. Kullanıcının zaten okuduğu kitapların listesini çıkar (Tekrar önermemek için)
    read_book_titles = {r.get('book_title') for r in user_ratings}

    # 2. Sadece BEĞENİLEN kitapları filtrele (Puanı 4 veya 5 olanlar)
    liked_books = [r for r in user_ratings if r.get('rating', 0) >= 4]
    
    # Tarihe göre sırala (En yeniden eskiye)
    liked_books.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

    recommendations = []

    if not liked_books:
        # Soğuk Başlangıç: Hiç beğenisi yoksa rastgele popüler kitaplardan öner
        # (Recommender'a yeni ekleyeceğimiz fonksiyonu kullanacağız)
        recommendations = recommender_engine.get_popular_books(n=6)
    else:
        # 3. HİBRİT ÖNERİ: Son beğenilen 3 farklı kitaptan karışık öneri al
        # Sadece sonuncuyu alırsak "Harry Potter Loop"una gireriz.
        seed_books = liked_books[:3] 
        
        for book in seed_books:
            title = book.get('book_title')
            # Her bir sevilen kitap için 3 tane benzer kitap getir
            similars = recommender_engine.get_recommendations(title)
            
            # Zaten okuduklarını listeden ele
            filtered_similars = [
                b for b in similars 
                if b['title'] not in read_book_titles
            ]
            
            recommendations.extend(filtered_similars[:2]) # Her "seed" kitaptan 2 öneri al

        # 4. Listeyi Karıştır (Hep aynı yazar arka arkaya gelmesin)
        random.shuffle(recommendations)

    # Tekrar eden önerileri temizle (Unique)
    unique_recs = []
    seen_titles = set()
    for rec in recommendations:
        if rec['title'] not in seen_titles:
            unique_recs.append(rec)
            seen_titles.add(rec['title'])
            
    # Eğer filtrelemeler sonucu liste boş kalırsa yine popüler getir
    if not unique_recs:
         unique_recs = recommender_engine.get_popular_books(n=5)

    return jsonify(unique_recs[:10]), 200