export function createChatTestPage(): HTMLElement {
  const chatTestPage = new ChatTestPage();
  return chatTestPage.getElement();
}

class ChatTestPage {
  private ws1: WebSocket | null = null;
  private ws2: WebSocket | null = null;
  private messageInput: HTMLInputElement | null = null;
  private messagesContainer: HTMLDivElement | null = null;
  private user1Messages: HTMLDivElement | null = null;
  private user2Messages: HTMLDivElement | null = null;
  private isChatOpen1 = false;
  private isChatOpen2 = false;
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.render();
    // Event listener'ları DOM hazır olduktan sonra bağla
    setTimeout(() => {
      this.setupEventListeners();
    }, 0);
  }

  getElement(): HTMLElement {
    return this.container;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Chat Test Sayfası</h1>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- User 1 Panel -->
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-xl font-semibold mb-4 text-blue-600">User 1 (hozkaaya)</h2>
              <div class="mb-4">
                <button id="connect1" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mr-2">
                  Bağlan
                </button>
                <button id="disconnect1" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                  Bağlantıyı Kes
                </button>
              </div>
              <div class="mb-4">
                <button id="openChat1" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2">
                  Mesajları Aç
                </button>
                <button id="closeChat1" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                  Mesajları Kapat
                </button>
              </div>
              <div class="mb-4">
                <input type="text" id="message1" placeholder="Mesajınızı yazın..." 
                       class="w-full p-2 border border-gray-300 rounded">
              </div>
              <div class="mb-4">
                <button id="send1" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded w-full">
                  Mesaj Gönder
                </button>
              </div>
              <div class="border border-gray-300 rounded p-3 h-64 overflow-y-auto bg-gray-50">
                <h3 class="font-semibold mb-2">Mesajlar:</h3>
                <div id="messages1" class="flex flex-col space-y-1" style="display: none;">
                  <div class="text-center text-gray-500 text-sm py-8">
                    Mesajları görmek için "Mesajları Aç" butonuna tıklayın
                  </div>
                </div>
              </div>
            </div>

            <!-- User 2 Panel -->
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-xl font-semibold mb-4 text-green-600">User 2 (skaynar)</h2>
              <div class="mb-4">
                <button id="connect2" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mr-2">
                  Bağlan
                </button>
                <button id="disconnect2" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                  Bağlantıyı Kes
                </button>
              </div>
              <div class="mb-4">
                <button id="openChat2" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2">
                  Mesajları Aç
                </button>
                <button id="closeChat2" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                  Mesajları Kapat
                </button>
              </div>
              <div class="mb-4">
                <input type="text" id="message2" placeholder="Mesajınızı yazın..." 
                       class="w-full p-2 border border-gray-300 rounded">
              </div>
              <div class="mb-4">
                <button id="send2" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded w-full">
                  Mesaj Gönder
                </button>
              </div>
              <div class="border border-gray-300 rounded p-3 h-64 overflow-y-auto bg-gray-50">
                <h3 class="font-semibold mb-2">Mesajlar:</h3>
                <div id="messages2" class="flex flex-col space-y-1" style="display: none;">
                  <div class="text-center text-gray-500 text-sm py-8">
                    Mesajları görmek için "Mesajları Aç" butonuna tıklayın
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Log Panel -->
          <div class="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">Sistem Logları</h2>
            <div id="logs" class="border border-gray-300 rounded p-3 h-32 overflow-y-auto bg-gray-50 text-sm font-mono">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    console.log('Event listener\'lar bağlanıyor...');
    
    // User 1 controls
    const connect1 = document.getElementById('connect1');
    const disconnect1 = document.getElementById('disconnect1');
    const openChat1 = document.getElementById('openChat1');
    const closeChat1 = document.getElementById('closeChat1');
    const send1 = document.getElementById('send1');
    
    console.log('User 1 butonları:', { connect1, disconnect1, openChat1, closeChat1, send1 });
    
    connect1?.addEventListener('click', () => {
      console.log('User 1 bağlan butonuna tıklandı');
      this.connectUser1();
    });
    disconnect1?.addEventListener('click', () => this.disconnectUser1());
    openChat1?.addEventListener('click', () => this.openChat(1));
    closeChat1?.addEventListener('click', () => this.closeChat(1));
    send1?.addEventListener('click', () => this.sendMessage(1));

    // User 2 controls
    const connect2 = document.getElementById('connect2');
    const disconnect2 = document.getElementById('disconnect2');
    const openChat2 = document.getElementById('openChat2');
    const closeChat2 = document.getElementById('closeChat2');
    const send2 = document.getElementById('send2');
    
    console.log('User 2 butonları:', { connect2, disconnect2, openChat2, closeChat2, send2 });
    
    connect2?.addEventListener('click', () => {
      console.log('User 2 bağlan butonuna tıklandı');
      this.connectUser2();
    });
    disconnect2?.addEventListener('click', () => this.disconnectUser2());
    openChat2?.addEventListener('click', () => this.openChat(2));
    closeChat2?.addEventListener('click', () => this.closeChat(2));
    send2?.addEventListener('click', () => this.sendMessage(2));

    // Message inputs
    this.messageInput = document.getElementById('message1') as HTMLInputElement;
    this.messagesContainer = document.getElementById('messages1') as HTMLDivElement;
    this.user1Messages = document.getElementById('messages1') as HTMLDivElement;
    this.user2Messages = document.getElementById('messages2') as HTMLDivElement;
  }

  private connectUser1(): void {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJvemt5eWhhdGljZUBnbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvemtheWEiLCJpYXQiOjE3NTM2MTg0OTd9.CgIEoR3nUyhUZkUAw_BMIv5oIT5lulMhqsyU52_-MKg';
    this.ws1 = new WebSocket('ws://localhost:3000/ws', token);
    
    this.ws1.onopen = () => {
      this.log('User 1 bağlandı');
    };

    this.ws1.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.log(`User 1 mesaj aldı: ${JSON.stringify(data)}`);
      console.log('User 1 raw message data:', data);
      this.addMessage(1, data);
      
      // Eğer mesajlar açıksa ve mesaj aldıysak, read durumunu koru
      if (this.isChatOpen1 && data.type === 'message') {
        setTimeout(() => {
          this.ws1?.send(JSON.stringify({ type: 'read' }));
          this.log('User 1 mesaj aldıktan sonra read durumu korundu');
        }, 100);
      }
    };

    this.ws1.onerror = (error) => {
      this.log(`User 1 hata: ${error}`);
    };

    this.ws1.onclose = () => {
      this.log('User 1 bağlantısı kapandı');
    };
  }

  private connectUser2(): void {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJoYXRpY2Vvemt5MjhAZ21haWwuY29tIiwidXNlcm5hbWUiOiJza2F5bmFyIiwiaWF0IjoxNzUzNjE4Njg3fQ.21Ib9P4gSTnofjIQbY2w4-CUakMPhcOYsT0JArcOkdc';
    this.ws2 = new WebSocket('ws://localhost:3000/ws', token);
    
    this.ws2.onopen = () => {
      this.log('User 2 bağlandı');
    };

    this.ws2.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.log(`User 2 mesaj aldı: ${JSON.stringify(data)}`);
      console.log('User 2 raw message data:', data);
      this.addMessage(2, data);
      
      // Eğer mesajlar açıksa ve mesaj aldıysak, read durumunu koru
      if (this.isChatOpen2 && data.type === 'message') {
        setTimeout(() => {
          this.ws2?.send(JSON.stringify({ type: 'read' }));
          this.log('User 2 mesaj aldıktan sonra read durumu korundu');
        }, 100);
      }
    };

    this.ws2.onerror = (error) => {
      this.log(`User 2 hata: ${error}`);
    };

    this.ws2.onclose = () => {
      this.log('User 2 bağlantısı kapandı');
    };
  }

  private disconnectUser1(): void {
    if (this.ws1) {
      this.ws1.close();
      this.ws1 = null;
      this.log('User 1 bağlantısı kesildi');
    }
  }

  private disconnectUser2(): void {
    if (this.ws2) {
      this.ws2.close();
      this.ws2 = null;
      this.log('User 2 bağlantısı kesildi');
    }
  }

  private openChat(userId: number): void {
    if (userId === 1) {
      this.isChatOpen1 = true;
    } else {
      this.isChatOpen2 = true;
    }
    
    const ws = userId === 1 ? this.ws1 : this.ws2;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'read' }));
      this.log(`User ${userId} mesajları açtı (type: read gönderildi)`);
      
      // Mesaj kutusunu görünür yap
      const messagesDiv = userId === 1 ? this.user1Messages : this.user2Messages;
      if (messagesDiv) {
        messagesDiv.style.display = 'flex';
        messagesDiv.style.flexDirection = 'column';
        messagesDiv.style.gap = '0.25rem';
      }
      
      // Bağlantı durumu mesajı ekle
      const statusMessage = {
        type: 'system',
        content: 'Mesajlar açıldı - artık mesajlaşabilirsiniz!',
        timestamp: new Date().toISOString()
      };
      this.addMessage(userId, statusMessage);
    }
  }

  private closeChat(userId: number): void {
    if (userId === 1) {
      this.isChatOpen1 = false;
    } else {
      this.isChatOpen2 = false;
    }
    
    this.log(`User ${userId} mesajları kapattı`);
    
    // Mesaj kutusunu gizle
    const messagesDiv = userId === 1 ? this.user1Messages : this.user2Messages;
    if (messagesDiv) {
      messagesDiv.innerHTML = '';
    }
    
    // Kapatma mesajı ekle
    const statusMessage = {
      type: 'system',
      content: 'Mesajlar kapatıldı',
      timestamp: new Date().toISOString()
    };
    this.addMessage(userId, statusMessage);
  }

  private sendMessage(userId: number): void {
    const input = document.getElementById(`message${userId}`) as HTMLInputElement;
    const message = input.value.trim();
    
    if (!message) return;

    const ws = userId === 1 ? this.ws1 : this.ws2;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const receiverId = userId === 1 ? 2 : 1;
      const messageData = {
        type: 'message',
        receiverId: receiverId,
        content: message
      };
      
      ws.send(JSON.stringify(messageData));
      this.log(`User ${userId} mesaj gönderdi: ${message}`);
      
      // Eğer mesajlar açıksa, mesaj gönderdikten sonra read durumunu koru
      const isChatOpen = userId === 1 ? this.isChatOpen1 : this.isChatOpen2;
      if (isChatOpen) {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'read' }));
          this.log(`User ${userId} read durumu korundu`);
        }, 100);
      }
      
      input.value = '';
    } else {
      this.log(`User ${userId} bağlı değil!`);
    }
  }

  private addMessage(userId: number, data: any): void {
    const messagesDiv = userId === 1 ? this.user1Messages : this.user2Messages;
    if (!messagesDiv) return;

    const messageDiv = document.createElement('div');
    
    if (data.type === 'message') {
      console.log(`User ${userId} mesaj işleniyor:`, data);
      
      // Mesajın kaynağını belirle
      let isFromCurrentUser = false;
      let senderName = '';
      
      // Backend'den gelen mesaj formatını kontrol et
      if (data.from === userId) {
        // Bu kullanıcının kendi gönderdiği mesaj (backend'den gelen kopya)
        isFromCurrentUser = true;
        senderName = 'Sen';
        console.log(`User ${userId} kendi mesajını alıyor (from: ${data.from})`);
      } else if (data.from && data.from !== userId) {
        // Başka kullanıcıdan gelen mesaj
        isFromCurrentUser = false;
        senderName = data.from === 1 ? 'hozkaaya' : 'skaynar';
        console.log(`User ${userId} başka kullanıcıdan mesaj alıyor: ${senderName}`);
      } else if (data.to && data.to !== userId) {
        // Kendi gönderdiğimiz mesajın onayı (to alanı var ama from yok)
        isFromCurrentUser = true;
        senderName = 'Sen';
        console.log(`User ${userId} kendi mesajının onayını alıyor (to: ${data.to})`);
      } else {
        // Bilinmeyen format
        console.log(`User ${userId} bilinmeyen mesaj formatı:`, data);
        isFromCurrentUser = false;
        senderName = 'Bilinmeyen';
      }
      
      if (isFromCurrentUser) {
        // Kendi mesajımız - sağda göster
        messageDiv.className = 'flex justify-end mb-2';
        messageDiv.innerHTML = `
          <div class="bg-blue-500 text-white p-2 rounded-lg max-w-xs">
            <div class="text-sm">${data.content}</div>
            <div class="text-xs text-blue-100 mt-1">${new Date().toLocaleTimeString()}</div>
          </div>
        `;
      } else {
        // Başkasının mesajı - solda göster
        messageDiv.className = 'flex justify-start mb-2';
        messageDiv.innerHTML = `
          <div class="bg-gray-200 p-2 rounded-lg max-w-xs">
            <div class="text-xs text-gray-600 mb-1">${senderName}</div>
            <div class="text-sm">${data.content}</div>
            <div class="text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString()}</div>
          </div>
        `;
      }
    } else if (data.type === 'userStatus') {
      // Kullanıcı durumu mesajı
      messageDiv.className = 'text-center my-2';
      messageDiv.innerHTML = `
        <div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          ${data.userID === 1 ? 'hozkaaya' : 'skaynar'} ${data.status === 'online' ? 'çevrimiçi' : 'çevrimdışı'}
        </div>
      `;
    } else if (data.type === 'system') {
      // Sistem mesajları
      messageDiv.className = 'text-center my-2';
      messageDiv.innerHTML = `
        <div class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
          ${data.content}
        </div>
      `;
    } else {
      // Diğer mesaj türleri
      messageDiv.className = 'p-2 bg-yellow-100 rounded text-sm mb-2';
      messageDiv.innerHTML = `
        <div class="text-gray-600">${JSON.stringify(data)}</div>
      `;
    }

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  private log(message: string): void {
    const logsDiv = document.getElementById('logs');
    if (logsDiv) {
      const logEntry = document.createElement('div');
      logEntry.className = 'text-gray-700';
      logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logsDiv.appendChild(logEntry);
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }
  }
} 