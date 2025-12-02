from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
import os

def create_app():
    app = Flask(__name__)
    CORS(app)  # Frontend (Port 3000) erişimine izin ver

    # Firebase Başlatma - Mutlak dosya yolu kullan
    try:
        # __file__ içeren dizini al (app klasörü)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        service_account_path = os.path.join(base_dir, "serviceAccountKey.json")
        
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        print("[INFO] Firebase Connected Successfully.")
    except Exception as e:
        print(f"[WARNING] Firebase not connected. Using Mock Data. Error: {e}")

    # Blueprint'leri kaydet
    from app.api.auth import auth_bp
    from app.api.books import books_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(books_bp, url_prefix='/api/books')

    # Root endpoint (Test için)
    @app.route('/')
    def home():
        return jsonify({
            "message": "BookMind API is running! ✨",
            "endpoints": {
                "auth": "/api/auth/login",
                "books": "/api/books/search?query=harry"
            }
        })

    return app