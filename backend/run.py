from app import create_app
import subprocess
import os
import sys

app = create_app()

def start_frontend():
    """Frontend'i başlat"""
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    
    # Frontend klasörünün varlığını kontrol et
    if not os.path.exists(frontend_path):
        print("Frontend klasörü bulunamadı!")
        return None
    
    try:
        # npm start komutunu çalıştır
        print("Frontend başlatılıyor...")
        process = subprocess.Popen(
            ['npm', 'start'],
            cwd=frontend_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False
        )
        print("Frontend başlatıldı (port 3000)")
        return process
    except Exception as e:
        print(f"Frontend başlatılırken hata: {e}")
        return None

if __name__ == '__main__':
    # Frontend'i başlat
    frontend_process = start_frontend()
    
    try:
        # Backend'i başlat
        print("Backend başlatılıyor (port 5000)...")
        app.run(debug=True, port=5000, use_reloader=False)
    except KeyboardInterrupt:
        print("\nUygulama kapatılıyor...")
        if frontend_process:
            frontend_process.terminate()
        sys.exit(0)