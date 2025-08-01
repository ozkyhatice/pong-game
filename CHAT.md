# Chat System Documentation

## 📋 Overview

Bu projedeki chat sistemi **hibrit bir yaklaşım** kullanır:
- **Real-time mesajlaşma**: WebSocket üzerinden
- **Chat history ve status işlemleri**: REST API üzerinden
- **Offline message handling**: Otomatik sincronizasyon

## 🏗️ Architecture

```
Chat System
├── WebSocket Layer (Real-time)
│   ├── Message sending/receiving
│   ├── User status broadcasting
│   └── Missed message delivery
└── REST API Layer (History & Status)
    ├── Chat history
    ├── Message read marking
    └── Unread count
```

## 📁 File Structure

```
backend/src/modules/chat/
├── controller/
│   └── chat.controller.js      # WebSocket + REST API controllers
├── service/
│   └── chat.service.js         # Database operations
├── routes/
│   └── chat.routes.js          # REST API endpoints
└── schema.js                   # API request/response schemas

backend/src/websocket/
├── websocket.handler.js        # Main WebSocket handler
├── handlers/
│   ├── connection.handler.js   # Connection lifecycle
│   └── message.router.js       # Message routing
└── services/
    └── client.service.js       # Global client management
```

## 🔌 WebSocket Implementation

### Connection Flow

1. **Client bağlanır**: `ws://localhost:3000/ws`
2. **JWT Authentication**: `sec-websocket-protocol` header ile token gönderilir
3. **User online status**: Diğer kullanıcılara broadcast edilir
4. **Missed messages**: Offline'ken gelen mesajlar otomatik gönderilir

### Message Types

#### 1. Text Message
```javascript
// Gönderilen mesaj
{
  "type": "message",
  "receiverId": 2,
  "content": "Hello!"
}

// Alınan response
{
  "type": "message",
  "from": 1,
  "content": "Hello!",
  "createdAt": "2025-01-01T12:00:00.000Z",
  "isRead": 0,
  "delivered": 1,
  "id": 123
}
```

#### 2. Mark as Read
```javascript
// Belirli bir kullanıcıyla olan mesajları okundu işaretle
{
  "type": "read",
  "senderId": 2  // Bu kullanıcıdan gelen mesajları okundu yap
}

// Eski versiyon (tüm mesajları okundu yapar - önerilmez)
{
  "type": "read"
}
```

#### 3. Missed Messages (Auto-sent)
```javascript
// Bağlanınca otomatik gönderilen
{
  "type": "missedMessages",
  "data": {
    "undelivered": [...],
    "unread": [...],
    "totalUnreadCount": 5
  }
}
```

#### 4. User Status
```javascript
// User online/offline durumu
{
  "type": "userStatus",
  "userId": 2,
  "status": "online" // veya "offline"
}
```

### JavaScript Client Example

```javascript
// WebSocket bağlantısı
const token = localStorage.getItem('token');
const ws = new WebSocket('ws://localhost:3000/ws', token);

// Şu an aktif olan chat kullanıcısı
let currentChatUserId = null;

ws.onopen = () => {
  console.log('Connected to chat');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'message':
      displayMessage(message);
      
      // Eğer mesaj şu an açık olan chat'ten geliyorsa otomatik okundu yap
      if (currentChatUserId === message.from) {
        markMessagesAsReadFromUser(message.from);
      }
      break;
      
    case 'missedMessages':
      displayMissedMessages(message.data);
      break;
      
    case 'userStatus':
      updateUserStatus(message.userId, message.status);
      break;
  }
};

// Chat ekranı açıldığında çağır
function openChatWithUser(userId) {
  currentChatUserId = userId;
  
  // Chat history yükle (REST API)
  loadChatHistory(userId);
  
  // Bu kullanıcıdan gelen okunmamış mesajları okundu yap (WebSocket)
  markMessagesAsReadFromUser(userId);
}

// Chat ekranı kapandığında çağır
function closeChatWithUser() {
  currentChatUserId = null;
}

// Mesaj gönder
function sendMessage(receiverId, content) {
  ws.send(JSON.stringify({
    type: 'message',
    receiverId: receiverId,
    content: content
  }));
}

// Belirli kullanıcıdan gelen mesajları okundu işaretle
function markMessagesAsReadFromUser(senderId) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'read',
      senderId: senderId
    }));
  }
}

// Tüm mesajları okundu işaretle
function markAllMessagesAsRead() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'read'
    }));
  }
}

// Chat history yükle (REST API)
async function loadChatHistory(userId) {
  try {
    const response = await fetch(`/chat/history/${userId}?limit=50`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    
    const data = await response.json();
    if (data.success) {
      displayChatHistory(data.data.messages);
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}
```

