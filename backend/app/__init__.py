from flask import Flask
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials

def create_app():
    app = Flask(__name__)
    CORS(app)  # Frontend (Port 3000) erişimine izin ver

    # Firebase Başlatma (Gerçek bir serviceAccountKey.json dosyası gerektirir)
    # Eğer dosya yoksa, mock (sahte) modda çalıştığını varsayıyoruz.
    try:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        print("[INFO] Firebase Connected Successfully.")
    except Exception as e:
        print(f"[WARNING] Firebase not connected. Using Mock Data. Error: {e}")

    # Blueprint'leri kaydet
    from app.api.auth import auth_bp
    from app.api.books import books_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(books_bp, url_prefix='/api/books')

    return app