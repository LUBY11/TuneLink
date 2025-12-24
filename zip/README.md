# Music Together - YouTube Music Extension

Bu Chrome uzantısı, YouTube Music'te arkadaşlarınızla birlikte müzik dinlemenizi sağlar. Uzantı, gerçek zamanlı olarak müzik senkronizasyonu ve oda yönetimi özellikleri sunar.

## Özellikler

- 🎵 Gerçek zamanlı müzik senkronizasyonu
- 🏠 Oda oluşturma ve yönetme
- 👥 Arkadaşlarınızı odaya davet etme
- 🎮 Host kontrolü
- 📋 Oda kodu kopyalama
- 👀 Katılımcı listesi görüntüleme

## Kurulum

1. Bu repoyu bilgisayarınıza klonlayın:
```bash
git clone https://github.com/your-username/yt-music-together-extension.git
```

2. Chrome tarayıcınızda `chrome://extensions` adresine gidin
3. Sağ üst köşedeki "Geliştirici modu"nu açın
4. "Paketlenmemiş öğe yükle" butonuna tıklayın
5. Klonladığınız klasörü seçin

## Proje Yapısı

```
extension/
├── manifest.json           # Uzantı yapılandırma dosyası
├── README.md              # Proje dokümantasyonu
├── src/
│   ├── background/
│   │   └── background.js  # Arka plan işlemleri ve mesaj yönetimi
│   ├── content/
│   │   ├── content-script.js  # Ana panel ve görünüm yönetimi
│   │   └── views/
│   │       ├── home-view.js   # Ana sayfa görünümü
│   │       └── room-view.js   # Oda görünümü
│   ├── services/
│   │   ├── room-service.js    # Oda işlemleri servisi
│   │   └── websocket-service.js # WebSocket bağlantı yönetimi
│   └── styles/
│       └── panel.css      # Uzantı stil dosyası
```

### Klasör Yapısı Açıklamaları

- **manifest.json**: Chrome uzantısının temel yapılandırma dosyası. İzinler, content scripts ve background worker tanımlamaları burada bulunur.

- **src/background/**: 
  - `background.js`: Uzantının arka plan işlemlerini yönetir. Oda oluşturma, katılma ve çıkma işlemlerinin mesaj yönetimini yapar.

- **src/content/**: 
  - `content-script.js`: YouTube Music sayfasına enjekte edilen ana script. Panel oluşturma ve yönetiminden sorumludur.
  - `views/`: Farklı görünüm bileşenlerini içerir
    - `home-view.js`: Ana sayfa görünümü (oda oluşturma ve katılma)
    - `room-view.js`: Oda içi görünümü (katılımcılar, çalan şarkı, kontroller)

- **src/services/**: 
  - `room-service.js`: Oda işlemlerini yöneten servis
  - `websocket-service.js`: WebSocket bağlantı yönetimi ve mesajlaşma

- **src/styles/**: 
  - `panel.css`: Uzantının görsel stillerini içeren CSS dosyası

## Geliştirme

### Ön Koşullar

- Node.js ve npm
- Chrome tarayıcısı
- Temel JavaScript, HTML ve CSS bilgisi

2. Uzantıyı Chrome'a yükleyin:
- Chrome'da `chrome://extensions` adresine gidin
- "Geliştirici modu"nu açın
- "Paketlenmemiş öğe yükle" ile proje klasörünü seçin

3. YouTube Music'i açın ve uzantıyı test edin

### WebSocket Sunucusu

Bu uzantı, gerçek zamanlı iletişim için bir WebSocket sunucusuna ihtiyaç duyar. Sunucu adresi `websocket-service.js` dosyasında yapılandırılmalıdır.

## Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Bir Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın. 