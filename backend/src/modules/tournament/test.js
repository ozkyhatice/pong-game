// 1️⃣ WebSocket oluştur

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJvemt5eWhhdGljZUBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvemtheWEiLCJpYXQiOjE3NTM2MTg0OTd9.CgIEoR3nUyhUZkUAw_BMIv5oIT5lulMhqsyU52_-MKg';
const ws = new WebSocket('ws://localhost:3000/ws', token);
// 2️⃣ Bağlantı açıldığında mesaj gönder
ws.onopen = () => {
  console.log('WebSocket connected');

  // Örnek turnuva join mesajı
  const tournamentMsg = {
    type: "tournament",
    event: "create",
    data: { tournamentId: 1 }
  };

  ws.send(JSON.stringify(tournamentMsg));
};

// 3️⃣ Sunucudan gelen mesajları dinle
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Received:', msg);
};

// 4️⃣ Hata kontrolü
ws.onerror = (err) => console.error('WebSocket error:', err);

// 5️⃣ Bağlantı kapandığında
ws.onclose = () => console.log('WebSocket closed');
