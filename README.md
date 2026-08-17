# ATS System Frontend

ATS System; adayların, ilk iletişim kayıtlarının, pozisyonların, departmanların ve işe alım süreçlerinin tek bir arayüzden yönetilebilmesini sağlayan web tabanlı aday takip sistemidir.

Backend repository:  
https://github.com/elifnurbeycan/ats-system

## Özellikler

- Rol ve yetki bazlı kullanıcı arayüzü
- Aday ve başvuru yönetimi
- İlk iletişim havuzu
- İletişim sonucu ve ret nedeni takibi
- Departman ve pozisyon yönetimi
- Özelleştirilebilir işe alım pipeline'ları
- Aday aşama geçmişi ve not yönetimi
- CV yükleme ve indirme
- Maaş ve teklif bilgilerinin yönetimi
- Departman, aşama ve duruma göre filtreleme
- Sayfalama ve sıralama
- Excel raporu oluşturma
- Haftalık, aylık ve tüm zamanlara ait dashboard raporları
- Açık ve koyu tema desteği
- Responsive kullanıcı arayüzü

## Kullanılan Teknolojiler

- React 19
- TypeScript 5.6
- Vite 7
- Tailwind CSS 4
- Radix UI
- React Hook Form
- Zod
- Axios
- Recharts
- Wouter
- SheetJS
- Lucide React
- pnpm

## Gereksinimler

Projeyi çalıştırmadan önce aşağıdaki araçların kurulu olması gerekir:

- Node.js 20.19 veya üzeri
- pnpm 10
- Git
- Çalışır durumda ATS System backend uygulaması

Node.js ve pnpm sürümlerini kontrol etmek için:

```powershell
node --version
pnpm --version
```

pnpm kurulu değilse:

```powershell
npm install -g pnpm
```

## Kurulum

Repository'yi klonlayın:

```powershell
git clone https://github.com/elifnurbeycan/ats-system-frontend.git
cd ats-system-frontend
```

Bağımlılıkları yükleyin:

```powershell
pnpm install
```

## Ortam Değişkenleri

Projenin kök dizininde `.env` dosyası oluşturun:

```env
VITE_API_URL=http://localhost:8080
VITE_COMPANY_ID=1
```

Değişkenlerin açıklamaları:

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `VITE_API_URL` | Backend uygulamasının adresi | `http://localhost:8080` |
| `VITE_COMPANY_ID` | Yerel geliştirmede kullanılacak şirket kimliği | `1` |

`.env` dosyasına parola, token veya üretim ortamına ait gizli bilgi eklemeyin.

## Uygulamayı Çalıştırma

Geliştirme sunucusunu başlatın:

```powershell
pnpm dev
```

Uygulama varsayılan olarak aşağıdaki adreste açılır:

```text
http://localhost:3000
```

Port `3000` kullanımdaysa Vite otomatik olarak başka bir port seçebilir. Terminalde gösterilen `Local` adresini kullanın.

Backend uygulamasının da aşağıdaki adreste çalışıyor olması gerekir:

```text
http://localhost:8080
```

## Kontrol ve Build

TypeScript kontrolü:

```powershell
pnpm check
```

Production build oluşturma:

```powershell
pnpm build
```

Build sonucunu yerel olarak önizleme:

```powershell
pnpm preview
```

Kod biçimlendirme:

```powershell
pnpm format
```

## Proje Yapısı

```text
client/
├── public/
└── src/
    ├── components/      Tekrar kullanılabilir UI bileşenleri
    ├── contexts/        React context yapıları
    ├── hooks/           Özel React hook'ları
    ├── lib/
    │   └── api/         Backend API istemcileri
    ├── pages/           Uygulama sayfaları
    ├── App.tsx          Route ve uygulama yapısı
    ├── main.tsx         React başlangıç dosyası
    └── index.css        Global stiller ve tema değişkenleri

server/
└── index.ts             Production sunucu başlangıcı

shared/                  Paylaşılan tipler ve yardımcı yapılar
```

## Backend Bağlantısı

Frontend tek başına yeterli değildir. Giriş, aday, iletişim, pipeline, raporlama ve dosya işlemleri backend API üzerinden gerçekleştirilir.

Backend kurulum talimatları:

https://github.com/elifnurbeycan/ats-system

Yerel geliştirme portları:

| Servis | Port |
|---|---:|
| Frontend | `3000` |
| Backend | `8080` |
| PostgreSQL | `5432` |
| Mailpit SMTP | `1025` |
| Mailpit arayüzü | `8025` |

## Güvenlik

- Yetki kontrollerinin asıl kaynağı backend uygulamasıdır.
- Frontend tarafında butonların gizlenmesi tek başına güvenlik kontrolü değildir.
- Access token ve kullanıcı oturumu yalnızca uygulamanın mevcut kimlik doğrulama sistemi üzerinden yönetilmelidir.
- `.env` dosyaları ve gerçek kullanıcı bilgileri GitHub'a yüklenmemelidir.

## Commit Standardı

Projede Conventional Commits formatı kullanılmaktadır:

```text
feat: yeni özellik
fix: hata düzeltmesi
refactor: davranışı değiştirmeyen kod düzenlemesi
docs: dokümantasyon değişikliği
style: görsel veya biçimsel düzenleme
test: test ekleme veya güncelleme
chore: bakım işlemi
```

## Proje Durumu

Proje aktif olarak geliştirilmektedir.
