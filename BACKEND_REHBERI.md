# ATS Backend Çalıştırma ve Frontend Bağlantı Rehberi

## Backend Çalıştırma

### 1. Gereksinimler
- Java 17+ (OpenJDK veya Oracle)
- Maven 3.8+
- PostgreSQL 14+ (veya Docker ile çalıştırılabilir)

### 2. Veritabanı Kurulumu

#### Docker ile (Önerilen - En Hızlı)
```bash
docker run -d \
  --name ats-postgres \
  -e POSTGRES_DB=ats \
  -e POSTGRES_USER=ats_user \
  -e POSTGRES_PASSWORD=ats_password \
  -p 5432:5432 \
  postgres:15
```

#### Manuel Kurulum
```sql
CREATE DATABASE ats;
CREATE USER ats_user WITH PASSWORD 'ats_password';
GRANT ALL PRIVILEGES ON DATABASE ats TO ats_user;
```

### 3. Backend Projesini Klonlama
```bash
gh repo clone elifnurbeycan/ats-system
cd ats-system
```

### 4. Çevre Değişkenlerini Ayarlama

Proje kök dizininde `.env` dosyası oluşturun (veya doğrudan ortam değişkeni olarak ayarlayın):

```bash
# Linux/Mac
export DATABASE_URL="jdbc:postgresql://localhost:5432/ats"
export DATABASE_USERNAME="ats_user"
export DATABASE_PASSWORD="ats_password"
export JWT_SECRET="bu-cok-gizli-bir-anahtar-olmali-en-az-256-bit"
export JWT_ISSUER="ats-system"
export PLATFORM_ADMIN_EMAIL="admin@sirket.com"
export PLATFORM_ADMIN_PASSWORD="Admin123!"
export PLATFORM_ADMIN_FULL_NAME="Super Admin"
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
export SERVER_PORT=8080
```

### 5. Flyway Migration

Backend otomatik olarak Flyway migration'ları çalıştıracak. `src/main/resources/db/migration/` klasöründeki SQL dosyaları veritabanı şemasını oluşturacak.

### 6. Backend Başlatma
```bash
mvn spring-boot:run
```

Backend `http://localhost:8080` adresinde çalışmaya başlayacak.

### 7. İlk Giriş - JWT Token Al

Backend çalıştıktan sonra bir JWT token almanız gerekiyor. Bunu aşağıdaki endpoint ile yapın:

```bash
# Login endpoint (POST)
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sirket.com",
    "password": "Admin123!"
  }'
```

Dönen yanıtta `accessToken` değerini kopyalayın.

---

## Frontend Bağlantısı

### Yöntem 1: Environment Variable ile (Önerilen)

Frontend proje kök dizininde `.env` dosyası oluşturun:

```env
VITE_API_URL=http://localhost:8080/api/v1/companies/1
VITE_COMPANY_ID=1
```

Sonra frontend'i yeniden başlatın:
```bash
cd manus-ats-frontend
pnpm dev
```

### Yöntem 2: Doğrudan Tarayıcıda (Hızlı Test)

Frontend zaten `http://localhost:8080` adresine bağlanacak şekilde ayarlanmış. Backend çalışırken frontend'i açtığınızda otomatik olarak bağlantı kurulacak.

---

## API Endpoint'leri

Backend'in kullanıma hazır endpoint'leri:

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/v1/companies/{companyId}/dashboard/stats` | Dashboard istatistikleri |
| `GET /api/v1/companies/{companyId}/dashboard/stages` | Aşama dağılımı |
| `GET /api/v1/companies/{companyId}/dashboard/recent` | Son aday hareketleri |
| `GET /api/v1/companies/{companyId}/candidates` | Aday listesi |
| `GET /api/v1/companies/{companyId}/candidates/{candidateId}` | Aday detayı |
| `POST /api/v1/companies/{companyId}/candidates` | Yeni aday ekle |
| `PATCH /api/v1/companies/{companyId}/candidates/{candidateId}` | Aday güncelle |
| `DELETE /api/v1/companies/{companyId}/candidates/{candidateId}` | Aday sil |
| `GET /api/v1/companies/{companyId}/positions` | Pozisyon listesi |
| `GET /api/v1/companies/{companyId}/positions/{positionId}` | Pozisyon detayı |
| `GET /api/v1/companies/{companyId}/positions/{positionId}/board` | Kanban board |
| `GET /api/v1/companies/{companyId}/pipelines` | Pipeline listesi |
| `GET /api/v1/companies/{companyId}/pipelines/{pipelineId}` | Pipeline detayı |
| `GET /api/v1/companies/{companyId}/departments` | Departman listesi |
| `GET /api/v1/companies/{companyId}/departments/{departmentId}` | Departman detayı |
| `PATCH /api/v1/companies/{companyId}/candidate-processes/{processId}/stage` | Aşama değiştir |

---

## Örnek Çalıştırma Sırası

```bash
# 1. Veritabanını başlat (Docker)
docker start ats-postgres

# 2. Backend'i başlat
cd ats-system
mvn spring-boot:run

# 3. Login yap ve token al
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sirket.com","password":"Admin123!"}' | \
  jq -r '.data.accessToken')

# 4. Token'ı kaydet
echo $TOKEN

# 5. Frontend'i başlat (ayrı terminal)
cd manus-ats-frontend
pnpm dev
```

---

## JWT Token'ı Frontend'e Manuel Ekleme (Test İçin)

Eğer login sayfası henüz yoksa, token'ı tarayıcı konsolundan manuel ekleyebilirsiniz:

1. Frontend'i açın (`http://localhost:3000`)
2. Tarayıcı konsolunu açın (F12)
3. Şu komutu çalıştırın:
```javascript
localStorage.setItem('auth_token', 'BURAYA_TOKEN_YAPISTIRIN');
```
4. Sayfayı yenileyin

---

## Sorun Giderme

### CORS Hatası Alıyorsanız
Backend'de `CORS_ALLOWED_ORIGINS` ortam değişkenine frontend URL'inizi ekleyin:
```bash
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### Veritabanı Bağlantı Hatası
`DATABASE_URL` değişkeninin doğru olduğunu kontrol edin:
```bash
echo $DATABASE_URL
# Beklenen: jdbc:postgresql://localhost:5432/ats
```

### Flyway Migration Hatası
Migration dosyaları `src/main/resources/db/migration/` klasöründe bulunur. Veritabanı sıfırdan başlatılıyorsa sorun olmaz. Mevcut veritabanı varsa:
```bash
docker exec -i ats-postgres psql -U ats_user -d ats -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```
