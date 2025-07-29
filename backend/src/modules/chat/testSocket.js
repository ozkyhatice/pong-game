import WebSocket from 'ws';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJvemt5eWhhdGljZUBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvemtheWEiLCJpYXQiOjE3NTM2MTg0OTd9.CgIEoR3nUyhUZkUAw_BMIv5oIT5lulMhqsyU52_-MKg';
const ws = new WebSocket('ws://localhost:3000/ws', token);

const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJoYXRpY2Vvemt5MjhAZ21haWwuY29tIiwidXNlcm5hbWUiOiJza2F5bmFyIiwiaWF0IjoxNzUzNjE4Njg3fQ.21Ib9P4gSTnofjIQbY2w4-CUakMPhcOYsT0JArcOkdc';
const ws2 = new WebSocket('ws://localhost:3000/ws', token2);

ws.on('open', () => {
  console.log('✅ WebSocket bağlantısı kuruldu!');
  ws.send(JSON.stringify({
    receiverId: 2,
    content: 'Merhaba Hatice',
    type: 'message',
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'message') {
    ws2.send(JSON.stringify({
      type: 'read',
      msgId: msg.id
    }));

  // }
  // data = JSON.parse(data);
  console.log('📩 Mesaj alındı:', data);
}});

ws.on('close', () => {
  console.log('🔒 Bağlantı kapandı');
});

ws.on('error', (err) => {
  console.error('❌ Hata:', err);
});
