// 1️⃣ WebSocket oluştur

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJvemt5eWhhdGljZUBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvemtheWEiLCJpYXQiOjE3NTM2MTg0OTd9.CgIEoR3nUyhUZkUAw_BMIv5oIT5lulMhqsyU52_-MKg';
const ws = new WebSocket('ws://localhost:3000/ws', token);
const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJoYXRpY2Vvemt5MjhAZ21haWwuY29tIiwidXNlcm5hbWUiOiJza2F5bmFyIiwiaWF0IjoxNzUzNjE4Njg3fQ.21Ib9P4gSTnofjIQbY2w4-CUakMPhcOYsT0JArcOkdc';
const ws2 = new WebSocket('ws://localhost:3000/ws', token2);

ws2.onopen = () => {
  console.log('WebSocket 2 connected - Will join tournament after creation');
  
  // Tournament create edildikten sonra join yapması için biraz bekle
  setTimeout(() => {
    const joinMsg = {
      type: "tournament",
      event: "create",
      data: { name: "My First Tournament", maxPlayers: 5}
    };
    
    console.log('WS2 Sending tournament join message:', joinMsg);
    ws2.send(JSON.stringify(joinMsg));
  }, 3000);
};

// ws2 için mesaj dinleyici ekle
ws2.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('WS2 Received broadcast:', msg);
};

ws2.onerror = (err) => console.error('WebSocket2 error:', err);
ws2.onclose = () => console.log('WebSocket2 closed');

// 2️⃣ Bağlantı açıldığında mesaj gönder
ws.onopen = () => {
  console.log('WebSocket 1 connected - Will send tournament create message');

  // Biraz bekle ki ws2 de bağlansın
  setTimeout(() => {
    // Örnek turnuva create mesajı
    const tournamentMsg = {
      type: "tournament",
      event: "create",
      data: { name: "My Second Tournament", maxPlayers: 5}
    };

    console.log('WS1 Sending tournament create message:', tournamentMsg);
    ws.send(JSON.stringify(tournamentMsg));
  }, 1000);
};

// 3️⃣ Sunucudan gelen mesajları dinle
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('WS1 Received:', msg);
};

// 4️⃣ Hata kontrolü
ws.onerror = (err) => console.error('WebSocket error:', err);

// 5️⃣ Bağlantı kapandığında
ws.onclose = () => console.log('WebSocket closed');
