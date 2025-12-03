import pandas as pd
from flask import Blueprint, request, jsonify
from app.ml.recommender import recommender_engine
from firebase_admin import firestore
import datetime
import random
from collections import Counter

books_bp = Blueprint('books', __name__)

@books_bp.route('/search', methods=['GET'])
def search_books():
    query = request.args.get('query', '').lower()
    
    try:
        df = recommender_engine.books_data
        # Filter books where title or author contains the query
        results = df[df['title'].str.contains(query, case=False, na=False) | 
                     df['author'].str.contains(query, case=False, na=False)].head(20)
        
        books = []
        for _, row in results.iterrows():
            books.append({
                "book_id": str(row['book_id']),
                "title": row['title'],
                "author": row['author'],
                "year": row['year'],
                "publisher": row['publisher'],
                "image_url": row['image_url']
            })
        return jsonify(books), 200
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify([]), 200

@books_bp.route('/<book_id>/rate', methods=['POST'])
def rate_book(book_id):
    data = request.json
    user_id = data.get('user_id')
    
    db = firestore.client()
    
    user_ref = db.collection('users').document(user_id).get()
    current_username = "Anonymous"  # Changed from "Anonim"
    if user_ref.exists:
        user_info = user_ref.to_dict()
        current_username = user_info.get('username', 'Anonymous')

    rating_data = {
        "user_id": user_id,
        "book_id": str(book_id),
        "rating": data.get('rating'),
        "review": data.get('review', ''),
        "book_title": data.get('book_title', 'Unknown Book'),
        "display_name": current_username,
        "timestamp": datetime.datetime.now(),
        "liked_by": [] 
    }

    # Check if rating exists
    existing_query = db.collection('ratings') \
        .where('user_id', '==', user_id) \
        .where('book_id', '==', str(book_id)) \
        .stream()
    
    existing_doc_id = None
    for doc in existing_query:
        existing_doc_id = doc.id
        break
    
    if existing_doc_id:
        # Update existing
        db.collection('ratings').document(existing_doc_id).set(rating_data, merge=True)     
        db.collection('users').document(user_id).collection('ratings').document(str(book_id)).set(rating_data, merge=True)
    else:
        # Create new
        doc_ref = db.collection('ratings').add(rating_data)
        db.collection('users').document(user_id).collection('ratings').document(str(book_id)).set(rating_data)
    
    return jsonify({"success": True}), 200

@books_bp.route('/ratings/recent', methods=['GET'])
def get_recent_ratings():
    db = firestore.client()
    ratings_ref = db.collection('ratings').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20).stream()
    
    df = recommender_engine.books_data

    results = []
    for doc in ratings_ref:
        data = doc.to_dict()
        data['id'] = doc.id
        
        book_id = data.get('book_id')
        try:
            match = df[df['book_id'].astype(str) == str(book_id)]
            if not match.empty:
                data['image_url'] = match.iloc[0]['image_url']
            else:
                data['image_url'] = None
        except Exception:
            data['image_url'] = None

        results.append(data)
        
    return jsonify(results), 200

@books_bp.route('/<book_id>/reviews', methods=['GET'])
def get_book_reviews(book_id):
    db = firestore.client()
    ratings_ref = db.collection('ratings').where('book_id', '==', str(book_id)).stream()
    
    results = []
    for doc in ratings_ref:
        data = doc.to_dict()
        data['id'] = doc.id
        results.append(data)
    
    results.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return jsonify(results), 200

@books_bp.route('/users/<user_id>/ratings', methods=['GET'])
def get_user_ratings(user_id):
    db = firestore.client()

    ratings_ref = db.collection('ratings').where('user_id', '==', user_id).stream()
    
    df = recommender_engine.books_data
    
    results = []
    for doc in ratings_ref:
        rating_data = doc.to_dict()
        book_id = rating_data.get('book_id')
        
        try:
            match = df[df['book_id'].astype(str) == str(book_id)]
            if not match.empty:
                rating_data['image_url'] = match.iloc[0]['image_url']
            else:
                rating_data['image_url'] = None
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
    read_book_titles = {r.get('book_title') for r in user_ratings}

    five_star_books = [r for r in user_ratings if r.get('rating', 0) == 5]
    four_star_books = [r for r in user_ratings if r.get('rating', 0) == 4]
    
    five_star_books.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    four_star_books.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

    recommendations = []
    
    if not five_star_books and not four_star_books:
        recommendations = recommender_engine.get_popular_books(n=10)
    else:
        seed_books = []
        if len(five_star_books) > 7:
             seed_books.extend(random.sample(five_star_books, 7))
        else:
             seed_books.extend(five_star_books)
        
        slots_left = 10 - len(seed_books)
        if slots_left > 0 and four_star_books:
            if len(four_star_books) > slots_left:
                seed_books.extend(random.sample(four_star_books, slots_left))
            else:
                seed_books.extend(four_star_books)
        
        raw_recs = []
        for book in seed_books:
            title = book.get('book_title')
            rating = book.get('rating', 0)
            limit = 5 if rating == 5 else 2
            
            similars = recommender_engine.get_recommendations(title)
            
            count = 0
            for rec in similars:
                if rec['title'] not in read_book_titles:
                    raw_recs.append(rec)
                    count += 1
                    if count >= limit: break
        
        rec_counter = Counter([b['title'] for b in raw_recs])
        unique_recs_map = {b['title']: b for b in raw_recs}
        
        sorted_titles = [title for title, count in rec_counter.most_common()]
        recommendations = [unique_recs_map[title] for title in sorted_titles]

    if len(recommendations) < 5:
        recommendations.extend(recommender_engine.get_popular_books(n=5))

    return jsonify(recommendations[:12]), 200

