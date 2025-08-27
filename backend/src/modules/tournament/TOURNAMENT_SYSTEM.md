# Turnuva Sistemi Tasarımı

## Genel Bakış
Pong oyunu için basit bir turnuva sistemi. Event-driven yaklaşımla sürekli aktif turnuva, 8 kişilik single-elimination turnuvalar.

## Database Şeması (MEVCUT DURUM)

### tournaments tablosu (OLUŞTURULDU ✅)
```sql
CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  startAt DATETIME NOT NULL,
  endAt DATETIME NULL,
  maxPlayers INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, completed
  winnerId INTEGER NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL
);
```

### users tablosu güncellenmiş (OLUŞTURULDU ✅)
```sql
-- Eklenen alanlar:
currentTournamentId INTEGER NULL,  -- Hangi turnuvada
isEliminated BOOLEAN DEFAULT 0     -- Elendi mi
```

### matches tablosu güncellenmiş (OLUŞTURULDU ✅)
```sql
-- Eklenen alanlar:
tournamentId INTEGER NULL,  -- Hangi turnuvaya ait
round INTEGER NULL          -- Hangi round (1,2,3)
```



## Backend Yapısı (YAPILACAK)

### 1. Tournament Module (YAPILACAK 📋)
```
backend/src/modules/tournament/
├── controller/
│   └── tournament.controller.js
├── routes/
│   └── tournament.routes.js
└── service/
    └── tournament.service.js
```

### 2. Ana Fonksiyonlar (YAPILACAK 📋)

#### tournament.service.js
- `getCurrentTournament()` - Aktif turnuvayı getir (ya da oluştur)
- `joinTournament(userId)` - Aktif turnuvaya katıl  
- `leaveTournament(userId)` - Turnuvadan ayrıl
- `startTournament(tournamentId)` - 8 kişi dolduğunda başlat
- `generateMatches(tournamentId)` - İlk round maçları oluştur
- `completeMatch(matchId, winnerId)` - Maç bitince next round
- `completeTournament(tournamentId, winnerId)` - Final bitince yeni turnuva

#### Event-Driven Sistem
```javascript
// Turnuva biter → Hemen yeni turnuva oluştur
export async function completeTournament(tournamentId, winnerId) {
  await finishTournament(tournamentId, winnerId);
  await createNewTournament(); // ← YENİ TURNUVA
  broadcast('tournament-ended', { winner, newTournamentId });
}

// 8 kişi dolar → Turnuva başlar
export async function joinTournament(userId) {
  const count = await addUserToTournament(userId);
  if (count === 8) {
    await startTournament(tournamentId); // ← BAŞLAT
  }
}
```

### 3. API Endpoints (YAPILACAK 📋)
- `GET /api/tournament/current` - Aktif turnuva bilgisi
- `POST /api/tournament/join` - Turnuvaya katıl
- `POST /api/tournament/leave` - Turnuvadan ayrıl

### 4. WebSocket Events (YAPILACAK 📋)
- `tournament-joined` - Biri katıldı
- `tournament-started` - 8 kişi doldu, başladı
- `tournament-match-ready` - Maçın hazır
- `tournament-ended` - Final bitti, yeni turnuva var

## Frontend Yapısı (YAPILACAK)

### 1. Tournament Lobby Sayfası (YAPILACAK 📋)
```
frontend/pages/tournament-lobby/
├── tournament-lobby.html
└── tournament-lobby.ts
```

### 2. Ana Akış (Mevcut Korunuyor ✅)
1. **Home** → Tournament Join butonu
2. **Tournament Lobby** → Katılımcı bekleme (8/8)
3. **Game Lobby** → Normal maç öncesi (mevcut kod ✅)
4. **Remote Game** → Oyun (mevcut kod ✅)
5. **End Game** → Maç sonucu (mevcut kod ✅)
6. **Tournament Lobby** → Sonraki maç veya yeni turnuva

### 3. Tournament Service (YAPILACAK 📋)
```typescript
// frontend/services/TournamentService.ts
export class TournamentService {
  getCurrentTournament()
  joinTournament()
  leaveTournament()
  onTournamentJoined(callback)
  onTournamentStarted(callback)
  onMatchReady(callback)
}
```

## WebSocket Events

### Tournament Events
- `tournament-joined` - Turnuvaya katıldı
- `tournament-left` - Turnuvadan ayrıldı  
- `tournament-started` - Turnuva başladı
- `match-ready` - Maçın hazır olduğu
- `tournament-match-completed` - Turnuva maçı bitti
- `tournament-ended` - Turnuva bitti

## YAPILACAKLAR SİRASI

### ✅ TAMAMLANAN
- Database şeması oluşturuldu
- tournaments, users, matches tabloları hazır

### 📋 SIRADAKİ ADIMLAR
1. **Tournament modülü klasör yapısını oluştur**
2. **tournament.service.js yaz** (temel CRUD)
3. **tournament.controller.js yaz** (API endpoints)
4. **tournament.routes.js yaz** (routing)
5. **WebSocket events ekle** (tournament için)
6. **Frontend tournament-lobby sayfası**

## Güncel Yaklaşım

- **Event-Driven**: Turnuva biter → Yeni turnuva başlar
- **Basit DB**: 3 tablo yeterli (tournament_participants yok)
- **Mevcut akış korumaor**: lobby → game → endgame
- **Otomatik döngü**: 8 kişi dolar → başlar, final biter → yeni turnuva

## Test Senaryoları

1. 8 kişi katılım → turnuva başlama
2. 4 kişi katılım → bekletme
3. Turnuva sırasında disconnect → reconnect
4. Maç abandon etme
5. Turnuva ortasında server restart