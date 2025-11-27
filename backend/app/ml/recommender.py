import pandas as pd
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

class Recommender:
    def __init__(self):
        # Dosya yolunu belirle
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # backend/app/ml -> backend/data/Books.csv yoluna çık
        self.data_path = os.path.join(current_dir, '..', '..', 'data', 'Books.csv')
        
        print(f"Veri seti aranıyor: {self.data_path}")
        
        # 1. Veriyi Oku
        try:
            if not os.path.exists(self.data_path):
                raise FileNotFoundError("Dosya fiziksel olarak yok.")

            self.books_data = pd.read_csv(self.data_path, sep=',', on_bad_lines='skip', encoding="latin-1", low_memory=False)
            self.books_data = self.books_data.head(5000) # İlk 5000 kitap (Performans için)
            print("CSV dosyası başarıyla yüklendi.")
            
        except Exception as e:
            print(f"HATA: Veri dosyası okunamadı! Boş bir veri seti ile devam ediliyor. Hata: {e}")
            # Hata durumunda çökmemesi için gerekli TÜM sütunları içeren boş bir DataFrame oluştur
            self.books_data = pd.DataFrame(columns=[
                'ISBN', 'Book-Title', 'Book-Author', 'Year-Of-Publication', 'Publisher', 'Image-URL-M'
            ])

        # 2. Sütun İsimlerini Düzenle
        self.books_data.rename(columns={
            'ISBN': 'book_id',
            'Book-Title': 'title',
            'Book-Author': 'author',
            'Year-Of-Publication': 'year',
            'Publisher': 'publisher',
            'Image-URL-M': 'image_url'
        }, inplace=True)

        # book_id sütunundaki tüm verileri zorla String (Yazı) yap.
        self.books_data['book_id'] = self.books_data['book_id'].astype(str)
        
        # 3. Eksik Verileri Temizle
        if 'title' in self.books_data.columns:
            self.books_data['title'] = self.books_data['title'].fillna('')
        if 'author' in self.books_data.columns:
            self.books_data['author'] = self.books_data['author'].fillna('')
        if 'publisher' in self.books_data.columns:
            self.books_data['publisher'] = self.books_data['publisher'].fillna('')

        # 4. Modeli Eğit
        self._train_model()

    def _train_model(self):
        if self.books_data.empty:
            print("UYARI: Veri seti boş olduğu için model eğitilemedi.")
            self.cosine_sim = []
            return

        # İçerik tabanlı filtreleme için özellikleri birleştir
        self.books_data['combined_features'] = (
            self.books_data['title'] + " " + 
            self.books_data['author'] + " " + 
            self.books_data['publisher']
        )

        # TF-IDF Matrisini Oluştur
        tfidf = TfidfVectorizer(stop_words='english')
        try:
            tfidf_matrix = tfidf.fit_transform(self.books_data['combined_features'])
            self.cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)
            print(f"Model {len(self.books_data)} kitap ile başarıyla eğitildi!")
        except ValueError:
            print("Veri hatası nedeniyle model eğitilemedi.")
            self.cosine_sim = []

    def get_recommendations(self, liked_book_title):
        """
        Belirli bir kitaba benzer kitapları bulur.
        """
        if self.books_data.empty or liked_book_title not in self.books_data['title'].values:
            return []
        
        try:
            # Kitabın indexini bul
            idx = self.books_data.index[self.books_data['title'] == liked_book_title][0]
            
            # Benzerlik skorlarını hesapla
            sim_scores = list(enumerate(self.cosine_sim[idx]))
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
            
            # En benzer 5 kitabı al (kendisi hariç)
            sim_scores = sim_scores[1:6]
            
            book_indices = [i[0] for i in sim_scores]
            return self.books_data.iloc[book_indices].to_dict('records')
        except Exception as e:
            print(f"Öneri hatası: {e}")
            return []

    def get_popular_books(self, n=5):
        """
        Kullanıcının beğenisi yoksa veya veri yetersizse
        rastgele (veya veri setindeki popüler) kitapları döndürür.
        """
        if self.books_data.empty:
            return []
        
        try:
            # Rastgele n adet kitap getir
            return self.books_data.sample(n=n).to_dict('records')
        except ValueError:
            # Eğer istenen sayı (n) veri setinden büyükse hepsini döndür
            return self.books_data.to_dict('records')

recommender_engine = Recommender()