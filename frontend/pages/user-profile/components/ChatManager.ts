import { ChatService } from '../../../services/ChatService.js';
import { WebSocketManager } from '../../../core/WebSocketManager.js';
import { notify } from '../../../core/notify.js';
import { GameInviteManager } from './GameInviteManager.js';
import { getApiUrl, API_CONFIG } from '../../../config.js';

interface ApiMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: number;
  delivered: number;
  createdAt: string;
}

interface ChatHistoryResponse {
  success: boolean;
  data: {
    messages: ApiMessage[];
  };
}

export class ChatManager {
  private chatInput: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private chatMessages: HTMLElement;
  private currentUserId: number | null = null;
  private friendUserId: number | null = null;
  private isLoadingMessages = false;
  private chatService: ChatService;
  private gameInviteManager: GameInviteManager;
  private sentMessages = new Set<string>(); // Gönderilen mesajları takip etmek için

  constructor(
    chatInput: HTMLInputElement,
    sendBtn: HTMLButtonElement,
    chatMessages: HTMLElement,
    currentUserId: number | null,
    friendUserId: number | null
  ) {
    this.chatInput = chatInput;
    this.sendBtn = sendBtn;
    this.chatMessages = chatMessages;
    this.currentUserId = currentUserId;
    this.friendUserId = friendUserId;
    this.chatService = new ChatService();
    this.gameInviteManager = new GameInviteManager(chatMessages, currentUserId, friendUserId);

    this.setupEventListeners();
    this.setupWebSocketForChat();
  }

