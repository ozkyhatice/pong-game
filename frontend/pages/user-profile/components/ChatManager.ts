import { ChatService } from '../../../services/ChatService.js';
import { WebSocketManager } from '../../../core/WebSocketManager.js';
import { notify } from '../../../core/notify.js';
import { GameInviteManager } from './GameInviteManager.js';
import { getApiUrl, API_CONFIG } from '../../../config.js';
import { UserService } from '../../../services/UserService.js';
import { XSSProtection, safeDOM } from '../../../core/XSSProtection.js';

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
  private sentMessages = new Set<string>();
  private userService: UserService;
  private currentUserAvatar: string | null = null;
  private friendUserAvatar: string | null = null;

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
    this.userService = new UserService();
    this.gameInviteManager = new GameInviteManager(chatMessages, currentUserId, friendUserId);

    this.setupEventListeners();
    this.setupWebSocketForChat();
    this.loadUserAvatars();
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

  private async loadUserAvatars(): Promise<void> {
    try {

      if (this.currentUserId) {
        const currentUser = await this.userService.getUserById(this.currentUserId);
        this.currentUserAvatar = currentUser?.avatar || null;
      }
      
      if (this.friendUserId) {
        const friendUser = await this.userService.getUserById(this.friendUserId);
        this.friendUserAvatar = friendUser?.avatar || null;
      }

    } catch (error) {}
  }

  async loadChatMessages(): Promise<void> {
    
    if (this.isLoadingMessages || !this.friendUserId || !this.currentUserId) {
      return;
    }
    
    this.isLoadingMessages = true;
    
    try {
      await this.loadUserAvatars();
      
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT.HISTORY(this.friendUserId.toString())), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ChatHistoryResponse = await response.json();
      
      if (data.success) {
        this.renderMessages(data.data.messages);
        this.gameInviteManager.loadStoredInvites();
      } else {
        notify('Failed to load messages', 'red');
      }
    } catch (error) {
      notify('Failed to load messages. Please try again.', 'red');
    } finally {
      this.isLoadingMessages = false;
    }
  }

  private renderMessages(messages: ApiMessage[]): void {
    
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
  }

  private createMessageElement(message: ApiMessage): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-4';

    const messageDate = new Date(message.createdAt);
    messageDate.setHours(messageDate.getHours() + 3);
    const displayTime = messageDate.toISOString().slice(11, 16);
    
    const isFromMe = message.senderId === this.currentUserId;

    if (isFromMe) {
      const avatarSrc = this.currentUserAvatar && this.currentUserAvatar.trim() !== '' 
        ? this.currentUserAvatar 
        : null;
        
      messageDiv.innerHTML = '';
      safeDOM.setHTML(messageDiv, `
        <div class="flex items-end gap-2 justify-end">
          <div class="max-w-[280px] min-w-[60px]">
            <div class="text-neon-white border border-neon-yellow border-opacity-50 p-3 rounded-lg shadow-sm bg-terminal-border break-words">
              <p class="leading-relaxed">${this.escapeHtml(message.content)}</p>
            </div>
            <div class="text-[10px] text-neon-white/30 mt-1 text-right">${displayTime}</div>
          </div>
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-neon-yellow">
            ${avatarSrc 
              ? `<img src="${XSSProtection.cleanInput(avatarSrc)}" alt="Your Avatar" class="w-full h-full object-cover">`
              : `<div class="w-full h-full bg-neon-yellow rounded-full flex items-center justify-center text-console-bg text-sm font-bold">ME</div>`
            }
          </div>
        </div>
      `);
    } else {
      const avatarSrc = this.friendUserAvatar && this.friendUserAvatar.trim() !== '' 
        ? this.friendUserAvatar 
        : null;
      
      messageDiv.innerHTML = '';
      safeDOM.setHTML(messageDiv, `
        <div class="flex items-end gap-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-neon-white">
            ${avatarSrc 
              ? `<img src="${XSSProtection.cleanInput(avatarSrc)}" alt="Friend Avatar" class="w-full h-full object-cover">`
              : `<div class="w-full h-full bg-neon-white rounded-full flex items-center justify-center text-console-bg text-sm font-bold">U</div>`
            }
          </div>
          <div class="max-w-[280px] min-w-[60px]">
            <div class="border border-neon-white border-opacity-50 p-3 rounded-lg shadow-sm bg-terminal-border break-words">
              <p class="text-neon-white leading-relaxed">${this.escapeHtml(message.content)}</p>
            </div>
            <div class="text-[10px] text-neon-white/30 mt-1">${displayTime}</div>
          </div>
        </div>
      `);
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
      const messageKey = `${this.friendUserId}-${message}-${Date.now()}`;
      this.sentMessages.add(messageKey);

      const now = new Date();
      now.setHours(now.getHours() + 3);
      
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

      this.chatService.sendMessage(this.friendUserId, message);

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
    
    
    const messageKey = `${message.to}-${message.content}`;
    const isRecentlySent = Array.from(this.sentMessages).some(key => key.includes(messageKey));
    
    const isFromMe = message.from === this.currentUserId || 
                     (message.from === undefined && message.to === this.friendUserId) ||
                     isRecentlySent;
    
    if (isFromMe) {
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
    return XSSProtection.escapeHTML(text);
  }
}