## 🌐 REST API Endpoints

### Authentication
Tüm endpoint'ler JWT token gerektirir:
```
Authorization: Bearer <your-jwt-token>
```

### 1. Chat History
```http
GET /chat/history/:userId?limit=50&offset=0&before=2025-01-01T12:00:00Z
```

**Parameters:**
- `userId`: Sohbet ettiğin kullanıcının ID'si
- `limit`: Kaç mesaj getir (max 100, default 50)
- `offset`: Kaç mesaj atla (pagination için)
- `before`: Bu tarihten önceki mesajlar
- `after`: Bu tarihten sonraki mesajlar

**Response:**
```javascript
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 123,
        "senderId": 1,
        "receiverId": 2,
        "content": "Hello!",
        "isRead": 1,
        "delivered": 1,
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "totalCount": 150,
    "hasMore": true,
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 150
    }
  }
}
```

### 2. Mark Messages as Read
```http
PUT /chat/mark-read/:userId
```

**Bu endpoint sadece belirli bir kullanıcıdan gelen mesajları okundu işaretler**

**Response:**
```javascript
{
  "success": true,
  "data": {
    "markedCount": 3  // Kaç mesaj okundu olarak işaretlendi
  }
}
```

### 2.1. Mark All Messages as Read (WebSocket Only)
Tüm mesajları okundu işaretlemek için WebSocket kullan:
```javascript
ws.send(JSON.stringify({ type: 'read' }));
```

### 3. Unread Count
```http
GET /chat/unread-count
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "unreadCount": 12
  }
}
```

### 4. Chat Statistics
```http
GET /chat/statistics
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "totalSent": 45,           // Kullanıcının gönderdiği toplam mesaj
    "totalReceived": 67,       // Kullanıcının aldığı toplam mesaj  
    "unreadCount": 5,          // Okunmamış mesaj sayısı
    "activeConversations": 8,  // Aktif konuşma sayısı
    "conversationUsers": [2, 5, 8, 12, 15, 18, 22, 25]  // Konuştuğu user ID'leri
  }
}
```

## 💾 Database Schema

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senderId INTEGER NOT NULL,
  receiverId INTEGER NOT NULL,
  content TEXT NOT NULL,
  isRead INTEGER DEFAULT 0,      -- 0: unread, 1: read
  delivered INTEGER DEFAULT 0,   -- 0: not delivered, 1: delivered
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id),
  FOREIGN KEY (receiverId) REFERENCES users(id)
);
```

## 🔄 Message Flow

### 1. Normal Message Flow (Both Online)
```
User A → WebSocket → Server → WebSocket → User B
                  ↓
              Database (delivered=1)
```

### 2. Offline Message Flow
```
User A → WebSocket → Server → Database (delivered=0)
                            ↓
When User B connects → Auto-send missed messages → delivered=1
```

### 3. Read Status Flow
```
// Belirli kullanıcıyla olan sohbet ekranı açıldığında
User B opens chat with User A → WebSocket {type: "read", senderId: A} → 
Server → Database (isRead=1 for messages from A to B)

// Genel okundu işaretle (tüm mesajlar)
User B → WebSocket {type: "read"} → Server → Database (isRead=1 for all messages to B)
```

### ⚠️ Önemli: Message Read Logic

Chat sisteminde **iki farklı read marking** stratejisi var:

1. **Specific User Read** (Önerilen)
   ```javascript
   // Kullanıcı ID 5 ile sohbet ekranı açıldığında
   ws.send({
     type: 'read',
     senderId: 5  // Sadece ID 5'ten gelen mesajları okundu yap
   });
   ```

2. **Global Read** (Genel kullanım)
   ```javascript
   // Tüm okunmamış mesajları okundu yap
   ws.send({
     type: 'read'
   });
   ```

**Frontend'te kullanım örneği:**
```javascript
// Chat component'inde, kullanıcı bir sohbet ekranı açtığında
function openChatWithUser(userId) {
  // Sohbet ekranını aç
  displayChatHistory(userId);
  
  // O kullanıcıdan gelen okunmamış mesajları okundu işaretle
  markMessagesAsReadFromUser(userId);
}

function markMessagesAsReadFromUser(senderId) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'read',
      senderId: senderId
    }));
  }
}
```

## 🛠️ Development Guide

### Adding New Message Types

1. **Update message router:**
```javascript
// websocket/handlers/message.router.js
case 'newMessageType':
  await handleNewMessageType(message, userId, connection);
  break;