  private setupEventListeners(): void {
    this.sendBtn?.addEventListener('click', () => this.handleSendMessage());
    this.chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSendMessage();
    });
  }

  private setupWebSocketForChat(): void {
    this.chatService.onNewMessage(this.handleReceiveMessage.bind(this));
    
    const wsManager = WebSocketManager.getInstance();
    if (!wsManager.isConnected()) {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        wsManager.connect(authToken);
      }
    }
  }

  async loadChatMessages(): Promise<void> {
    console.log('loadChatMessages called with:', {
      isLoadingMessages: this.isLoadingMessages,
      friendUserId: this.friendUserId,
      currentUserId: this.currentUserId
    });
    
    if (this.isLoadingMessages || !this.friendUserId || !this.currentUserId) {
      console.log('Early return from loadChatMessages');
      return;
    }
    
    this.isLoadingMessages = true;
    
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT.HISTORY(this.friendUserId.toString())), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ChatHistoryResponse = await response.json();
      console.log('Chat API response:', data);
      
      if (data.success) {
        console.log('Rendering messages:', data.data.messages);
        this.renderMessages(data.data.messages);
        // Load stored invites after rendering messages
        this.gameInviteManager.loadStoredInvites();
      } else {
        console.error('API returned unsuccessful response:', data);
        notify('Failed to load messages', 'red');
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      notify('Failed to load messages. Please try again.', 'red');
    } finally {
      this.isLoadingMessages = false;
    }
  }

  private renderMessages(messages: ApiMessage[]): void {
    console.log('renderMessages called with:', messages.length, 'messages');
    console.log('Chat messages element:', this.chatMessages);
    
    this.chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
      this.chatMessages.innerHTML = `
        <div class="text-center text-slate-500 py-8">
          <p>NO MESSAGES YET. START A CONVERSATION!</p>
        </div>
      `;
      return;
    }
    
    messages.forEach((message, index) => {
      const messageElement = this.createMessageElement(message);
      this.chatMessages.appendChild(messageElement);
    });

    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    console.log('Messages rendered successfully');
  }

  private createMessageElement(message: ApiMessage): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-4';

    // Türkiye saati için +3 saat ekle
    const messageDate = new Date(message.createdAt);
    messageDate.setHours(messageDate.getHours() + 3);
    const displayTime = messageDate.toISOString().slice(11, 16); // HH:MM formatında
    
    const isFromMe = message.senderId === this.currentUserId;

    if (isFromMe) {
      messageDiv.innerHTML = `
        <div class="flex items-end gap-2 justify-end">
          <div class="max-w-[280px] min-w-[60px]">
            <div class="text-neon-white border border-neon-yellow border-opacity-50 p-3 rounded-lg shadow-sm bg-terminal-border break-words">
              <p class="leading-relaxed">${this.escapeHtml(message.content)}</p>
            </div>
            <div class="text-[10px] text-neon-white/30 mt-1 text-right">${displayTime}</div>
          </div>
          <div class="w-8 h-8 bg-neon-yellow rounded-full flex items-center justify-center text-console-bg text-sm font-bold flex-shrink-0">ME</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="flex items-end gap-2">
          <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-console-bg text-sm font-bold flex-shrink-0">U</div>
          <div class="max-w-[280px] min-w-[60px]">
            <div class="border border-neon-white border-opacity-50 p-3 rounded-lg shadow-sm bg-terminal-border break-words">
              <p class="text-neon-white leading-relaxed">${this.escapeHtml(message.content)}</p>
            </div>
            <div class="text-[10px] text-neon-white/30 mt-1">${displayTime}</div>
          </div>
        </div>
      `;
    }

    return messageDiv;
  }

  private async handleSendMessage(): Promise<void> {
    const message = this.chatInput.value.trim();
    if (!message || !this.friendUserId || !this.currentUserId) return;

    this.chatInput.value = '';
    this.chatInput.disabled = true;
    this.sendBtn.disabled = true;

    try {
      // Mesajı gönderilen mesajlar listesine ekle
      const messageKey = `${this.friendUserId}-${message}-${Date.now()}`;
      this.sentMessages.add(messageKey);

      // Hemen mesajı kendi ekranında göster
      const now = new Date();
      now.setHours(now.getHours() + 3); // Türkiye saati için +3 saat
      
      const sentMessage: ApiMessage = {
        id: Date.now(),
        senderId: this.currentUserId,
        receiverId: this.friendUserId,
        content: message,
        isRead: 0,
        delivered: 0,
        createdAt: now.toISOString().slice(0, 19).replace('T', ' ')
      };

      const messageElement = this.createMessageElement(sentMessage);
      this.chatMessages.appendChild(messageElement);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

      // Sonra WebSocket ile gönder
      this.chatService.sendMessage(this.friendUserId, message);

      // 5 saniye sonra sent mesajları temizle (memory leak önlemek için)
      setTimeout(() => {
        this.sentMessages.delete(messageKey);
      }, 5000);

    } catch (error) {
      notify('Failed to send message. Please try again.', 'red');
    } finally {
      this.chatInput.disabled = false;
      this.sendBtn.disabled = false;
      this.chatInput.focus();
    }
  }

  private async handleReceiveMessage(message: any): Promise<void> {
    if (!message || (!message.from && !message.to)) return;
    
    console.log('handleReceiveMessage received:', message);
    
    // Gönderdiğimiz mesajları kontrol et
    const messageKey = `${message.to}-${message.content}`;
    const isRecentlySent = Array.from(this.sentMessages).some(key => key.includes(messageKey));
    
    // Kendi gönderdiğiniz mesajları tekrar render etmeyin 
    const isFromMe = message.from === this.currentUserId || 
                     (message.from === undefined && message.to === this.friendUserId) ||
                     isRecentlySent;
    
    console.log('Message analysis:', {
      from: message.from,
      to: message.to,
      currentUserId: this.currentUserId,
      friendUserId: this.friendUserId,
      isFromMe,
      isRecentlySent
    });
    
    if (isFromMe) {
      console.log('Skipping own message');
      return;
    }
    
    const isForCurrentChat = 
      (message.from === this.friendUserId) ||  
      (message.to === this.friendUserId);      
    
    if (!isForCurrentChat) return;

    const apiMessage: ApiMessage = {
      id: message.id || Date.now(),
      senderId: message.from || this.friendUserId,
      receiverId: message.to || this.currentUserId,
      content: message.content,
      isRead: message.isRead || 0,
      delivered: message.delivered || 1,
      createdAt: message.createdAt ? message.createdAt.slice(0, 19).replace('T', ' ') : (() => {
        const now = new Date();
        now.setHours(now.getHours() + 3);
        return now.toISOString().slice(0, 19).replace('T', ' ');
      })()
    };

    const messageElement = this.createMessageElement(apiMessage);
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}