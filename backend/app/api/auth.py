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
        safe_data = {
            "uid": user_data['uid'],
            "username": user_data.get('username', 'Bilinmeyen Kullanıcı'),
            "email": user_data.get('email')
        }
        return jsonify(safe_data), 200
    return jsonify({"error": "Kullanıcı bulunamadı"}), 404