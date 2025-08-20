import { ChatService } from '../../../services/ChatService.js';
import { WebSocketManager } from '../../../core/WebSocketManager.js';
import { notify } from '../../../core/notify.js';

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
    console.log('Setting up WebSocket for chat...');
    this.chatService.onNewMessage(this.handleReceiveMessage.bind(this));

    const wsManager = WebSocketManager.getInstance();
    console.log('WebSocket connected?', wsManager.isConnected());

    if (!wsManager.isConnected()) {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        console.log('Reconnecting WebSocket...');
        wsManager.connect(authToken);
      }
    }

    wsManager.on('connected', () => {
      console.log('WebSocket connected in chat');
    });

    wsManager.on('disconnected', () => {
      console.log('WebSocket disconnected in chat');
    });

    wsManager.on('message', (data: any) => {
      console.log('Raw WebSocket message received in chat:', data);
    });
  }

  async loadChatMessages(): Promise<void> {
    if (this.isLoadingMessages || !this.friendUserId || !this.currentUserId) return;
    
    this.isLoadingMessages = true;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:3000/chat/history/${this.friendUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ChatHistoryResponse = await response.json();
      
      if (data.success) {
        this.renderMessages(data.data.messages);
      } else {
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
    this.chatMessages.innerHTML = '';
    
    messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      this.chatMessages.appendChild(messageElement);
    });

    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private createMessageElement(message: ApiMessage): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-4';

    // zamani local time a gore guncelliycem
    const displayTime = message.createdAt;
    const isFromMe = message.senderId === this.currentUserId;

    if (isFromMe) {
      messageDiv.innerHTML = `
        <div class="flex items-start gap-3 justify-end">
          <div class="flex-1">
            <div class="bg-blue-600 text-white p-3 rounded-lg shadow-sm">
              <p>${this.escapeHtml(message.content)}</p>
            </div>
            <div class="text-xs text-slate-500 mt-1 text-right">${displayTime}</div>
          </div>
          <div class="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white text-sm font-bold">ME</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">U</div>
          <div class="flex-1">
            <div class="bg-white p-3 rounded-lg shadow-sm">
              <p class="text-slate-800">${this.escapeHtml(message.content)}</p>
            </div>
            <div class="text-xs text-slate-500 mt-1">${displayTime}</div>
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
      this.chatService.sendMessage(this.friendUserId, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      notify('Failed to send message. Please try again.', 'red');
    } finally {
      this.chatInput.disabled = false;
      this.sendBtn.disabled = false;
      this.chatInput.focus();
    }
  }

  private async handleReceiveMessage(message: any): Promise<void> {
    console.log('Received WebSocket message:', message);
    console.log('Current chat context:', { currentUserId: this.currentUserId, friendUserId: this.friendUserId });
    
    if (!message) {
      console.error('Message is undefined!');
      return;
    }
    
    if (!message.from && !message.to) {
      console.error('Message missing from or to:', message);
      return;
    }
    
    const isForCurrentChat = 
      (message.from === this.friendUserId) ||  
      (message.to === this.friendUserId);      
    
    console.log('Is message for current chat?', isForCurrentChat);
    
    if (!isForCurrentChat) {
      console.log('Message not for current chat, ignoring');
      return;
    }

    console.log('Processing message for current chat');

    const apiMessage: ApiMessage = {
      id: message.id || Date.now(),
      senderId: message.from || this.currentUserId,
      receiverId: message.to || this.friendUserId,
      content: message.content,
      isRead: message.isRead || 0,
      delivered: message.delivered || 1,
      createdAt: message.createdAt ? message.createdAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    console.log('Adding message to UI:', apiMessage);
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