```

2. **Create handler:**
```javascript
// modules/chat/controller/chat.controller.js
export async function handleNewMessageType(message, userId, connection) {
  // İşlemi yap
}
```

3. **Update schema if needed:**
```javascript
// modules/chat/schema.js
export const newMessageTypeSchema = {
  // Schema tanımı
};
```

### Adding New REST Endpoints

1. **Add controller:**
```javascript
// modules/chat/controller/chat.controller.js
export async function newEndpointController(request, reply) {
  // İşlemi yap
}
```

2. **Add route:**
```javascript
// modules/chat/routes/chat.routes.js
fastify.get('/new-endpoint', {
  schema: newEndpointSchema,
  preHandler: verifyToken,
  handler: newEndpointController
});
```

3. **Add schema:**
```javascript
// modules/chat/schema.js
export const newEndpointSchema = {
  // Schema tanımı
};
```

## 🧪 Testing Examples

### Test WebSocket Connection
```javascript
// Test script
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws', 'your-jwt-token');

ws.on('open', () => {
  // Test mesaj gönder
  ws.send(JSON.stringify({
    type: 'message',
    receiverId: 2,
    content: 'Test message'
  }));
});
```

### Test REST API
```bash
# 1. Chat history al
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/chat/history/2?limit=10"

# 2. Chat history pagination ile
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/chat/history/2?limit=20&offset=40"

# 3. Belirli tarih aralığında mesajlar
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/chat/history/2?before=2025-01-01T12:00:00Z&limit=10"

# 4. Mesajları okundu işaretle (belirli kullanıcıdan)
curl -X PUT \
     -H "Authorization: Bearer <token>" \
     "http://localhost:3000/chat/mark-read/2"

# 5. Toplam okunmamış mesaj sayısı
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/chat/unread-count"

# 6. Chat istatistikleri
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/chat/statistics"
```

### JavaScript API Usage Examples

```javascript
// API Base URL
const API_BASE = 'http://localhost:3000/chat';
const token = localStorage.getItem('token');

