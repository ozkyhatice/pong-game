import { ChatService } from '../../../services/ChatService.js';
import { WebSocketManager } from '../../../core/WebSocketManager.js';
import { GameService } from '../../../services/GameService.js';
import { notify } from '../../../core/notify.js';
import { AppState } from '../../../core/AppState.js';

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
  private gameService: GameService;
  private activeInvites: Map<number, any> = new Map(); // senderId -> invite

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
    this.gameService = new GameService();

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
    this.gameService.onGameInvite(this.handleGameInvite.bind(this));
    this.gameService.onInviteAccepted(this.handleInviteAccepted.bind(this));
    
    const wsManager = WebSocketManager.getInstance();
    if (!wsManager.isConnected()) {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        wsManager.connect(authToken);
      }
    }
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
        // Load stored invites after rendering messages
        this.loadStoredInvites();
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
    if (!message || (!message.from && !message.to)) return;
    
    const isForCurrentChat = 
      (message.from === this.friendUserId) ||  
      (message.to === this.friendUserId);      
    
    if (!isForCurrentChat) return;

    const apiMessage: ApiMessage = {
      id: message.id || Date.now(),
      senderId: message.from || this.currentUserId,
      receiverId: message.to || this.friendUserId,
      content: message.content,
      isRead: message.isRead || 0,
      delivered: message.delivered || 1,
      createdAt: message.createdAt ? message.createdAt.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    const messageElement = this.createMessageElement(apiMessage);
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }


  private handleGameInvite(message: any): void {
    if (!message || message.receiverId !== this.currentUserId) return;
    
    // Store invite in memory and localStorage
    this.storeGameInvite(message);
    
    // Remove old invite from this sender if exists
    this.removeInviteFromChat(message.senderId);
    
    // Add new invite to chat
    const inviteElement = this.createGameInviteElement(message);
    inviteElement.setAttribute('data-invite-sender', message.senderId.toString());
    this.chatMessages.appendChild(inviteElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private createGameInviteElement(invite: any): HTMLElement {
    const inviteDiv = document.createElement('div');
    inviteDiv.className = 'mb-4';
    
    inviteDiv.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-white text-sm font-bold">🎮</div>
        <div class="flex-1">
          <div class="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg shadow-sm border border-purple-200">
            <p class="text-slate-800 font-medium mb-3">
              <strong>${this.escapeHtml(invite.senderUsername)}</strong> invited you to play Pong!
            </p>
            <div class="flex gap-2">
              <button 
                class="accept-invite px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                data-sender-id="${invite.senderId}"
                data-sender-username="${this.escapeHtml(invite.senderUsername)}"
              >
                Accept
              </button>
              <button 
                class="reject-invite px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                data-sender-id="${invite.senderId}"
              >
                Reject  
              </button>
            </div>
          </div>
          <div class="text-xs text-slate-500 mt-1">Game Invitation</div>
        </div>
      </div>
    `;

    const acceptBtn = inviteDiv.querySelector('.accept-invite') as HTMLButtonElement;
    const rejectBtn = inviteDiv.querySelector('.reject-invite') as HTMLButtonElement;

    acceptBtn?.addEventListener('click', () => this.handleAcceptInvite(invite));
    rejectBtn?.addEventListener('click', () => this.handleRejectInvite(invite, inviteDiv));

    return inviteDiv;
  }

  private async handleAcceptInvite(invite: any): Promise<void> {
    try {
      notify('Accepting game invitation...');
      
      this.clearInviteFromStorage(invite.senderId);
      
      this.gameService.acceptGameInvite(invite.senderId);
      
      this.gameService.onRoomCreated((data: any) => {
        console.log('Room created:', data);
        notify('Game room created! Redirecting to lobby...');
        
        // Store room info in AppState
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [this.currentUserId, invite.senderId],
          createdAt: Date.now()
        });
        
        setTimeout(() => {
          const router = (window as any).router;
          if (router) {
            router.navigate('game-lobby');
          } else {
            window.location.href = '/game-lobby';
          }
        }, 1000);
      });

    } catch (error) {
      console.error('Failed to accept game invitation:', error);
      notify('Failed to accept invitation', 'red');
    }
  }

  private handleRejectInvite(invite: any, inviteElement: HTMLElement): void {
    notify('Game invitation rejected');
    
    // Clear invite from storage
    this.clearInviteFromStorage(invite.senderId);
    
    // Remove from chat
    inviteElement.remove();
  }

  private handleInviteAccepted(data: any): void {
    console.log('Game invite accepted:', data);
    notify(`Your game invitation was accepted! Room ${data.roomId} created.`);
    
    // Store room info in AppState
    const appState = AppState.getInstance();
    appState.setCurrentRoom({
      roomId: data.roomId,
      players: data.players || [this.currentUserId, data.acceptedBy],
      createdAt: Date.now()
    });
    
    // Navigate to game lobby
    setTimeout(() => {
      const router = (window as any).router;
      if (router) {
        router.navigate('game-lobby');
      }
    }, 1000);
  }

  private storeGameInvite(invite: any): void {
    // Store in memory
    this.activeInvites.set(invite.senderId, {
      ...invite,
      timestamp: Date.now()
    });

    // Store in localStorage for this chat pair
    const storageKey = `gameInvites_${this.currentUserId}_${this.friendUserId}`;
    const storedInvites = JSON.parse(localStorage.getItem(storageKey) || '{}');
    storedInvites[invite.senderId] = {
      ...invite,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(storedInvites));
  }

  private removeInviteFromChat(senderId: number): void {
    const existingInvite = this.chatMessages.querySelector(`[data-invite-sender="${senderId}"]`);
    if (existingInvite) {
      existingInvite.remove();
    }
  }

  private loadStoredInvites(): void {
    if (!this.currentUserId || !this.friendUserId) return;

    const storageKey = `gameInvites_${this.currentUserId}_${this.friendUserId}`;
    const storedInvites = JSON.parse(localStorage.getItem(storageKey) || '{}');

    // Load invites from the friend (where friend is sender)
    const friendInvite = storedInvites[this.friendUserId];
    if (friendInvite) {
      // Check if invite is still valid (less than 10 minutes old)
      const now = Date.now();
      const inviteAge = now - friendInvite.timestamp;
      if (inviteAge < 10 * 60 * 1000) { // 10 minutes
        this.activeInvites.set(friendInvite.senderId, friendInvite);
        const inviteElement = this.createGameInviteElement(friendInvite);
        inviteElement.setAttribute('data-invite-sender', friendInvite.senderId.toString());
        this.chatMessages.appendChild(inviteElement);
      } else {
        // Remove expired invite
        delete storedInvites[this.friendUserId];
        localStorage.setItem(storageKey, JSON.stringify(storedInvites));
      }
    }
  }

  private clearInviteFromStorage(senderId: number): void {
    // Remove from memory
    this.activeInvites.delete(senderId);

    // Remove from localStorage
    const storageKey = `gameInvites_${this.currentUserId}_${this.friendUserId}`;
    const storedInvites = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete storedInvites[senderId];
    localStorage.setItem(storageKey, JSON.stringify(storedInvites));
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

}