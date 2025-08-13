# Game Testing Documentation

Bu dokümanda websocket test uygulamasına eklenen oyun test özelliklerini açıklanmaktadır.

## Eklenen Özellikler

### 1. Oyun UI Bölümü
- **Oda Yönetimi**: Yeni oda oluşturma ve mevcut odalara katılma
- **Oyun Kontrolleri**: Oyunu başlatma ve test skorlama
- **Görsel Oyun Durumu**: Canvas üzerinde gerçek zamanlı Pong oyunu
- **Oyun Bilgileri**: Skorlar, top pozisyonu ve oyuncu listesi

### 2. Game Service (`game.ts`)
Tüm oyun WebSocket mesajlarını yöneten servis:

#### Desteklenen Events:
- `join`: Odaya katılma (yeni oda oluşturma veya mevcut odaya katılma)
- `start`: Oyunu başlatma
- `move`: Paddle hareket ettirme
- `score`: Skor alma (test amaçlı)
- `state-update`: Oyun durumu güncellemesi
- `ball-updated`: Top pozisyonu güncellemesi
- `score-update`: Skor güncellemesi
- `game-over`: Oyun bitiş durumu

#### Hata Yönetimi:
- `room-not-found`: Oda bulunamadı
- `already-joined`: Zaten katıldınız
- `room-full`: Oda dolu
- `game-already-started`: Oyun zaten başladı

### 3. Canvas Görselleştirme
- **800x600 piksel** oyun alanı
- **Gerçek zamanlı** paddle ve top hareketi
- **Skor gösterimi** ve oyuncu bilgileri
- **Orta çizgi** ve oyun alanı sınırları

### 4. Kontroller
- **W/S tuşları**: Paddle'ı yukarı/aşağı hareket ettirme
- **Ok tuşları**: Alternatif kontrol (yukarı/aşağı)
- **Gerçek zamanlı hareket**: Tuş basılı tutma desteklenir

## Kullanım Kılavuzu

### 1. Bağlantı Kurma
1. JWT token'ınızı girin
2. "Connect" butonuna tıklayın
3. Profil ve arkadaş listesi yüklenecek

### 2. Oyun Odasına Katılma

#### Yeni Oda Oluşturma:
1. "Create New Room" butonuna tıklayın
2. Sistem otomatik olarak yeni bir oda oluşturacak
3. Oda ID'si görüntülenecek

#### Mevcut Odaya Katılma:
1. Oda ID'sini "Room ID to join" alanına girin
2. "Join Room" butonuna tıklayın

### 3. Oyun Oynama
1. Odada 2 oyuncu olduğunda "Start Game" butonuna tıklayın
2. W/S tuşlarını kullanarak paddle'ınızı kontrol edin
3. Oyun 60 FPS ile çalışır ve gerçek zamanlı güncellenir
4. İlk 5 skora ulaşan oyuncu kazanır

### 4. Test Özellikleri
- **Score Point (Test)**: Manuel skor ekleme (test amaçlı)
- **Real-time Debugging**: Tüm WebSocket mesajları debug bölümünde görüntülenir
- **Room State Monitoring**: Oda durumu ve oyuncu bilgileri sürekli güncellenir

## Backend Entegrasyonu

### Desteklenen Backend Özellikler:
- ✅ **Room Management**: Oda oluşturma, katılma, durum kontrolü
- ✅ **Real-time Gameplay**: 60 FPS oyun döngüsü
- ✅ **Collision Detection**: Paddle ve duvar çarpışması
- ✅ **Score System**: Skor takibi ve kazanan belirleme
- ✅ **Database Integration**: Maç sonuçlarının kaydedilmesi
- ✅ **Error Handling**: Kapsamlı hata yönetimi

### WebSocket Mesaj Formatı:
```json
{
  "type": "game",
  "event": "join|start|move|score|state",
  "data": {
    "roomId": "uuid",
    "y": 250 // move event için
  }
}
```

## Teknik Detaylar

### Canvas Rendering:
- **Paddle boyutları**: 10x100 piksel
- **Top boyutu**: 8 piksel yarıçap
- **Oyun alanı**: 800x600 piksel
- **Renk şeması**: Siyah arkaplan, beyaz objeler

### Performance:
- **60 FPS** oyun döngüsü
- **Optimized rendering**: Sadece değişen elementler çizilir
- **Keyboard debouncing**: Gereksiz mesaj gönderimi önlenir

### State Management:
- **Local state**: Canvas rendering için
- **Server state**: Authoritative game state
- **Sync mechanism**: Server'dan gelen güncellemeler öncelikli

## Gelecek Geliştirmeler

### Potansiyel Eklemeler:
1. **Spectator Mode**: Oyunu izleme modu
2. **Tournament System**: Turnuva desteği
3. **Replay System**: Maç tekrarları
4. **Statistics**: Detaylı istatistikler
5. **Sound Effects**: Ses efektleri
6. **Power-ups**: Özel yetenekler

### UI/UX İyileştirmeleri:
1. **Better Styling**: Modern CSS tasarımı
2. **Responsive Design**: Mobil uyumluluk
3. **Animations**: Geçiş animasyonları
4. **Notifications**: Toast mesajları

## Troubleshooting

### Yaygın Sorunlar:

1. **Canvas boş görünüyor**
   - Browser'ın Canvas desteğini kontrol edin
   - Console'da JavaScript hataları olup olmadığını kontrol edin

2. **Paddle hareket etmiyor**
   - WebSocket bağlantısının aktif olduğunu kontrol edin
   - Oyunun başlatıldığından emin olun

3. **Oyun başlamıyor**
   - Odada 2 oyuncu olduğunu kontrol edin
   - Room ID'sinin doğru olduğunu kontrol edin

4. **WebSocket bağlantı sorunları**
   - Backend server'ın çalıştığından emin olun
   - JWT token'ın geçerli olduğunu kontrol edin
