# Tournament System Implementation

## Genel Bakış

8 kişilik turnuva sistemi tamamlandı. Turnuva otomatik olarak 8 kişi dolduğunda başlıyor ve bittiğinde yeni turnuva oluşturuluyor.

## Backend Değişiklikleri

### 1. Database Tabloları
- `tournaments` tablosu zaten mevcuttu
- `matches` tablosuna `tournamentId` ve `round` alanları eklendi
- `users` tablosuna `currentTournamentId` alanı eklendi

### 2. Tournament Controller (`backend/src/modules/tournament/controller/tournament.controller.js`)
**Eklenen WebSocket Event Handler'ları:**
- `join` - Aktif turnuvaya katılım
- `leave` - Turnuvadan ayrılma (sadece pending durumda)
- `get-details` - Turnuva detaylarını getirme
- `get-bracket` - Turnuva bracket'ini getirme

**Özellikler:**
- 8 kişi dolunca otomatik turnuva başlatma
- Validasyonlar (dolu turnuva, zaten katıldı, vs.)
- Tüm katılımcılara broadcast mesajları

### 3. Tournament Service (`backend/src/modules/tournament/service/tournament.service.js`)
**Ana Fonksiyonlar:**
- `startTournamentService()` - Turnuvayı başlatır, bracket oluşturur
- `getTournamentDetailsService()` - Turnuva bilgilerini getirir
- `processTournamentMatchResult()` - Maç bitince sonraki round'u kontrol eder
- `advanceToNextRound()` - Sonraki round maçlarını oluşturur
- `finalizeTournament()` - Turnuvayı bitirir, kazananı belirler
- `autoCreateNextTournament()` - Otomatik yeni turnuva oluşturur

**Bracket Sistemi:**
- 8 kişi random eşleştirilir
- 3 round: 8→4→2→1 (Quarter→Semi→Final)
- Kazananlar otomatik sonraki round'a geçer

### 4. Match Service (`backend/src/modules/tournament/services/match.service.js`)
**Yeni Dosya - Turnuva Maçlarını Yönetir:**
- `startTournamentMatches()` - Round'daki tüm maçları başlatır
- `createTournamentMatch()` - Tek maç için oda oluşturur
- `checkPendingTournamentMatches()` - Oyuncu online olunca bekleyen maçları başlatır

### 5. Game System Entegrasyonu
**Değiştirildi:**
- `createRoom()` fonksiyonuna `tournamentId` ve `round` parametreleri eklendi
- `saveGametoDbServices()` turnuva bilgilerini kaydediyor
- Maç bitince `processTournamentMatchResult()` çağrılıyor
- Oyuncu ayrılınca turnuva progression çalışıyor

## Frontend Değişiklikleri

### 1. TournamentService (`frontend/services/TournamentService.ts`)
**Yeni Servis - WebSocket ile Backend İletişimi:**
- `joinTournament()` - Turnuvaya katılma
- `leaveTournament()` - Turnuvadan ayrılma
- `getTournamentDetails()` - Detayları getirme
- Tüm turnuva eventleri için listener'lar

### 2. GameAreaComponent (`frontend/pages/home/components/GameAreaComponent.ts`)
**Turnuva UI Eklendi:**
- Turnuva bilgi paneli (katılımcı sayısı, durum)
- Join/Leave tournament butonları
- Turnuva bracket görüntüleme
- Real-time güncellemeler

**Turnuva Event Handling:**
- Oyuncu katıldı/ayrıldı bildirimleri
- Turnuva başladığında bracket gösterimi
- Maç başladığında otomatik yönlendirme
- Round güncellemeleri

## Akış Diagramı

```
1. Sistem başlatılınca otomatik boş turnuva oluşturulur
2. Kullanıcılar "Join Tournament" ile katılır
3. 8 kişi dolunca:
   - Turnuva durumu 'active' olur
   - Random bracket oluşturulur
   - İlk round maçları başlar (4 maç paralel)
4. Maçlar normal pong oyunu gibi çalışır
5. Maç bitince:
   - Kazanan sonraki round'a geçer
   - Tüm round maçları bitince sonraki round başlar
6. Final kazanı belirlenir
7. Turnuva biter, kazanan belirlenir
8. Otomatik yeni turnuva oluşturulur
```

## WebSocket Event'leri

### Backend'den Frontend'e:
- `tournament:playerJoined` - Oyuncu katıldı
- `tournament:playerLeft` - Oyuncu ayrıldı  
- `tournament:tournamentStarted` - Turnuva başladı
- `tournament:matchStarted` - Maç başladı
- `tournament:nextRoundStarted` - Sonraki round başladı
- `tournament:tournamentEnded` - Turnuva bitti
- `tournament:newTournamentCreated` - Yeni turnuva oluşturuldu
- `tournament:details` - Turnuva detayları
- `tournament:playerDisconnected` - Oyuncu disconnect oldu

### Frontend'den Backend'e:
- `tournament:join` - Turnuvaya katıl
- `tournament:leave` - Turnuvadan ayrıl
- `tournament:get-details` - Detayları getir
- `tournament:get-bracket` - Bracket'i getir

## Özel Durumlar

### Oyuncu Disconnection:
- Eğer oyuncu maç sırasında disconnect olursa rakibi otomatik kazanır
- `handlePlayerDisconnection()` fonksiyonu bunu yönetir
- Turnuva progression devam eder

### Turnuva Bitişi:
- Kazananın win count'u artırılır
- Tüm kullanıcıların `currentTournamentId`'si temizlenir
- Otomatik yeni turnuva oluşturulur

### Error Handling:
- Dolu turnuvaya katılma engellenir
- Başlamış turnuvadan ayrılma engellenir
- Zaten katılmış kullanıcı tekrar katılması engellenir

## Test Edilmesi Gerekenler

1. **Temel Fonksiyonlar:**
   - Turnuvaya katılma/ayrılma
   - 8 kişi dolunca otomatik başlama
   - Bracket oluşturma

2. **Maç Sistemi:**
   - Tournament maçlarının normal maç gibi çalışması
   - Kazanan belirleme
   - Sonraki round'a geçiş

3. **Edge Cases:**
   - Oyuncu disconnect durumu
   - Turnuva sırasında ayrılma
   - Network bağlantı sorunları

4. **UI/UX:**
   - Real-time güncellemeler
   - Bracket görüntüleme
   - Bildirimler

Bu sistem sayesinde kullanıcılar sürekli turnuva ortamında yarışabilir ve competitive pong deneyimi yaşayabilir.