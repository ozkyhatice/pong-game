import { Component } from '../../../core/Component.js';
import { notify } from '../../../core/notify.js';
import { AppState } from '../../../core/AppState.js';
import { GameService } from '../../../services/GameService.js';
import { UserService } from '../../../services/UserService.js';
import { TournamentService } from '../../../services/TournamentService.js';

export class GameAreaComponent extends Component {
  private gameService = new GameService();
  private userService = new UserService();
  private tournamentService = new TournamentService();
  private currentTournament: any = null;
  private tournamentBracket: any = null;

  constructor() {
    super();
    this.render();
    this.setupEvents();
    this.loadInvites();
    this.listenForInvites();
    this.setupTournamentListeners();
    this.loadTournamentData();
    this.checkUserTournamentStatus();
  }

  private render(): void {
    this.setHTML(`
      <!-- Game Content -->
      <div class="flex-1 p-6 overflow-y-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">🎮 Choose Game Mode</h2>

          <!-- Matchmaking Section -->
          <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 class="text-lg font-semibold text-blue-800 mb-3">🎯 Random Match</h3>
            <p class="text-blue-600 text-sm mb-4">System will find you a random opponent</p>
            <div class="flex space-x-3">
              <button id="join-matchmaking-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Find Random Game
              </button>
              <button id="leave-matchmaking-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors hidden">
                Leave Queue
              </button>
            </div>
            <div id="queue-status" class="mt-2 text-sm text-blue-600 hidden">
              In queue... Looking for opponent...
            </div>
          </div>

          <!-- Tournament Section -->
          <div class="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 class="text-lg font-semibold text-purple-800 mb-3">🏆 Tournament</h3>
            
            <!-- Return to Tournament Button (shown when user is in active tournament) -->
            <div id="tournament-return" class="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg hidden">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-green-800">You're in an active tournament!</p>
                  <p class="text-sm text-green-600">Return to view your progress</p>
                </div>
                <button id="return-tournament-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Return to Tournament
                </button>
              </div>
            </div>
            <div id="tournament-info" class="mb-4">
              <div id="no-tournament" class="text-purple-600 text-sm">Loading tournament info...</div>
              <div id="tournament-details" class="hidden">
                <div class="flex justify-between items-center mb-3">
                  <span class="font-medium">Players: <span id="tournament-players">0</span>/4</span>
                  <span class="text-sm bg-purple-100 px-2 py-1 rounded" id="tournament-status">pending</span>
                </div>
                
                <!-- Participants List -->
                <div id="tournament-participants" class="mb-3">
                  <h4 class="font-medium text-sm text-purple-700 mb-2">Participants:</h4>
                  <div id="participants-list" class="grid grid-cols-2 gap-2">
                    <!-- Participants will be populated here -->
                  </div>
                </div>
                
                <div class="text-xs text-purple-600 mt-2" id="tournament-waiting">
                  Waiting for more players to join...
                </div>
                
                <!-- Tournament Bracket Preview -->
                <div id="tournament-bracket-preview" class="mt-4 hidden">
                  <h4 class="font-medium mb-2 text-purple-700">Tournament Bracket:</h4>
                  <div id="bracket-preview-container" class="text-sm bg-purple-50 p-3 rounded border">
                    <div class="text-center text-gray-600">Bracket will appear when tournament starts</div>
                  </div>
                </div>
                
                <!-- Match Pairings -->
                <div id="tournament-matches" class="mt-4 hidden">
                  <h4 class="font-medium mb-2">Current Round Matches:</h4>
                  <div id="matches-container" class="space-y-2"></div>
                </div>
              </div>
            </div>
            <div class="flex space-x-3">
              <button id="join-tournament-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Join Tournament
              </button>
              <button id="leave-tournament-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors hidden">
                Leave Tournament
              </button>
            </div>
          </div>

          <!-- Friend Invite Section -->
          <div class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 class="text-lg font-semibold text-green-800 mb-3">👥 Invite Friend</h3>
            <p class="text-green-600 text-sm mb-4">Invite your friend to play</p>
            <div class="flex space-x-3">
              <input 
                type="text" 
                id="friend-username-input" 
                placeholder="Friend Username" 
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
              <button id="send-invite-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Send Invite
              </button>
            </div>
          </div>

          <!-- Game Invites -->
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">🎯 Game Invites</h3>
            <div id="invites-container" class="space-y-2">
              <div id="no-invites" class="text-gray-500 text-sm text-center py-2">No game invites</div>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  private setupEvents(): void {
    const joinBtn = this.element.querySelector('#join-matchmaking-btn');
    const leaveBtn = this.element.querySelector('#leave-matchmaking-btn');
    const sendBtn = this.element.querySelector('#send-invite-btn');
    const usernameInput = this.element.querySelector('#friend-username-input');
    
    // Tournament buttons
    const joinTournamentBtn = this.element.querySelector('#join-tournament-btn');
    const leaveTournamentBtn = this.element.querySelector('#leave-tournament-btn');
    const returnTournamentBtn = this.element.querySelector('#return-tournament-btn');
    
    joinBtn?.addEventListener('click', this.handleJoinMatchmaking.bind(this));
    leaveBtn?.addEventListener('click', this.handleLeaveMatchmaking.bind(this));
    sendBtn?.addEventListener('click', this.handleSendInvite.bind(this));
    
    joinTournamentBtn?.addEventListener('click', this.handleJoinTournament.bind(this));
    leaveTournamentBtn?.addEventListener('click', this.handleLeaveTournament.bind(this));
    returnTournamentBtn?.addEventListener('click', this.handleReturnToTournament.bind(this));
  }

  private handleJoinMatchmaking(): void {
    notify('Matchmaking is not implemented yet');
  }

  private handleLeaveMatchmaking(): void {
    notify('Matchmaking is not implemented yet');
  }

  private async handleSendInvite(): Promise<void> {
    const input = this.element.querySelector('#friend-username-input') as HTMLInputElement;
    const username = input?.value.trim();
    
    if (!username) {
      notify('Please enter a username');
      return;
    }

    try {
      const targetUser = await this.userService.getUserByUsername(username);
      if (!targetUser) {
        notify('User not found');
        return;
      }

      const currentUser = await this.userService.getCurrentUser();
      if (!currentUser) {
        notify('Please login');
        return;
      }

      this.gameService.sendGameInvite(targetUser.id, currentUser.username);
      notify(`Game invite sent to ${username}`);
      input.value = '';
    } catch (error) {
      notify('Failed to send invite');
    }
  }

  private loadInvites(): void {
    const invites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    this.displayInvites(invites);
  }

  private listenForInvites(): void {
    this.gameService.onGameInvite((data) => {
      this.addInvite(data);
      notify(`Game invite from ${data.senderUsername}`);
    });

    this.gameService.onInviteAccepted((data) => {
      console.log('Invite accepted data:', data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now()
        });
        notify('Room created! Joining lobby...');
        (window as any).router.navigate('game-lobby');
      }
    });

    this.gameService.onRoomCreated((data) => {
      console.log('Room created data:', data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now()
        });
        notify('Room ready! Joining lobby...');
        (window as any).router.navigate('game-lobby');
      }
    });
  }

  private addInvite(invite: any): void {
    const invites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    
    // Remove old invite from same sender
    const filteredInvites = invites.filter((inv: any) => inv.senderId !== invite.senderId);
    
    // Add new invite with timestamp
    const inviteWithTimestamp = {
      ...invite,
      timestamp: Date.now()
    };
    filteredInvites.push(inviteWithTimestamp);
    
    localStorage.setItem('gameInvites', JSON.stringify(filteredInvites));
    this.displayInvites(filteredInvites);
  }

  private displayInvites(invites: any[]): void {
    const container = this.element.querySelector('#invites-container');
    const noInvites = this.element.querySelector('#no-invites');
    
    if (!container) return;

    // Mevcut davetleri temizle (no-invites hariç)
    container.querySelectorAll('.invite-item').forEach(item => item.remove());

    if (invites.length === 0) {
      if (noInvites) noInvites.classList.remove('hidden');
      return;
    }

    if (noInvites) noInvites.classList.add('hidden');

    invites.forEach(invite => {
      const inviteEl = document.createElement('div');
      inviteEl.className = 'invite-item flex items-center justify-between p-2 bg-white rounded border border-gray-200';
      inviteEl.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
            ${invite.senderUsername?.[0]?.toUpperCase() || 'U'}
          </div>
          <span class="font-medium text-gray-800">${invite.senderUsername || 'Unknown'}</span>
        </div>
        <div class="flex space-x-2">
          <button class="accept-btn px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs">Accept</button>
          <button class="reject-btn px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">Reject</button>
        </div>
      `;

      // Event listeners
      inviteEl.querySelector('.accept-btn')?.addEventListener('click', () => this.acceptInvite(invite));
      inviteEl.querySelector('.reject-btn')?.addEventListener('click', () => this.rejectInvite(invite));

      container.appendChild(inviteEl);
    });
  }

  private acceptInvite(invite: any): void {
    this.gameService.acceptGameInvite(invite.senderId);
    this.removeInvite(invite.senderId);
    notify('Game invite accepted! Waiting for room...');
    
    // Room bilgisi invite-accepted event'inde gelecek, orada yönlendirme yapacağız
  }

  private rejectInvite(invite: any): void {
    this.removeInvite(invite.senderId);
    notify('Game invite rejected');
  }

  private removeInvite(senderId: number): void {
    const invites = JSON.parse(localStorage.getItem('gameInvites') || '[]');
    const filtered = invites.filter((inv: any) => inv.senderId !== senderId);
    localStorage.setItem('gameInvites', JSON.stringify(filtered));
    this.displayInvites(filtered);
  }

  // Tournament Methods
  private async handleJoinTournament(): Promise<void> {
    try {
      const currentUser = await this.userService.getCurrentUser();
      if (!currentUser) {
        notify('Please login first');
        return;
      }

      this.tournamentService.joinTournament();
      notify('Joining tournament...');
      
      // Store tournament state and navigate to tournament page after joining
      const appState = AppState.getInstance();
      setTimeout(() => {
        // Navigate to tournament page - we'll know we're in a tournament from the state
        (window as any).router.navigate('tournament');
      }, 500); // Wait a bit for join confirmation
      
    } catch (error) {
      console.error('Error joining tournament:', error);
      notify('Failed to join tournament');
    }
  }

  private handleLeaveTournament(): void {
    this.tournamentService.leaveTournament();
    notify('Leaving tournament...');
  }

  private handleReturnToTournament(): void {
    (window as any).router.navigate('tournament');
  }

  // Check if user is in an active tournament
  private async checkUserTournamentStatus(): Promise<void> {
    const returnSection = this.element.querySelector('#tournament-return');
    
    try {
      const currentUser = await this.userService.getCurrentUser();
      if (!currentUser) {
        returnSection?.classList.add('hidden');
        return;
      }

      // Check if user has currentTournamentId in database
      const response = await fetch(`/api/user/tournament-status/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 USER TOURNAMENT STATUS: User ${currentUser.id} status:`, data);
        
        if (data.isInTournament && !data.isEliminated && data.tournamentStatus !== 'completed') {
          console.log(`✅ USER TOURNAMENT STATUS: Showing return button for user in active tournament`);
          returnSection?.classList.remove('hidden');
          
          // Store in app state
          const appState = AppState.getInstance();
          appState.setCurrentTournament({
            tournamentId: data.tournamentId,
            status: data.tournamentStatus,
            isParticipant: true,
            joinedAt: Date.now()
          });
        } else {
          console.log(`❌ USER TOURNAMENT STATUS: Hiding return button (not in tournament, eliminated, or tournament completed)`);
          returnSection?.classList.add('hidden');
        }
      } else {
        console.log(`❌ USER TOURNAMENT STATUS: API call failed, hiding return button`);
        returnSection?.classList.add('hidden');
      }
    } catch (error) {
      console.error('Error checking tournament status:', error);
      returnSection?.classList.add('hidden');
    }
  }

  // Tournament data loading
  private loadTournamentData(): void {
    // Sayfa yüklendiğinde turnuva detaylarını al
    setTimeout(() => {
      this.tournamentService.getTournamentDetails();
    }, 1000); // WebSocket connection'ın hazır olması için kısa bekle
  }

  // Tournament event listeners
  private setupTournamentListeners(): void {
    // Oyuncu katıldığında
    this.tournamentService.onTournamentPlayerJoined((data) => {
      console.log('🎯 Tournament player joined event received:', data);
      this.updateTournamentInfo(data);
      this.loadTournamentData(); // Participant listesini güncelle
      notify(`Player joined tournament (${data.currentPlayers}/4)`);
    });

    // Oyuncu ayrıldığında
    this.tournamentService.onTournamentPlayerLeft((data) => {
      this.updateTournamentInfo(data);
      this.loadTournamentData(); // Participant listesini güncelle
      notify(`Player left tournament (${data.currentPlayers}/4)`);
    });

    // Turnuva başladığında
    this.tournamentService.onTournamentStarted((data) => {
      this.currentTournament = data;
      this.tournamentBracket = data.bracket;
      this.displayTournamentStarted(data);
      this.loadTournamentData(); // Güncel tournament details yükle
      notify(data.message || 'Tournament started!');
      
      // Eğer kullanıcı turnuvada ise tournament sayfasına yönlendir
      this.userService.getCurrentUser().then(currentUser => {
        if (currentUser && data.participants && data.participants.some((p: any) => p.id === currentUser.id)) {
          console.log('🏆 User is in tournament, staying on current page or going to tournament page');
          // Tournament sayfasında değilsek yönlendir
          if (window.location.pathname !== '/tournament') {
            (window as any).router.navigate('tournament');
          }
        }
      });
    });

    // Maç başladığında
    this.tournamentService.onTournamentMatchStarted((data) => {
      console.log('🎮 Tournament match starting from home:', data);
      notify(`Your match started against ${data.opponent}`);
      // Navigate directly to remote-game for tournaments (skip lobby)
      const appState = AppState.getInstance();
      appState.setCurrentRoom({
        roomId: data.roomId,
        players: data.players || [],
        createdAt: Date.now()
      });
      (window as any).router.navigate('remote-game');
    });

    // Sonraki round başladığında
    this.tournamentService.onTournamentNextRound((data) => {
      notify(`Round ${data.round} started!`);
      this.updateTournamentBracket(data);
    });

    // Turnuva bittiğinde
    this.tournamentService.onTournamentEnded((data) => {
      notify(data.message || 'Tournament ended!');
      this.resetTournamentDisplay();
      this.loadTournamentData(); // Yeni turnuva yüklenir
      this.checkUserTournamentStatus(); // Return button'u güncelle
    });

    // Yeni turnuva oluşturulduğunda
    this.tournamentService.onNewTournamentCreated((data) => {
      notify(data.message || 'New tournament created!');
      this.loadTournamentData();
    });

    // Turnuva detayları geldiğinde
    this.tournamentService.onTournamentDetails(async (data) => {
      console.log('🎯 Tournament details received:', data);
      this.currentTournament = data.tournament;
      await this.displayTournamentDetails(data.tournament);
      
      // Store tournament state if user is participant
      const currentUser = await this.userService.getCurrentUser();
      if (currentUser && data.tournament && data.tournament.participants.some((p: any) => p.id === currentUser.id)) {
        const appState = AppState.getInstance();
        appState.setCurrentTournament({
          tournamentId: data.tournament.id,
          status: data.tournament.status,
          isParticipant: true,
          currentRound: 1,
          joinedAt: Date.now()
        });
      }
    });

    // Bracket geldiğinde
    this.tournamentService.onTournamentBracket((data) => {
      this.tournamentBracket = data.bracket;
      this.displayTournamentBracket(data.bracket);
    });
  }

  // Tournament UI update methods
  private updateTournamentInfo(data: any): void {
    const playersElement = this.element.querySelector('#tournament-players');
    const waitingElement = this.element.querySelector('#tournament-waiting');
    
    if (playersElement) {
      playersElement.textContent = data.currentPlayers.toString();
    }
    
    if (waitingElement) {
      const remaining = 4 - data.currentPlayers;
      if (remaining > 0) {
        waitingElement.textContent = `Waiting for ${remaining} more players to join...`;
        waitingElement.classList.remove('hidden');
      } else {
        waitingElement.textContent = 'Tournament will start soon!';
        waitingElement.classList.remove('hidden');
      }
    }
  }

  private async displayTournamentDetails(tournament: any): Promise<void> {
    const noTournament = this.element.querySelector('#no-tournament');
    const tournamentDetails = this.element.querySelector('#tournament-details');
    const playersElement = this.element.querySelector('#tournament-players');
    const statusElement = this.element.querySelector('#tournament-status');
    const joinBtn = this.element.querySelector('#join-tournament-btn');
    const leaveBtn = this.element.querySelector('#leave-tournament-btn');

    if (!tournament) {
      // Aktif turnuva yok
      if (noTournament) noTournament.textContent = 'No active tournament';
      noTournament?.classList.remove('hidden');
      tournamentDetails?.classList.add('hidden');
      joinBtn?.classList.add('hidden');
      leaveBtn?.classList.add('hidden');
      return;
    }

    // Turnuva var, bilgileri göster
    noTournament?.classList.add('hidden');
    tournamentDetails?.classList.remove('hidden');

    if (playersElement) playersElement.textContent = tournament.currentPlayers.toString();
    if (statusElement) statusElement.textContent = tournament.status;

    // Waiting message güncelle
    const waitingElement = this.element.querySelector('#tournament-waiting');
    if (waitingElement) {
      if (tournament.status === 'pending') {
        const remaining = 4 - tournament.currentPlayers;
        if (remaining > 0) {
          waitingElement.textContent = `Waiting for ${remaining} more players to join...`;
        } else {
          waitingElement.textContent = 'Tournament will start soon!';
        }
        waitingElement.classList.remove('hidden');
      } else if (tournament.status === 'active') {
        waitingElement.textContent = 'Tournament in progress';
        waitingElement.classList.remove('hidden');
      } else {
        waitingElement.classList.add('hidden');
      }
    }

    // Buton durumlarını ayarla
    const currentUser = await this.userService.getCurrentUser();
    const isUserInTournament = currentUser && tournament.participants.some((p: any) => p.id === currentUser.id);

    if (isUserInTournament) {
      joinBtn?.classList.add('hidden');
      leaveBtn?.classList.remove('hidden');
    } else {
      if (tournament.status === 'pending' && tournament.currentPlayers < 4) {
        joinBtn?.classList.remove('hidden');
      } else {
        joinBtn?.classList.add('hidden');
      }
      leaveBtn?.classList.add('hidden');
    }

    // Katılımcı listesini göster
    this.displayTournamentParticipants(tournament.participants || []);

    // Eğer turnuva 4 kişi dolmuşsa bracket preview'i göster
    if (tournament.currentPlayers === 4) {
      const bracketPreview = this.element.querySelector('#tournament-bracket-preview');
      bracketPreview?.classList.remove('hidden');
      this.displayTournamentBracketPreview(tournament);
    }
    
    // Eğer turnuva başlamışsa matches'i göster
    if (tournament.status === 'active' && tournament.matches?.length > 0) {
      this.displayCurrentRoundMatches(tournament.matches);
    }
  }

  private displayTournamentStarted(data: any): void {
    const bracketElement = this.element.querySelector('#tournament-bracket');
    bracketElement?.classList.remove('hidden');
    this.displayTournamentBracket(data.bracket);
  }

  private displayTournamentBracket(bracket: any): void {
    if (!bracket) return;

    const container = this.element.querySelector('#bracket-container');
    if (!container) return;

    let html = '';
    
    bracket.forEach((round: any, roundIndex: number) => {
      html += `<div class="mb-4">`;
      html += `<h5 class="font-medium text-purple-700 mb-2">Round ${roundIndex + 1}</h5>`;
      html += `<div class="space-y-2">`;
      
      round.forEach((match: any, matchIndex: number) => {
        const player1Name = match.player1?.username || 'TBD';
        const player2Name = match.player2?.username || 'TBD';
        const winnerClass = match.winner ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200';
        
        html += `
          <div class="flex items-center justify-between p-2 border rounded ${winnerClass}">
            <span class="text-sm font-medium">${player1Name}</span>
            <span class="text-xs text-gray-500">vs</span>
            <span class="text-sm font-medium">${player2Name}</span>
          </div>
        `;
      });
      
      html += `</div></div>`;
    });

    container.innerHTML = html;
  }

  private displayTournamentMatches(matches: any[]): void {
    const container = this.element.querySelector('#bracket-container');
    if (!container) return;

    const rounds: { [key: number]: any[] } = {};
    
    // Maçları round'lara göre grupla
    matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    let html = '';
    
    Object.keys(rounds).forEach(roundKey => {
      const round = parseInt(roundKey);
      const roundMatches = rounds[round];
      
      html += `<div class="mb-4">`;
      html += `<h5 class="font-medium text-purple-700 mb-2">Round ${round}</h5>`;
      html += `<div class="space-y-2">`;
      
      roundMatches.forEach(match => {
        const isCompleted = match.winnerId !== null;
        const statusClass = isCompleted ? 'bg-green-100 border-green-300' : 'bg-yellow-100 border-yellow-300';
        const statusText = isCompleted ? 'Completed' : 'In Progress';
        
        html += `
          <div class="p-2 border rounded ${statusClass}">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium">${match.player1Username}</span>
              <span class="text-xs text-gray-500">vs</span>
              <span class="text-sm font-medium">${match.player2Username}</span>
            </div>
            <div class="text-xs text-center text-gray-600">
              ${isCompleted ? 
                `Winner: ${match.winnerId === match.player1Id ? match.player1Username : match.player2Username}` : 
                statusText
              }
            </div>
          </div>
        `;
      });
      
      html += `</div></div>`;
    });

    container.innerHTML = html;
  }

  private updateTournamentBracket(data: any): void {
    // Round güncellemelerini işle
    this.loadTournamentData(); // Güncel verileri yeniden yükle
  }

  private resetTournamentDisplay(): void {
    this.currentTournament = null;
    this.tournamentBracket = null;
    
    const noTournament = this.element.querySelector('#no-tournament');
    const tournamentDetails = this.element.querySelector('#tournament-details');
    const bracketElement = this.element.querySelector('#tournament-bracket');
    const matchesElement = this.element.querySelector('#tournament-matches');
    
    noTournament?.classList.remove('hidden');
    tournamentDetails?.classList.add('hidden');
    bracketElement?.classList.add('hidden');
    matchesElement?.classList.add('hidden');
  }

  // Katılımcı listesini gösterme
  private displayTournamentParticipants(participants: any[]): void {
    const container = this.element.querySelector('#participants-list');
    if (!container) return;

    let html = '';
    
    // Mevcut katılımcıları göster
    participants.forEach(participant => {
      html += `
        <div class="flex items-center space-x-2 p-2 bg-white rounded border">
          <div class="w-6 h-6 rounded-full bg-purple-400 flex items-center justify-center text-white text-xs font-bold">
            ${participant.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span class="text-sm font-medium">${participant.username}</span>
        </div>
      `;
    });
    
    // Boş slotları göster
    const emptySlots = 4 - participants.length;
    for (let i = 0; i < emptySlots; i++) {
      html += `
        <div class="flex items-center space-x-2 p-2 bg-gray-100 rounded border border-dashed border-gray-300">
          <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
            ?
          </div>
          <span class="text-sm text-gray-500">Waiting...</span>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // Aktif round maçlarını gösterme
  private displayCurrentRoundMatches(matches: any[]): void {
    const container = this.element.querySelector('#matches-container');
    const matchesSection = this.element.querySelector('#tournament-matches');
    if (!container || !matchesSection) return;

    // En yüksek round'u bul (aktif round)
    const currentRound = Math.max(...matches.map(m => m.round));
    const currentRoundMatches = matches.filter(m => m.round === currentRound && !m.winnerId);
    
    if (currentRoundMatches.length === 0) {
      matchesSection.classList.add('hidden');
      return;
    }

    matchesSection.classList.remove('hidden');

    let html = '';
    
    currentRoundMatches.forEach((match, index) => {
      const isUserInMatch = false; // TODO: Current user match kontrolü
      const highlightClass = isUserInMatch ? 'bg-yellow-100 border-yellow-400' : 'bg-white border-gray-200';
      
      html += `
        <div class="flex items-center justify-between p-3 border rounded ${highlightClass}">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
              ${match.player1Username?.[0]?.toUpperCase()}
            </div>
            <span class="font-medium">${match.player1Username}</span>
          </div>
          
          <div class="text-center">
            <div class="text-xs text-gray-500 mb-1">Round ${match.round}</div>
            <div class="font-bold text-purple-600">VS</div>
          </div>
          
          <div class="flex items-center space-x-3">
            <span class="font-medium">${match.player2Username}</span>
            <div class="w-8 h-8 rounded-full bg-red-400 flex items-center justify-center text-white font-bold text-sm">
              ${match.player2Username?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Tournament bracket preview'i gösterme (4 kişi dolduğunda)
  private displayTournamentBracketPreview(tournament: any): void {
    const container = this.element.querySelector('#bracket-preview-container');
    if (!container) return;

    const participants = tournament.participants || [];
    if (participants.length < 4) return;

    // Shuffle edilmiş görünüm için basic bracket template
    let html = `
      <div class="space-y-3">
        <div class="text-center font-medium text-purple-800 mb-2">Semifinals</div>
        <div class="grid grid-cols-1 gap-2">
          <div class="flex items-center justify-between p-2 bg-white rounded border">
            <span class="text-sm">Player 1</span>
            <span class="text-xs text-gray-500">vs</span>
            <span class="text-sm">Player 2</span>
          </div>
          <div class="flex items-center justify-between p-2 bg-white rounded border">
            <span class="text-sm">Player 3</span>
            <span class="text-xs text-gray-500">vs</span>
            <span class="text-sm">Player 4</span>
          </div>
        </div>
        
        <div class="text-center font-medium text-purple-800 mt-3 mb-2">Final</div>
        <div class="flex items-center justify-between p-2 bg-gray-100 rounded border border-dashed">
          <span class="text-sm text-gray-500">Winner 1</span>
          <span class="text-xs text-gray-400">vs</span>
          <span class="text-sm text-gray-500">Winner 2</span>
        </div>
        
        <div class="text-center text-xs text-purple-600 mt-2">
          🏆 Tournament will start soon! Players will be randomly matched.
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

}