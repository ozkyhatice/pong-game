import WebSocket from 'ws';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJvemt5eWhhdGljZUBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvemtheWEiLCJpYXQiOjE3NTM2MTg0OTd9.CgIEoR3nUyhUZkUAw_BMIv5oIT5lulMhqsyU52_-MKg';
const ws1 = new WebSocket('ws://localhost:3000/ws', token);

const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJoYXRpY2Vvemt5MjhAZ21haWwuY29tIiwidXNlcm5hbWUiOiJza2F5bmFyIiwiaWF0IjoxNzUzNjE4Njg3fQ.21Ib9P4gSTnofjIQbY2w4-CUakMPhcOYsT0JArcOkdc';
const ws2 = new WebSocket('ws://localhost:3000/ws', token2);

let roomId = null;
let ws2Ready = false;

ws1.on('open', () => {
  console.log('🎮 [User1] bağlandı');

  ws1.send(JSON.stringify({
    type: 'game',
    event: 'join',
    data: {}
  }));
});

ws2.on('open', () => {
  console.log('🎮 [User2] bağlandı');
  ws2Ready = true;
  
  // Eğer roomId varsa hemen katıl
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
  ws2.send(JSON.stringify({
    type: 'game',
    event: 'move',
    data: { direction: 'right' }
  }));
}

// ws1'den oda bilgisi al
ws1.on('message', (msg) => {
  console.log('📩 ws1 mesaj aldı:', msg.toString());
  const data = JSON.parse(msg);
  console.log('📦 Parsed data:', data);
  
  // Game room-created eventi kontrol et
  if (data.type === 'game' && data.event === 'room-created' && data.data && data.data.roomId) {
    roomId = data.data.roomId;
    console.log('🏠 Room ID alındı (room-created):', roomId);
    
    // Eğer ws2 hazırsa hemen katıl
    if (ws2Ready) {
      joinWs2ToRoom();
    }
  }
  // Game joined eventi kontrol et
  else if (data.type === 'game' && data.event === 'joined' && data.data && data.data.roomId) {
    roomId = data.data.roomId;
    console.log('🏠 Room ID alındı (joined):', roomId);
    
    // Eğer ws2 hazırsa hemen katıl
    if (ws2Ready) {
      joinWs2ToRoom();
    }
  }
  // Alternatif format kontrolü
  else if (data.roomId) {
    roomId = data.roomId;
    console.log('🏠 Room ID alındı (alternatif format):', roomId);
    
    if (ws2Ready) {
      joinWs2ToRoom();
    }
  }
});



