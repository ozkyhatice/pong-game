import { GameService } from '../../../services/GameService.js';
import { notify } from '../../../core/notify.js';
import { AppState } from '../../../core/AppState.js';
import { XSSProtection, safeDOM } from '../../../core/XSSProtection.js';

export class GameInviteManager {
  private gameService: GameService;
  private chatMessages: HTMLElement;
  private currentUserId: number | null;
  private friendUserId: number | null;
  private activeInvites: Map<number, any> = new Map();

  constructor(
    chatMessages: HTMLElement,
    currentUserId: number | null,
    friendUserId: number | null
  ) {
    this.chatMessages = chatMessages;
    this.currentUserId = currentUserId;
    this.friendUserId = friendUserId;
    this.gameService = new GameService();
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.gameService.onGameInvite(this.handleGameInvite.bind(this));
    this.gameService.onInviteAccepted(this.handleInviteAccepted.bind(this));
  }

  public loadStoredInvites(): void {
    if (!this.currentUserId || !this.friendUserId) return;

    const storedInvites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    const friendInvite = storedInvites.find((inv: any) => inv.senderId === this.friendUserId);
    
    if (friendInvite) {
      const now = Date.now();
      const inviteAge = now - (friendInvite.timestamp || 0);
      if (inviteAge < 10 * 60 * 1000) {
        this.activeInvites.set(friendInvite.senderId, friendInvite);
        const inviteElement = this.createGameInviteElement(friendInvite);
        inviteElement.setAttribute('data-invite-sender', friendInvite.senderId.toString());
        safeDOM.appendChild(this.chatMessages, inviteElement);
      }
    }
  }

  private handleGameInvite(data: any): void {
    if (!data || data.receiverId !== this.currentUserId) return;
    
    this.storeGameInvite(data);
    this.removeInviteFromChat(data.senderId);
    
    const inviteElement = this.createGameInviteElement(data);
    inviteElement.setAttribute('data-invite-sender', data.senderId.toString());
    safeDOM.appendChild(this.chatMessages, inviteElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private createGameInviteElement(invite: any): HTMLElement {
    const inviteDiv = document.createElement('div');
    inviteDiv.className = 'mb-4';
    
    safeDOM.setHTML(inviteDiv, `
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-white text-sm font-bold">🎮</div>
        <div class="flex-1">
          <div class="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-lg shadow-sm border border-purple-200">
            <p class="text-slate-800 font-medium mb-3">
              <strong>${XSSProtection.escapeHTML(invite.senderUsername)}</strong> invited you to play Pong!
            </p>
            <div class="flex gap-2">
              <button 
                class="accept-invite px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                data-sender-id="${XSSProtection.cleanInput(invite.senderId.toString())}"
                data-sender-username="${XSSProtection.escapeHTML(invite.senderUsername)}"
              >
                Accept
              </button>
              <button 
                class="reject-invite px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                data-sender-id="${XSSProtection.cleanInput(invite.senderId.toString())}"
              >
                Reject  
              </button>
            </div>
          </div>
          <div class="text-xs text-slate-500 mt-1">Game Invitation</div>
        </div>
      </div>
    `);

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
        notify('Game room created! Redirecting to lobby...');
        
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
      notify('Failed to accept invitation', 'red');
    }
  }

  private handleRejectInvite(invite: any, inviteElement: HTMLElement): void {
    notify('Game invitation rejected');
    this.clearInviteFromStorage(invite.senderId);
    inviteElement.remove();
  }

  private handleInviteAccepted(data: any): void {
    notify(`Your game invitation was accepted! Room ${data.roomId} created.`);
    
    const appState = AppState.getInstance();
    appState.setCurrentRoom({
      roomId: data.roomId,
      players: data.players || [this.currentUserId, data.acceptedBy],
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
  }

  private storeGameInvite(invite: any): void {
    this.activeInvites.set(invite.senderId, {
      ...invite,
      timestamp: Date.now()
    });

    const storedInvites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    
    const filteredInvites = storedInvites.filter((inv: any) => inv.senderId !== invite.senderId);
  
    filteredInvites.push({
      ...invite,
      timestamp: Date.now()
    });
    
    localStorage.setItem('gameInvites', JSON.stringify(filteredInvites));
  }

  private removeInviteFromChat(senderId: number): void {
    const existingInvite = this.chatMessages.querySelector(`[data-invite-sender="${senderId}"]`);
    if (existingInvite) {
      existingInvite.remove();
    }
  }

  private clearInviteFromStorage(senderId: number): void {
    this.activeInvites.delete(senderId);

    const storedInvites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    const filteredInvites = storedInvites.filter((inv: any) => inv.senderId !== senderId);
    localStorage.setItem('gameInvites', JSON.stringify(filteredInvites));
  }

  private escapeHtml(text: string): string {
    return XSSProtection.escapeHTML(text);
  }
}