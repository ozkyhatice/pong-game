# Frontend Chat Kullanım Rehberi

Real-time chat + online status + arkadaş sistemi. Frontend'de nasıl kullanacağınızı gösterir.

## 🚀 Hızlı Başlangıç

### 1. Login Sonrası WebSocket Bağlantısı
```javascript
// Login başarılı olduktan sonra
const token = localStorage.getItem('token');
let ws = null;

async function connectToChat() {
  ws = new WebSocket('ws://localhost:3000/ws', token);
  
  ws.onopen = () => {
    console.log('Chat\'e bağlandı!');
  };
  
  ws.onmessage = handleWebSocketMessage;
  ws.onclose = () => console.log('Bağlantı kesildi');
}
```

### 2. Gelen Mesajları Handle Et
```javascript
function handleWebSocketMessage(event) {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'message':
      // Yeni mesaj geldi - UI'da göster
      displayNewMessage(message);
      break;
      
    case 'missedMessages':
      // Bağlantı kurulduğunda kaçırılan mesajlar
      loadMissedMessages(message.data);
      break;
      
    case 'userStatus':
      // Arkadaş online/offline oldu
      updateFriendStatus(message.userID, message.status);
      break;
      
    case 'onlineClients':
      // İlk bağlantıda online olan arkadaşlar
      showOnlineFriends(message.data);
      break;
  }
}
```

## 💬 Chat İşlemleri

### Mesaj Gönder
```javascript
function sendMessage(friendId, content) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Chat bağlantısı yok!');
    return;
  }
  
  ws.send(JSON.stringify({
    type: 'message',
    receiverId: friendId,
    content: content
  }));
}
```

### Chat Geçmişi Yükle
```javascript
async function loadChatHistory(friendId) {
  const response = await fetch(`/chat/history/${friendId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  displayMessages(data.data.messages);
}
```

### Mesajları Okundu İşaretle
```javascript
// WebSocket ile (hızlı)
function markAsRead(friendId) {
  ws.send(JSON.stringify({
    type: 'read',
    senderId: friendId
  }));
}

// REST API ile (güvenli)
async function markAsReadAPI(friendId) {
  await fetch(`/chat/mark-read/${friendId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## 👥 Online Status & Arkadaş Sistemi

### İlk Yüklemede Online Arkadaşları Göster
```javascript
function showOnlineFriends(onlineClients) {
  // Sadece arkadaş olanları filtrele
  const myFriends = await getFriendsList();
  const onlineFriends = onlineClients.filter(client => 
    myFriends.some(friend => friend.id === client.id)
  );
  
  updateFriendsUI(onlineFriends);
}

function updateFriendsUI(friends) {
  friends.forEach(friend => {
    const friendElement = document.querySelector(`[data-friend-id="${friend.id}"]`);
    if (friendElement) {
      friendElement.classList.add('online');
      friendElement.querySelector('.status').textContent = '🟢 Online';
    }
  });
}
```

### Online Status Güncellemeleri
```javascript
function updateFriendStatus(userId, status) {
  const friendElement = document.querySelector(`[data-friend-id="${userId}"]`);
  if (!friendElement) return;
  
  if (status === 'online') {
    friendElement.classList.add('online');
    friendElement.querySelector('.status').textContent = '🟢 Online';
  } else {
    friendElement.classList.remove('online');
    friendElement.querySelector('.status').textContent = '⚫ Offline';
  }
}
```

## � Pratik Kullanım Örnekleri

### Chat Açma Sistemi
```javascript
// Arkadaş listesinde tıklandığında
function openChatWith(friendId, friendName) {
  // 1. Chat geçmişini yükle
  loadChatHistory(friendId);
  
  // 2. Mesajları okundu yap
  markAsRead(friendId);
  
  // 3. Chat UI'ını göster
  showChatWindow(friendId, friendName);
}
```

### Gelen Mesaj Handling
```javascript
function displayNewMessage(message) {
  // Eğer o kişiyle chat açıksa direkt göster
  if (currentChatUserId === message.from) {
    addMessageToChat(message);
    markAsRead(message.from); // Otomatik okundu
  } else {
    // Değilse notification göster
    showNotification(`${message.from}: ${message.content}`);
    updateUnreadCount(message.from);
  }
}
```

### Tam Örnek: Chat Component
```javascript
class ChatComponent {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.currentChatUser = null;
  }
  
  async init() {
    // WebSocket bağlantısı
    this.ws = new WebSocket('ws://localhost:3000/ws', this.token);
    this.ws.onmessage = this.handleMessage.bind(this);
    
    // İlk arkadaş listesi
    await this.loadFriends(); // apiden cekin
  }
  
  handleMessage(event) {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'message') {
      this.displayMessage(msg);
    } else if (msg.type === 'userStatus') {
      this.updateOnlineStatus(msg.userID, msg.status);
    }
  }
  
  sendMessage(content) {
    this.ws.send(JSON.stringify({
      type: 'message',
      receiverId: this.currentChatUser.id,
      content: content
    }));
  }
}
```

## 🔗 API Endpoints

**Chat Geçmişi:** `GET /chat/history/:userId` - Tüm mesajları al

**Okundu İşaretle:** `PUT /chat/mark-read/:userId`

**Authorization Header:** `Bearer YOUR_JWT_TOKEN`

## 📡 WebSocket Mesajları

**Mesaj Gönder:** 
```json
{ "type": "message", "receiverId": 123, "content": "Merhaba!" }
```

**Okundu İşaretle:** 12 id li kullanicidan gelen tum mesajlari okundu yapar
```json
{ "type": "read", "senderId": 12 }
```

**Gelen Mesaj Tipleri:**

- **`message`** - Yeni mesaj geldi
```json
{
  "type": "message",
  "from": 123,
  "content": "Merhaba!",
  "createdAt": "2025-08-04T12:00:00.000Z",
  "isRead": 0,
  "delivered": 1,
  "id": 45
}
```

- **`missedMessages`** - Kaçırılan mesajlar (bağlantı kurulduğunda)
```json
{
  "type": "missedMessages",
  "data": {
    "undelivered": [...], // offlineken gelen
    "unread": [...],  // acilmamis mesajlar undelivered mesajlarida icerir
    "totalUnreadCount": 5
  }
}
```

- **`userStatus`** - Online/offline durumu
```json
{
  "type": "userStatus",
  "userID": 123,
  "status": "online"
}
```

- **`onlineClients`** - İlk bağlantıda online clientlar listesi !!! arkadas olmayan clientlarda var
```json
{
  "type": "onlineClients",
  "data": [
    {
      "id": 123,
      "username": "arkadas1",
      "isOnline": true
    }
  ]
}
```

---

✅ **Önemli:** Login olduktan sonra hemen WebSocket bağlantısı kurun
✅ **Performans:** Chat geçmişi için REST API, anlık mesajlar için WebSocket
✅ **UX:** Online status real-time güncellenir, offline mesajlar otomatik teslim edilir
