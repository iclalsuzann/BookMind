from flask import Blueprint, request, jsonify
from firebase_admin import firestore
import uuid

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    display_name = data.get('display_name')

    # Firebase Firestore Bağlantısı
    db = firestore.client()
    users_ref = db.collection('users')

    # Kullanıcı zaten var mı kontrol et
    query = users_ref.where('email', '==', email).stream()
    if any(query):
        return jsonify({"error": "User already exists"}), 400

    # Yeni kullanıcı oluştur
    user_id = str(uuid.uuid4())
    user_data = {
        "uid": user_id,
        "email": email,
        "password": password, # Not: Gerçek projede şifre hashlenmeli!
        "display_name": display_name
    }
    
    # [cite_start]Firestore'a kaydet (Bu kısım veriyi buluta yazar) [cite: 564]
    users_ref.document(user_id).set(user_data)
    
    return jsonify({"message": "User registered", "uid": user_id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    db = firestore.client()
    # Firestore'da kullanıcıyı ara
    users = db.collection('users').where('email', '==', email).stream()
    
    target_user = None
    for doc in users:
        target_user = doc.to_dict()
        break
    
    if target_user and target_user['password'] == password:
        return jsonify({
            "token": f"firebase-token-{target_user['uid']}",
            "uid": target_user['uid'],
            "display_name": target_user.get('display_name', email)
        }), 200
    
    return jsonify({"error": "Invalid credentials"}), 401