// 1. Get Chat History
async function getChatHistory(userId, options = {}) {
  const { limit = 50, offset = 0, before, after } = options;
  let url = `${API_BASE}/history/${userId}?limit=${limit}&offset=${offset}`;
  
  if (before) url += `&before=${before}`;
  if (after) url += `&after=${after}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Chat History:', data.data.messages);
      console.log('Total Messages:', data.data.totalCount);
      console.log('Has More:', data.data.hasMore);
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching chat history:', error);
  }
}

// 2. Mark Messages as Read
async function markMessagesAsRead(senderId) {
  try {
    const response = await fetch(`${API_BASE}/mark-read/${senderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log(`Marked ${data.data.markedCount} messages as read`);
      return data.data.markedCount;
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

// 3. Get Unread Message Count
async function getUnreadCount() {
  try {
    const response = await fetch(`${API_BASE}/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Unread Messages:', data.data.unreadCount);
      return data.data.unreadCount;
    }
  } catch (error) {
    console.error('Error fetching unread count:', error);
  }
}

// 4. Get Chat Statistics
async function getChatStatistics() {
  try {
    const response = await fetch(`${API_BASE}/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Chat Statistics:', data.data);
      /*
      Response örneği:
      {
        totalSent: 45,
        totalReceived: 67,
        unreadCount: 5,
        activeConversations: 8,
        conversationUsers: [2, 5, 8, 12, 15, 18, 22, 25]
      }
      */
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching chat statistics:', error);
  }
}

// 5. Pagination Helper Function
async function loadMoreMessages(userId, currentOffset = 0, limit = 20) {
  const result = await getChatHistory(userId, { 
    limit, 
    offset: currentOffset 
  });
  
  if (result && result.hasMore) {
    console.log('More messages available');
    return {
      messages: result.messages,
      nextOffset: currentOffset + limit,
      hasMore: result.hasMore
    };
  }
  
  return {
    messages: result?.messages || [],
    nextOffset: currentOffset,
    hasMore: false
  };
}

// 6. Complete Chat Loading Example
async function loadChatForUser(userId) {
  try {
    // Önce chat history yükle
    const history = await getChatHistory(userId, { limit: 50 });
    
    // Sonra o kullanıcıdan gelen mesajları okundu işaretle
    if (history && history.messages.length > 0) {
      await markMessagesAsRead(userId);
    }
    
    // Güncellenen unread count'u al
    const unreadCount = await getUnreadCount();
    
    return {
      messages: history?.messages || [],
      totalCount: history?.totalCount || 0,
      hasMore: history?.hasMore || false,
      unreadCount
    };
  } catch (error) {
    console.error('Error loading chat:', error);
    return null;
  }
}

// 7. Chat Dashboard Data
async function loadChatDashboard() {
  try {
    const [statistics, unreadCount] = await Promise.all([
      getChatStatistics(),
      getUnreadCount()
    ]);
    
    return {
      stats: statistics,
      unreadTotal: unreadCount,
      // Add recent conversations, active users etc.
    };
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return null;
  }
}
```

### React Component Examples

```jsx
// ChatComponent.jsx
import { useState, useEffect } from 'react';

function ChatComponent({ userId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Load initial chat history
  useEffect(() => {
    loadInitialChat();
  }, [userId]);

  const loadInitialChat = async () => {
    setLoading(true);
    try {
      const result = await getChatHistory(userId, { limit: 50 });
      if (result) {
        setMessages(result.messages);
        setHasMore(result.hasMore);
        setOffset(50);
        
        // Mark as read
        await markMessagesAsRead(userId);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    try {
      const result = await getChatHistory(userId, { 
        limit: 20, 
        offset: offset 
      });
      
      if (result) {
        setMessages(prev => [...result.messages, ...prev]);
        setHasMore(result.hasMore);
        setOffset(prev => prev + 20);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {hasMore && (
        <button onClick={loadMoreMessages} disabled={loading}>
          {loading ? 'Loading...' : 'Load More Messages'}
        </button>
      )}
      
      <div className="messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
          >
            <p>{message.content}</p>
            <small>{new Date(message.createdAt).toLocaleString()}</small>
            {message.senderId === currentUserId && (
              <span className={`status ${message.delivered ? 'delivered' : 'sending'}`}>
                {message.isRead ? '✓✓' : message.delivered ? '✓' : '⏳'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Chat Statistics Component
function ChatStats() {
  const [stats, setStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [statistics, unread] = await Promise.all([
        getChatStatistics(),
        getUnreadCount()
      ]);
      
      setStats(statistics);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (!stats) return <div>Loading stats...</div>;

  return (
    <div className="chat-stats">
      <div className="stat-card">
        <h3>Messages Sent</h3>
        <p>{stats.totalSent}</p>
      </div>
      <div className="stat-card">
        <h3>Messages Received</h3>
        <p>{stats.totalReceived}</p>
      </div>
      <div className="stat-card">
        <h3>Unread Messages</h3>
        <p>{unreadCount}</p>
      </div>
      <div className="stat-card">
        <h3>Active Conversations</h3>
        <p>{stats.activeConversations}</p>
      </div>
    </div>
  );
}
```

### Error Handling Examples

```javascript
// Comprehensive error handling
async function safeChatOperation(operation) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error('Chat operation failed:', error);
    
    if (error.response) {
      // API responded with error status
      const status = error.response.status;
      const message = error.response.data?.error || 'Unknown error';
      
      switch (status) {
        case 401:
          // Token expired, redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          return { success: false, error: 'Access denied' };
        case 404:
          return { success: false, error: 'User not found' };
        case 500:
          return { success: false, error: 'Server error, please try again' };
        default:
          return { success: false, error: message };
      }
    } else {
      // Network error
      return { success: false, error: 'Network error, check your connection' };
    }
  }
}

// Usage with error handling
async function loadChatSafely(userId) {
  const result = await safeChatOperation(
    () => getChatHistory(userId, { limit: 50 })
  );
  
  if (result.success) {
    console.log('Chat loaded successfully:', result.data);
    return result.data;
  } else {
    console.error('Failed to load chat:', result.error);
    // Show user-friendly error message
    showErrorMessage(result.error);
    return null;
  }
}
```

## 🚀 Future Enhancements

### Önerilecek Özellikler

1. **Typing Indicators**
   - WebSocket message type: `typing`
   - Real-time typing status

2. **Push Notifications**
   - Offline kullanıcılar için bildirim
   - FCM/APNS entegrasyonu

3. **Message Status**
   - Sent, Delivered, Read status
   - WhatsApp benzeri ✓✓ sistemi


---

## 📝 Notes

- WebSocket connection'ları memory'de tutulur, server restart'ta kaybolur
- Offline mesajlar database'de saklanır ve connection'da otomatik gönderilir
- Message history pagination ile optimize edilmiştir
- JWT token WebSocket header'da gönderilir (`sec-websocket-protocol`)
- Tüm API endpoint'leri Fastify schema validation kullanır