@books_bp.route('/<book_id>/details', methods=['GET'])
def get_book_details(book_id):
    df = recommender_engine.books_data
    book_row = df[df['book_id'].astype(str) == str(book_id)]
    
    if book_row.empty:
        return jsonify({"error": "Book not found"}), 404  # Changed from "Kitap bulunamadı"
        
    book_info = book_row.iloc[0].to_dict()
    # Changed from "Bilgi Yok"
    clean_info = {k: (v if pd.notna(v) else "No Information Available") for k, v in book_info.items()}
    
    return jsonify(clean_info), 200

@books_bp.route('/<book_id>/similar', methods=['GET'])
def get_similar_books(book_id):
    df = recommender_engine.books_data
    book_row = df[df['book_id'].astype(str) == str(book_id)]
    
    if book_row.empty:
        return jsonify({"error": "Book not found"}), 404 # Changed from "Kitap bulunamadı"
    
    book_title = book_row.iloc[0]['title']
    similar_books = recommender_engine.get_recommendations(book_title)
    
    clean_books = []
    for book in similar_books:
        # Changed from "Bilgi Yok"
        clean_book = {k: (v if pd.notna(v) else "No Information Available") for k, v in book.items()}
        clean_books.append(clean_book)
    
    return jsonify(clean_books), 200

@books_bp.route('/ratings/<rating_id>/like', methods=['POST'])
def like_rating(rating_id):
    user_id = request.json.get('user_id')
    db = firestore.client()
    
    rating_ref = db.collection('ratings').document(rating_id)
    doc = rating_ref.get()
    
    if not doc.exists:
        return jsonify({"error": "Rating not found"}), 404 # Changed from "Yorum bulunamadı"
        
    data = doc.to_dict()
    liked_by = data.get('liked_by', [])
    
    if user_id in liked_by:
        liked_by.remove(user_id)
        action = "unliked"
    else:
        liked_by.append(user_id)
        action = "liked"
        
    rating_ref.update({'liked_by': liked_by})
    
    return jsonify({"success": True, "action": action, "likes_count": len(liked_by)}), 200

@books_bp.route('/<book_id>/wishlist/toggle', methods=['POST'])
def toggle_wishlist(book_id):
    data = request.json
    user_id = data.get('user_id')
    book_title = data.get('book_title')
    image_url = data.get('image_url')

    db = firestore.client()
    wishlist_ref = db.collection('users').document(user_id).collection('wishlist').document(str(book_id))
    doc = wishlist_ref.get()
    
    if doc.exists:
        wishlist_ref.delete()
        return jsonify({"status": "removed", "message": "Removed from Reading List"}), 200
    else:
        wishlist_ref.set({
            "book_id": str(book_id),
            "book_title": book_title,
            "image_url": image_url,
            "added_at": firestore.SERVER_TIMESTAMP
        })
        return jsonify({"status": "added", "message": "Added to Reading List"}), 200

@books_bp.route('/users/<user_id>/wishlist', methods=['GET'])
def get_user_wishlist(user_id):
    db = firestore.client()
    docs = db.collection('users').document(user_id).collection('wishlist').order_by('added_at', direction=firestore.Query.DESCENDING).stream()
    wishlist = []
    for doc in docs:
        wishlist.append(doc.to_dict())
    return jsonify(wishlist), 200

@books_bp.route('/<book_id>/wishlist/check', methods=['GET'])
def check_wishlist_status(book_id):
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"in_wishlist": False}), 200
        
    db = firestore.client()
    doc = db.collection('users').document(user_id).collection('wishlist').document(str(book_id)).get()
    return jsonify({"in_wishlist": doc.exists}), 200

@books_bp.route('/<book_id>/rate', methods=['DELETE'])
def delete_rating(book_id):
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID required"}), 400 # Changed from "User ID gerekli"

    db = firestore.client()

    main_docs = db.collection('ratings') \
        .where('user_id', '==', user_id) \
        .where('book_id', '==', str(book_id)) \
        .stream()
    
    for doc in main_docs:
        doc.reference.delete()

    db.collection('users').document(user_id).collection('ratings').document(str(book_id)).delete()

    return jsonify({"success": True, "message": "Rating deleted successfully"}), 200