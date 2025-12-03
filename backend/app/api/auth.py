from flask import Blueprint, request, jsonify
from firebase_admin import firestore
import uuid

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')  # Artık username alıyoruz

    if not username:
        return jsonify({"error": "Kullanıcı adı zorunludur."}), 400

    db = firestore.client()
    users_ref = db.collection('users')

    # 1. E-posta Kontrolü (Zaten var mı?)
    email_query = users_ref.where('email', '==', email).stream()
    if any(email_query):
        return jsonify({"error": "Bu e-posta adresi zaten kayıtlı."}), 400

    # 2. KULLANICI ADI KONTROLÜ (Benzersiz mi?)
    username_query = users_ref.where('username', '==', username).stream()
    if any(username_query):
        return jsonify({"error": "Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane seçin."}), 400

    # 3. Kayıt İşlemi
    user_id = str(uuid.uuid4())
    user_data = {
        "uid": user_id,
        "email": email,
        "password": password,
        "username": username  # display_name yerine username kaydediyoruz
    }
    
    users_ref.document(user_id).set(user_data)
    
    return jsonify({"message": "Kayıt başarılı", "uid": user_id}), 201

# backend/app/api/auth.py içindeki login fonksiyonu:

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username') # Artık username bekliyoruz
    password = data.get('password')

    db = firestore.client()
    
    # E-posta yerine 'username' alanına göre sorgu atıyoruz
    users = db.collection('users').where('username', '==', username).stream()
    
    target_user = None
    for doc in users:
        target_user = doc.to_dict()
        break
    
    if target_user and target_user['password'] == password:
        return jsonify({
            "token": f"firebase-token-{target_user['uid']}",
            "uid": target_user['uid'],
            "username": target_user.get('username'),
            "email": target_user.get('email')
        }), 200
    
    return jsonify({"error": "Hatalı kullanıcı adı veya şifre."}), 401

@auth_bp.route('/user/<user_id>', methods=['GET'])
def get_user_info(user_id):
    db = firestore.client()
    user_ref = db.collection('users').document(user_id).get()
    
    if user_ref.exists:
        user_data = user_ref.to_dict()
        
        # Takipçi ve takip edilen sayılarını hesapla
        followers_count = len(list(db.collection('followers').document(user_id).collection('user_followers').stream()))
        following_count = len(list(db.collection('following').document(user_id).collection('user_following').stream()))
        
        safe_data = {
            "uid": user_data['uid'],
            "username": user_data.get('username', 'Bilinmeyen Kullanıcı'),
            "email": user_data.get('email'),
            "followers_count": followers_count,
            "following_count": following_count
        }
        return jsonify(safe_data), 200
    return jsonify({"error": "Kullanıcı bulunamadı"}), 404

# Takip Et
@auth_bp.route('/follow', methods=['POST'])
def follow_user():
    data = request.json
    follower_id = data.get('follower_id')  # Takip eden kişi
    following_id = data.get('following_id')  # Takip edilen kişi
    
    if follower_id == following_id:
        return jsonify({"error": "Kendinizi takip edemezsiniz."}), 400
    
    db = firestore.client()
    
    # Follower'ın following listesine ekle
    db.collection('following').document(follower_id).collection('user_following').document(following_id).set({
        "followed_at": firestore.SERVER_TIMESTAMP
    })
    
    # Following'in followers listesine ekle
    db.collection('followers').document(following_id).collection('user_followers').document(follower_id).set({
        "followed_at": firestore.SERVER_TIMESTAMP
    })
    
    return jsonify({"message": "Takip başarılı"}), 200

# Takipten Çık
@auth_bp.route('/unfollow', methods=['POST'])
def unfollow_user():
    data = request.json
    follower_id = data.get('follower_id')
    following_id = data.get('following_id')
    
    db = firestore.client()
    
    # Follower'ın following listesinden çıkar
    db.collection('following').document(follower_id).collection('user_following').document(following_id).delete()
    
    # Following'in followers listesinden çıkar
    db.collection('followers').document(following_id).collection('user_followers').document(follower_id).delete()
    
    return jsonify({"message": "Takipten çıkıldı"}), 200

# Takip Durumu Kontrolü
@auth_bp.route('/is_following', methods=['GET'])
def check_following():
    follower_id = request.args.get('follower_id')
    following_id = request.args.get('following_id')
    
    db = firestore.client()
    doc = db.collection('following').document(follower_id).collection('user_following').document(following_id).get()
    
    return jsonify({"is_following": doc.exists}), 200

# Takipçi Listesi
@auth_bp.route('/user/<user_id>/followers', methods=['GET'])
def get_followers(user_id):
    db = firestore.client()
    followers_ref = db.collection('followers').document(user_id).collection('user_followers').stream()
    
    followers = []
    for doc in followers_ref:
        follower_id = doc.id
        user_doc = db.collection('users').document(follower_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            followers.append({
                "uid": follower_id,
                "username": user_data.get('username', 'Unknown')
            })
    
    return jsonify(followers), 200

# Takip Edilenler Listesi
@auth_bp.route('/user/<user_id>/following', methods=['GET'])
def get_following(user_id):
    db = firestore.client()
    following_ref = db.collection('following').document(user_id).collection('user_following').stream()
    
    following = []
    for doc in following_ref:
        following_id = doc.id
        user_doc = db.collection('users').document(following_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            following.append({
                "uid": following_id,
                "username": user_data.get('username', 'Unknown')
            })
    
    return jsonify(following), 200