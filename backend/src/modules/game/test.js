import WebSocket from 'ws';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJvemt5eWhhdGljZUBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvemtheWEiLCJpYXQiOjE3NTM2MTg0OTd9.CgIEoR3nUyhUZkUAw_BMIv5oIT5lulMhqsyU52_-MKg';
const ws1 = new WebSocket('ws://localhost:3000/ws', token);

const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJoYXRpY2Vvemt5MjhAZ21haWwuY29tIiwidXNlcm5hbWUiOiJza2F5bmFyIiwiaWF0IjoxNzUzNjE4Njg3fQ.21Ib9P4gSTnofjIQbY2w4-CUakMPhcOYsT0JArcOkdc';
const ws2 = new WebSocket('ws://localhost:3000/ws', token2);


let roomId = null;
let ws2Ready = false;
let gameStarted = false;

let user1Score = 0;
let user2Score = 0;
const WINNING_SCORE = 5;

// --- WS1 OPEN ---
ws1.on('open', () => {
  console.log('🎮 [User1] connected');
  ws1.send(JSON.stringify({
    type: 'game',
    event: 'join',
    data: {}
  }));
});

// --- WS2 OPEN ---
ws2.on('open', () => {
  console.log('🎮 [User2] connected');
  ws2Ready = true;

  if (roomId) {
    joinWs2ToRoom();
  }
});

function joinWs2ToRoom() {
  ws2.send(JSON.stringify({
    type: 'game',
    event: 'join',
    data: { roomId }
  }));

  // Delay ile oyunu başlat
  setTimeout(() => {
    console.log('🎮 Starting game...');
    ws2.send(JSON.stringify({
      type: 'game',
      event: 'start',
      data: { roomId }
    }));
    gameStarted = true;

    // Skor testini başlat
    setTimeout(startScoreTest, 1000);
  }, 1000);
}

// --- WS1 MESSAGE ---
ws1.on('message', (msg) => {
  const data = JSON.parse(msg);
  console.log('📩 [User1] received:', data);

  switch (data.event) {
    case 'room-created':
      roomId = data.data.roomId;
      console.log(`🏠 Room created: ${roomId}`);
      if (ws2Ready) joinWs2ToRoom();
      break;

    case 'joined':
      console.log(`[User1] joined room ${data.data.roomId}`);
      break;

    case 'score-update':
      console.log(`[User1] score updated:`, data.data);
      updateLocalScores(data.data);
      checkGameEnd();
      break;

    case 'game-over':
      console.log(`[User1] Game over:`, data.data);
      endGame();
      break;

    default:
      break;
  }
});

// --- WS2 MESSAGE ---
ws2.on('message', (msg) => {
  const data = JSON.parse(msg);
  console.log('📩 [User2] received:', data);

  switch (data.event) {
    case 'joined':
      roomId = data.data.roomId;
      console.log(`[User2] joined room ${roomId}`);
      break;

    case 'score-update':
      console.log(`[User2] score updated:`, data.data);
      updateLocalScores(data.data);
      checkGameEnd();
      break;

    case 'game-over':
      console.log(`[User2] Game over:`, data.data);
      endGame();
      break;

    default:
      break;
  }
});

// --- Skor testi fonksiyonu ---
function startScoreTest() {
  console.log('🎯 Starting score test...');

  const scoreInterval = setInterval(() => {
    if (!gameStarted) {
      clearInterval(scoreInterval);
      return;
    }

    // Rastgele skor atanacak kullanıcı
    const scoringUser = Math.random() > 0.5 ? 1 : 2;

    if (scoringUser === 1) {
      console.log(`🎯 User1 scoring... Current server score: User1=${user1Score}, User2=${user2Score}`);
      ws1.send(JSON.stringify({
        type: 'game',
        event: 'score',
        data: { roomId, userId: 1 } // newScore kaldırıldı, server hesaplasın
      }));
    } else {
      console.log(`🎯 User2 scoring... Current server score: User1=${user1Score}, User2=${user2Score}`);
      ws2.send(JSON.stringify({
        type: 'game',
        event: 'score',
        data: { roomId, userId: 2 } // newScore kaldırıldı, server hesaplasın
      }));
    }

    
  }, 2000);
}

// --- Skorları güncelle ---
function updateLocalScores(scoreData) {
  if (!scoreData) return;
  
  let updated = false;
  
  if (scoreData.score) {
    // Eğer score alanı varsa
    const newUser1Score = scoreData.score['1'] ?? user1Score;
    const newUser2Score = scoreData.score['2'] ?? user2Score;
    
    if (newUser1Score !== user1Score || newUser2Score !== user2Score) {
      user1Score = newUser1Score;
      user2Score = newUser2Score;
      updated = true;
    }
  }
  
  if (scoreData.scores) {
    // Eğer scores alanı varsa
    const newUser1Score = scoreData.scores['1'] ?? user1Score;
    const newUser2Score = scoreData.scores['2'] ?? user2Score;
    
    if (newUser1Score !== user1Score || newUser2Score !== user2Score) {
      user1Score = newUser1Score;
      user2Score = newUser2Score;
      updated = true;
    }
  }
  
  if (updated) {
    console.log(`📊 Scores updated from server: User1=${user1Score}, User2=${user2Score}`);
  }
}

// --- Oyun bitiş kontrolü ---
function checkGameEnd() {
  if (user1Score >= WINNING_SCORE || user2Score >= WINNING_SCORE) {
    const winner = user1Score >= WINNING_SCORE ? 'User1' : 'User2';
    console.log(`🏁 Local check: Game should end! Winner: ${winner} (${user1Score}-${user2Score})`);
    // Server zaten game-over gönderecek, sadece log yapıyoruz
  }
}

// --- Oyunun bittiği zaman yapılacaklar ---
function endGame() {
  console.log('🎮 Game officially ended');
  gameStarted = false;

  setTimeout(() => {
    console.log('🔚 Closing connections and exiting...');
    ws1.close();
    ws2.close();
    process.exit(0);
  }, 2000);
}
