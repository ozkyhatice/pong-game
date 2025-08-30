import { AppState } from '../../core/AppState.js';
import { TournamentService } from '../../services/TournamentService.js';
import { UserService } from '../../services/UserService.js';
import { notify } from '../../core/notify.js';

interface TournamentData {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  currentPlayers: number;
  participants: Array<{
    id: number;
    username: string;
  }>;
  matches?: Array<{
    id: number;
    player1Id: number;
    player2Id: number;
    player1Username: string;
    player2Username: string;
    winnerId?: number;
    round: number;
  }>;
}

interface MatchDetails {
  matchId: number;
  opponent: string;
  round: number;
  roomId?: string;
}

export function init() {
  console.log('🏆 Tournament page initializing...');
  const appState = AppState.getInstance();
  const tournamentService = new TournamentService();
  const userService = new UserService();

  let currentTournament: TournamentData | null = null;
  let currentUser: any = null;
  let currentMatch: MatchDetails | null = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // DOM elements
  const tournamentStatus = document.getElementById('tournament-status');
  const participantCount = document.getElementById('participant-count');
  const participantsGrid = document.getElementById('participants-grid');
  const waitingMessage = document.getElementById('waiting-message');
  const waitingText = document.getElementById('waiting-text');
  const currentMatchInfo = document.getElementById('current-match-info');
  const matchDetails = document.getElementById('match-details');
  const startMatchBtn = document.getElementById('start-match-btn');
  const bracketContainer = document.getElementById('bracket-container');
  const leaveTournamentBtn = document.getElementById('leave-tournament-btn');
  const tournamentEndModal = document.getElementById('tournament-end-modal');
  const tournamentResultText = document.getElementById('tournament-result-text');
  const returnHomeBtn = document.getElementById('return-home-btn');
  const roundTransition = document.getElementById('round-transition');
  const transitionMessage = document.getElementById('transition-message');
  const countdownTimer = document.getElementById('countdown-timer');
  const countdownDisplay = document.getElementById('countdown-display');
  const countdownMessage = document.getElementById('countdown-message');
  const countdownBar = document.getElementById('countdown-bar');
  const countdownText = document.getElementById('countdown-text');
  const roundCountdownBar = document.getElementById('round-countdown-bar');
  const roundCountdownText = document.getElementById('round-countdown-text');
  const connectionStatus = document.getElementById('connection-status');
  const connectionIndicator = document.getElementById('connection-indicator');
  const connectionText = document.getElementById('connection-text');

  let countdownInterval: number | null = null;
  let wsReconnectInterval: number | null = null;

  // Initialize
  initPage();

  async function initPage() {
    try {
      // User'ı al
      currentUser = await userService.getCurrentUser();
      if (!currentUser) {
        notify('Please login first');
        (window as any).router.navigate('login');
        return;
      }

      // Tournament durumunu kontrol et - sadece initial request
      requestInitialTournamentData();
      
      // Event listeners'ı kurulum
      setupEventListeners();
      
      // Tournament service listeners
      setupTournamentListeners();
      
      // WebSocket reconnection handling
      setupWebSocketReconnection();
      
    } catch (error) {
      console.error('Error initializing tournament page:', error);
      notify('Failed to load tournament data');
      (window as any).router.navigate('home');
    }
  }

  function requestInitialTournamentData() {
    console.log('🔄 TOURNAMENT PAGE: Requesting initial tournament data...');
    
    if (!currentUser) {
      console.error('❌ TOURNAMENT PAGE: No current user, cannot load tournament data');
      return;
    }
    
    // Initial request for tournament details - only once at startup
    console.log('📡 TOURNAMENT PAGE: Requesting initial tournament details...');
    tournamentService.getTournamentDetails();
    
    // Also request bracket information
    setTimeout(() => {
      console.log('📡 TOURNAMENT PAGE: Requesting initial tournament bracket...');
      tournamentService.getTournamentBracket();
    }, 500);
  }

  function setupEventListeners() {
    // Leave tournament button
    leaveTournamentBtn?.addEventListener('click', handleLeaveTournament);
    
    // Start match button
    startMatchBtn?.addEventListener('click', handleStartMatch);
    
    // Return home button
    returnHomeBtn?.addEventListener('click', () => {
      (window as any).router.navigate('home');
    });
  }

  function setupTournamentListeners() {
    // Tournament details geldiğinde
    tournamentService.onTournamentDetails((data) => {
      console.log('📊 TOURNAMENT PAGE: Tournament details received:', data);
      currentTournament = data.tournament;
      
      if (!currentTournament) {
        console.log('❌ TOURNAMENT PAGE: No tournament data received');
        // Tournament sayfasındaysak ve kullanıcı tournament'ta ise bekle (max 3 retry)
        if (currentUser && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`⏳ TOURNAMENT PAGE: User exists, retrying tournament data in 2 seconds... (${retryCount}/${MAX_RETRIES})`);
          setTimeout(() => {
            tournamentService.getTournamentDetails();
          }, 2000);
          return;
        }
        console.log('❌ TOURNAMENT PAGE: Max retries reached or no user, navigating to home');
        (window as any).router.navigate('home');
        return;
      }
      
      // Reset retry count on successful data
      retryCount = 0;
      
      console.log(`📊 TOURNAMENT PAGE: Tournament ${currentTournament.id} status: ${currentTournament.status}, participants: ${currentTournament.participants?.length || 0}`);
      
      // Handle elimination status
      if (data.userStatus === 'eliminated') {
        console.log('❌ TOURNAMENT PAGE: User is eliminated');
        showEliminationStatus();
      } else if (data.userStatus === 'spectator') {
        console.log('👁️ TOURNAMENT PAGE: User is spectator');
        showSpectatorMode();
      } else {
        console.log('✅ TOURNAMENT PAGE: User is active participant');
      }
      
      updateTournamentDisplay();
    });

    // Player joined/left events
    tournamentService.onTournamentPlayerJoined((data) => {
      console.log('🎯 Player joined:', data);
      if (currentTournament) {
        currentTournament.currentPlayers = data.currentPlayers;
        // Update display without making new requests
        updateTournamentDisplay();
      }
      notify(`Player joined tournament (${data.currentPlayers}/4)`);
    });

    tournamentService.onTournamentPlayerLeft((data) => {
      console.log('🎯 Player left:', data);
      if (currentTournament) {
        currentTournament.currentPlayers = data.currentPlayers;
        // Update display without making new requests
        updateTournamentDisplay();
      }
      notify(`Player left tournament (${data.currentPlayers}/4)`);
    });

    // Tournament started
    tournamentService.onTournamentStarted((data) => {
      console.log('🏆 Tournament started:', data);
      // Update tournament with complete data from the event
      currentTournament = data.tournament || data;
      updateTournamentDisplay();
      notify('Tournament has started! Matches begin now.');
    });

    // Match pairings revealed
    tournamentService.onTournamentMatchPairings((data) => {
      console.log('🎯 Match pairings revealed:', data);
      showMatchPairingsCountdown(data);
    });

    // Match started
    tournamentService.onTournamentMatchStarted((data) => {
      console.log('🎮 Tournament match starting:', data);
      currentMatch = {
        matchId: data.matchId,
        opponent: data.opponent,
        round: data.round,
        roomId: data.roomId
      };
      
      notify(`Your match vs ${data.opponent} is starting!`);
      
      // Navigate directly to remote-game for tournaments (skip lobby)
      appState.setCurrentRoom({
        roomId: data.roomId,
        players: data.players || [],
        createdAt: Date.now()
      });
      (window as any).router.navigate('remote-game');
    });

    // Round completed (show winners)
    tournamentService.onTournamentRoundCompleted((data) => {
      console.log('🏆 Round completed:', data);
      showRoundCompletionDisplay(data);
      notify(data.message);
    });

    // Next round started
    tournamentService.onTournamentNextRound((data) => {
      console.log('🏆 Next round started:', data);
      // Update tournament data from the received event data
      if (data.tournament) {
        currentTournament = data.tournament;
        updateTournamentDisplay();
      }
      notify(`${data.roundName || `Round ${data.round}`} has begun!`);
    });

    // Tournament ended
    tournamentService.onTournamentEnded((data) => {
      console.log('🏆 Tournament ended:', data);
      showTournamentEndModal(data);
    });

    // New tournament created
    tournamentService.onNewTournamentCreated((data) => {
      console.log('🆕 New tournament created:', data);
      notify('A new tournament has been created!');
      // Don't navigate away if user is still in current tournament
      if (!currentUser || !currentTournament || currentTournament.status === 'completed') {
        (window as any).router.navigate('home');
      }
    });

    // Tournament bracket updates
    tournamentService.onTournamentBracket((data) => {
      console.log('📊 TOURNAMENT PAGE: Bracket data received:', data);
      if (data.tournament) {
        currentTournament = { ...currentTournament, ...data.tournament };
        updateTournamentDisplay();
      }
    });
  }

  function showPendingBracket() {
    if (!bracketContainer || !currentTournament) return;
    
    // 4 kişi var ama henüz başlamamış, bracket şablonunu göster
    bracketContainer.innerHTML = `
      <div class="space-y-12 font-mono">
        <!-- Semifinals Section -->
        <div class="w-full">
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-green-300 mb-2 tracking-wider">⚔️ SEMIFINALS ⚔️</h3>
            <div class="w-24 h-1 bg-gradient-to-r from-green-500 to-green-400 mx-auto rounded-full"></div>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <!-- Semifinal 1 -->
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-green-400/60 rounded-xl p-6 shadow-2xl">
              <div class="text-center">
                <div class="text-xs text-green-400 font-bold mb-3 tracking-widest">SEMIFINAL #1</div>
                
                <div class="space-y-4">
                  <div class="flex items-center justify-center space-x-4 p-3 bg-green-600/20 rounded-lg border border-green-400/50">
                    <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-green-300 shadow-lg">?</div>
                    <span class="text-green-100 font-bold text-lg">WARRIOR #1</span>
                  </div>
                  
                  <div class="text-green-400 font-bold text-xl animate-pulse">⚡ VS ⚡</div>
                  
                  <div class="flex items-center justify-center space-x-4 p-3 bg-green-600/20 rounded-lg border border-green-400/50">
                    <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-green-300 shadow-lg">?</div>
                    <span class="text-green-100 font-bold text-lg">WARRIOR #2</span>
                  </div>
                </div>
                
                <div class="mt-4 p-2 bg-yellow-500/20 border border-yellow-400 rounded-lg">
                  <span class="text-yellow-300 text-sm font-bold animate-pulse">⚡ BATTLE INCOMING ⚡</span>
                </div>
              </div>
            </div>
            
            <!-- Semifinal 2 -->
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-green-400/60 rounded-xl p-6 shadow-2xl">
              <div class="text-center">
                <div class="text-xs text-green-400 font-bold mb-3 tracking-widest">SEMIFINAL #2</div>
                
                <div class="space-y-4">
                  <div class="flex items-center justify-center space-x-4 p-3 bg-green-600/20 rounded-lg border border-green-400/50">
                    <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-green-300 shadow-lg">?</div>
                    <span class="text-green-100 font-bold text-lg">WARRIOR #3</span>
                  </div>
                  
                  <div class="text-green-400 font-bold text-xl animate-pulse">⚡ VS ⚡</div>
                  
                  <div class="flex items-center justify-center space-x-4 p-3 bg-green-600/20 rounded-lg border border-green-400/50">
                    <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-green-300 shadow-lg">?</div>
                    <span class="text-green-100 font-bold text-lg">WARRIOR #4</span>
                  </div>
                </div>
                
                <div class="mt-4 p-2 bg-yellow-500/20 border border-yellow-400 rounded-lg">
                  <span class="text-yellow-300 text-sm font-bold animate-pulse">⚡ BATTLE INCOMING ⚡</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Connection Arrow -->
        <div class="flex justify-center">
          <div class="text-green-400 text-3xl animate-bounce">⬇️</div>
        </div>
        
        <!-- Final Section -->
        <div class="w-full">
          <div class="text-center mb-8">
            <h3 class="text-3xl font-bold text-yellow-300 mb-2 tracking-wider">👑 GRAND FINAL 👑</h3>
            <div class="w-32 h-1 bg-gradient-to-r from-yellow-500 to-yellow-400 mx-auto rounded-full"></div>
          </div>
          
          <div class="flex justify-center">
            <div class="bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-dashed border-yellow-400/50 rounded-xl p-8 w-full max-w-md shadow-2xl">
              <div class="text-center">
                <div class="text-xs text-yellow-400 font-bold mb-4 tracking-widest">CHAMPIONSHIP MATCH</div>
                
                <div class="space-y-4">
                  <div class="flex items-center justify-center space-x-4 p-3 bg-gray-600/30 rounded-lg border border-gray-500">
                    <div class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 font-bold text-lg border-2 border-gray-500">?</div>
                    <span class="text-gray-400 font-bold text-lg">SEMIFINAL WINNER</span>
                  </div>
                  
                  <div class="text-gray-500 font-bold text-xl">⚡ VS ⚡</div>
                  
                  <div class="flex items-center justify-center space-x-4 p-3 bg-gray-600/30 rounded-lg border border-gray-500">
                    <div class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 font-bold text-lg border-2 border-gray-500">?</div>
                    <span class="text-gray-400 font-bold text-lg">SEMIFINAL WINNER</span>
                  </div>
                </div>
                
                <div class="mt-4 p-2 bg-gray-600/20 border border-gray-500 rounded-lg">
                  <span class="text-gray-400 text-sm font-bold">🏆 AWAITING CHAMPIONS 🏆</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updateTournamentDisplay() {
    if (!currentTournament) return;

    // Update header
    if (tournamentStatus) {
      tournamentStatus.textContent = currentTournament.status.charAt(0).toUpperCase() + currentTournament.status.slice(1);
    }

    // Update participant count
    if (participantCount) {
      participantCount.textContent = currentTournament.currentPlayers.toString();
    }

    // Update participants grid
    updateParticipantsGrid();

    // Update waiting message
    updateWaitingMessage();

    // Update bracket
    updateBracket();

    // Update current match info
    updateCurrentMatchInfo();
  }

  async function updateParticipantsGrid() {
    if (!participantsGrid || !currentTournament) return;

    let html = '';
    
    // Show current participants with avatars
    for (const participant of currentTournament.participants) {
      const isCurrentUser = participant.id === currentUser?.id;
      const borderClass = isCurrentUser ? 'border-green-400 bg-green-500/10' : 'border-gray-600';
      
      // Fetch user details for avatar
      let avatarUrl = '';
      try {
        const userDetails = await userService.getUserById(participant.id);
        avatarUrl = userDetails?.avatar || '';
      } catch (error) {
        console.log('Could not fetch user details for avatar');
      }
      
      html += `
        <div class="flex items-center space-x-3 p-3 border ${borderClass} rounded-lg bg-gray-800/50 font-mono">
          <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold border border-green-400">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="${participant.username}" class="w-full h-full rounded-full object-cover">` : participant.username[0].toUpperCase()}
          </div>
          <div class="flex-1">
            <p class="font-medium text-green-100">${participant.username}</p>
            <p class="text-xs text-green-400">${isCurrentUser ? 'YOU' : 'PLAYER'}</p>
          </div>
          ${isCurrentUser ? '<span class="text-green-400 text-sm">👤</span>' : ''}
        </div>
      `;
    }

    // Show empty slots
    const emptySlots = 4 - currentTournament.participants.length;
    for (let i = 0; i < emptySlots; i++) {
      html += `
        <div class="flex items-center space-x-3 p-3 border border-dashed border-gray-600 rounded-lg opacity-50 bg-gray-800/30 font-mono">
          <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 border border-gray-500">
            ?
          </div>
          <div class="flex-1">
            <p class="text-gray-400">WAITING FOR PLAYER...</p>
          </div>
        </div>
      `;
    }

    participantsGrid.innerHTML = html;
  }

  function updateWaitingMessage() {
    if (!waitingMessage || !waitingText || !currentTournament) return;

    if (currentTournament.status === 'pending') {
      const remaining = 4 - currentTournament.currentPlayers;
      if (remaining > 0) {
        waitingText.textContent = `WAITING FOR ${remaining} MORE PLAYER${remaining !== 1 ? 'S' : ''} TO JOIN...`;
        waitingMessage.classList.remove('hidden');
      } else {
        waitingText.textContent = 'TOURNAMENT IS FULL! STARTING SOON...';
        waitingMessage.classList.remove('hidden');
      }
    } else {
      waitingMessage.classList.add('hidden');
    }
  }

  function updateBracket() {
    if (!bracketContainer || !currentTournament) return;

    if (currentTournament.status === 'pending') {
      // 4 kişi dolmuşsa bracket'i göster, değilse bekleme mesajı
      if (currentTournament.currentPlayers === 4) {
        showPendingBracket();
      } else {
        bracketContainer.innerHTML = `
          <div class="flex items-center justify-center h-64 text-green-400">
            <div class="text-center font-mono">
              <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-400 animate-pulse">
                <span class="text-xl">⏳</span>
              </div>
              <p class="text-green-300">TOURNAMENT BRACKET WILL APPEAR WHEN ALL 4 PLAYERS JOIN</p>
            </div>
          </div>
        `;
      }
      return;
    }

    if (!currentTournament.matches || currentTournament.matches.length === 0) {
      bracketContainer.innerHTML = `
        <div class="flex items-center justify-center h-64 text-green-400">
          <div class="text-center font-mono">
            <div class="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p class="text-green-300">LOADING MATCHES...</p>
          </div>
        </div>
      `;
      return;
    }

    // Group matches by round
    const rounds: { [key: number]: any[] } = {};
    currentTournament.matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    // Create enhanced tournament bracket
    let html = '<div class="space-y-12 font-mono">';
    
    Object.keys(rounds).forEach(roundKey => {
      const round = parseInt(roundKey);
      const roundMatches = rounds[round];
      const roundName = round === 1 ? '⚔️ SEMIFINALS ⚔️' : round === 2 ? '👑 GRAND FINAL 👑' : `🏆 ROUND ${round} 🏆`;
      const roundColor = round === 2 ? 'text-yellow-300' : 'text-green-300';
      const borderColor = round === 2 ? 'from-yellow-500 to-yellow-400' : 'from-green-500 to-green-400';
      
      html += `
        <div class="w-full">
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold ${roundColor} mb-2 tracking-wider">${roundName}</h3>
            <div class="w-24 h-1 bg-gradient-to-r ${borderColor} mx-auto rounded-full"></div>
          </div>
          <div class="${round === 1 ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto' : 'flex justify-center'}">
      `;
      
      roundMatches.forEach((match, index) => {
        const isCompleted = match.winnerId !== null;
        const isUserInMatch = match.player1Id === currentUser?.id || match.player2Id === currentUser?.id;
        const winner = match.winnerId === match.player1Id ? match.player1Username : match.player2Username;
        
        let statusClass = 'bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-green-400/60';
        let statusText = '';
        let statusBg = '';
        
        if (isCompleted) {
          statusClass = 'bg-gradient-to-br from-green-800 to-green-900 border-2 border-green-400';
          statusText = `🏆 WINNER: ${winner.toUpperCase()} 🏆`;
          statusBg = 'bg-green-500/30 border-green-400 text-green-200';
        } else if (isUserInMatch) {
          statusClass = 'bg-gradient-to-br from-green-700 to-green-800 border-2 border-green-300 ring-2 ring-green-400/50';
          statusText = '⚡ YOUR BATTLE ⚡';
          statusBg = 'bg-green-600/40 border-green-300 text-green-100 animate-pulse';
        } else {
          statusText = '⚔️ BATTLE IN PROGRESS ⚔️';
          statusBg = 'bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse';
        }
        
        const matchNumber = round === 1 ? `#${index + 1}` : '';
        const matchLabel = round === 1 ? `SEMIFINAL ${matchNumber}` : 'CHAMPIONSHIP MATCH';
        
        html += `
          <div class="${statusClass} rounded-xl p-6 shadow-2xl ${round === 2 ? 'w-full max-w-md' : ''}">
            <div class="text-center">
              <div class="text-xs text-green-400 font-bold mb-4 tracking-widest">${matchLabel}</div>
              
              <div class="space-y-4">
                <div class="flex items-center justify-center space-x-4 p-4 bg-green-600/20 rounded-lg border border-green-400/50">
                  <div class="w-14 h-14 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-green-300 shadow-lg">
                    ${match.player1Username[0].toUpperCase()}
                  </div>
                  <div class="flex-1 text-center">
                    <span class="font-bold text-green-100 text-lg block">${match.player1Username}</span>
                    ${match.winnerId === match.player1Id ? '<div class="text-yellow-400 text-2xl">👑</div>' : ''}
                  </div>
                </div>
                
                <div class="text-green-400 font-bold text-2xl animate-pulse">⚡ VS ⚡</div>
                
                <div class="flex items-center justify-center space-x-4 p-4 bg-green-600/20 rounded-lg border border-green-400/50">
                  <div class="flex-1 text-center">
                    <span class="font-bold text-green-100 text-lg block">${match.player2Username}</span>
                    ${match.winnerId === match.player2Id ? '<div class="text-yellow-400 text-2xl">👑</div>' : ''}
                  </div>
                  <div class="w-14 h-14 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-green-300 shadow-lg">
                    ${match.player2Username[0].toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div class="mt-6 p-3 ${statusBg} rounded-lg border">
                <span class="font-bold text-sm">${statusText}</span>
              </div>
            </div>
          </div>
        `;
      });
      
      html += '</div></div>';
      
      // Add connection arrow between rounds
      if (round === 1 && rounds[2]) {
        html += `
          <div class="flex justify-center">
            <div class="text-green-400 text-3xl animate-bounce">⬇️</div>
          </div>
        `;
      }
    });
    
    html += '</div>';
    bracketContainer.innerHTML = html;
  }

  function updateCurrentMatchInfo() {
    if (!currentMatchInfo || !currentTournament) return;

    // Find user's current match
    if (currentTournament.matches) {
      const userMatch = currentTournament.matches.find(match => 
        (match.player1Id === currentUser?.id || match.player2Id === currentUser?.id) && !match.winnerId
      );

      if (userMatch) {
        const opponent = userMatch.player1Id === currentUser?.id ? userMatch.player2Username : userMatch.player1Username;
        const roundName = userMatch.round === 1 ? 'Semifinal' : userMatch.round === 2 ? 'Final' : `Round ${userMatch.round}`;
        
        if (matchDetails) {
          matchDetails.innerHTML = `
            <div class="text-center font-mono">
              <p class="text-lg font-semibold text-green-100 mb-2">${roundName.toUpperCase()}</p>
              <div class="flex items-center justify-center space-x-6">
                <div class="text-center">
                  <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2 border border-green-400">
                    ${currentUser?.username[0].toUpperCase()}
                  </div>
                  <p class="text-sm text-green-200 font-bold">${currentUser?.username}</p>
                </div>
                
                <div class="text-2xl font-bold text-green-100">VS</div>
                
                <div class="text-center">
                  <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2 border border-green-400">
                    ${opponent[0].toUpperCase()}
                  </div>
                  <p class="text-sm text-green-200 font-bold">${opponent}</p>
                </div>
              </div>
            </div>
          `;
        }
        
        currentMatchInfo.classList.remove('hidden');
      } else {
        currentMatchInfo.classList.add('hidden');
      }
    } else {
      currentMatchInfo.classList.add('hidden');
    }
  }

  function handleLeaveTournament() {
    if (confirm('Are you sure you want to leave the tournament?')) {
      tournamentService.leaveTournament();
      (window as any).router.navigate('home');
    }
  }

  function handleStartMatch() {
    // This button is more of a ready indicator
    // Actual match start is handled by the backend
    notify('Waiting for opponent to be ready...');
    if (startMatchBtn) {
      startMatchBtn.textContent = 'Waiting for opponent...';
      (startMatchBtn as HTMLButtonElement).disabled = true;
    }
  }

  function showMatchPairingsCountdown(data: any) {
    // Show 6-second countdown with new design
    if (countdownTimer && countdownDisplay && countdownMessage && countdownBar) {
      const pairingsText = data.pairings.map((p: any) => `${p.player1} vs ${p.player2}`).join(' | ');
      
      countdownMessage.textContent = `${data.roundName.toUpperCase()} STARTING`;
      if (countdownText) countdownText.textContent = 'GET READY!';
      
      // Hide waiting message and show countdown
      waitingMessage?.classList.add('hidden');
      countdownTimer.classList.remove('hidden');
      
      // Reset countdown bar
      (countdownBar as HTMLElement).style.width = '0%';
      
      // Start 6-second countdown
      let timeLeft = 6;
      if (countdownInterval) clearInterval(countdownInterval);
      
      countdownInterval = setInterval(() => {
        if (countdownDisplay) {
          countdownDisplay.textContent = timeLeft.toString();
        }
        if (countdownBar) {
          const progress = ((6 - timeLeft) / 6) * 100;
          (countdownBar as HTMLElement).style.width = `${progress}%`;
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
          clearInterval(countdownInterval!);
          countdownInterval = null;
          
          if (countdownMessage) countdownMessage.textContent = 'MATCHES STARTING!';
          if (countdownText) countdownText.textContent = 'BATTLE TIME!';
          if (countdownDisplay) countdownDisplay.textContent = 'GO!';
          
          // Hide countdown after 2 seconds
          setTimeout(() => {
            countdownTimer?.classList.add('hidden');
            if (countdownBar) {
              (countdownBar as HTMLElement).style.width = '0%';
            }
          }, 2000);
        }
      }, 1000);
    }
    
    // Display will be updated by WebSocket events - no need for additional requests
  }

  function showEliminationStatus() {
    // Show eliminated status
    if (currentMatchInfo) {
      currentMatchInfo.innerHTML = `
        <div class="bg-red-800/30 border border-red-500/50 rounded-lg p-6 text-center">
          <div class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">❌</span>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">You have been eliminated</h3>
          <p class="text-red-300 text-sm">You can watch the remaining matches or leave the tournament</p>
          <button id="leave-after-elimination" class="mt-4 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white">
            Leave Tournament
          </button>
        </div>
      `;
      currentMatchInfo.classList.remove('hidden');
      
      // Add leave handler
      const leaveBtn = currentMatchInfo.querySelector('#leave-after-elimination');
      leaveBtn?.addEventListener('click', () => {
        (window as any).router.navigate('home');
      });
    }
  }

  function showSpectatorMode() {
    // Show spectator status  
    if (currentMatchInfo) {
      currentMatchInfo.innerHTML = `
        <div class="bg-blue-800/30 border border-blue-500/50 rounded-lg p-6 text-center">
          <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">👁️</span>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">Spectating Tournament</h3>
          <p class="text-blue-300 text-sm">You are watching this tournament as a spectator</p>
        </div>
      `;
      currentMatchInfo.classList.remove('hidden');
    }
  }

  function showRoundCompletionDisplay(data: any) {
    // Show round completion info in sidebar
    if (roundTransition && transitionMessage && roundCountdownText && roundCountdownBar) {
      const winnersList = data.winners.map((w: any) => w.username).join(', ');
      
      transitionMessage.textContent = `${data.roundName.toUpperCase()} COMPLETE!`;
      roundCountdownText.textContent = `WINNERS: ${winnersList.toUpperCase()} | ${data.nextRoundName.toUpperCase()} STARTS IN ${data.nextRoundStartsIn}S`;
      
      roundTransition.classList.remove('hidden');
      
      // Reset and animate countdown bar
      (roundCountdownBar as HTMLElement).style.width = '0%';
      setTimeout(() => {
        if (roundCountdownBar) {
          (roundCountdownBar as HTMLElement).style.width = '100%';
        }
      }, 100);
      
      // Start countdown text
      let timeLeft = data.nextRoundStartsIn || 5;
      if (countdownInterval) clearInterval(countdownInterval);
      
      countdownInterval = setInterval(() => {
        timeLeft--;
        if (roundCountdownText) {
          roundCountdownText.textContent = `WINNERS: ${winnersList.toUpperCase()} | ${data.nextRoundName.toUpperCase()} STARTS IN ${timeLeft}S`;
        }
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval!);
          countdownInterval = null;
          roundTransition?.classList.add('hidden');
          if (roundCountdownBar) {
            (roundCountdownBar as HTMLElement).style.width = '0%';
          }
        }
      }, 1000);
    }
    
    // Bracket will be updated by WebSocket events - no need for additional requests
  }

  function showTournamentEndModal(data: any) {
    if (!tournamentEndModal || !tournamentResultText) return;

    const isWinner = data.winnerId === currentUser?.id;
    const message = isWinner 
      ? '🎉 Congratulations! You won the tournament!' 
      : `Tournament ended. Winner: ${data.winnerUsername || data.winnerId}`;
    
    tournamentResultText.textContent = message;
    tournamentEndModal.classList.remove('hidden');
  }

  function setupWebSocketReconnection() {
    // Check WebSocket connection status via WebSocketManager
    const checkConnection = () => {
      const wsManager = tournamentService['wsManager'] as any;
      const isConnected = wsManager?.isConnected() || false;
      
      if (connectionStatus && connectionIndicator && connectionText) {
        if (!isConnected) {
          connectionStatus.classList.remove('hidden');
          connectionIndicator.className = 'w-3 h-3 bg-red-500 rounded-full animate-pulse';
          connectionText.textContent = 'RECONNECTING...';
          
          // Try to reconnect via WebSocketManager
          if (wsManager?.reconnect) {
            wsManager.reconnect();
          }
        } else {
          connectionIndicator.className = 'w-3 h-3 bg-green-500 rounded-full';
          connectionText.textContent = 'CONNECTED';
          
          // Hide connection status after 2 seconds when connected
          setTimeout(() => {
            connectionStatus.classList.add('hidden');
          }, 2000);
          
          // Request fresh data only once when reconnected
          console.log('🔄 TOURNAMENT PAGE: Reconnected, requesting fresh tournament data');
          tournamentService.getTournamentDetails();
        }
      }
    };

    // Check connection every 5 seconds
    wsReconnectInterval = setInterval(checkConnection, 5000);
    
    // Also check on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkConnection();
      }
    });
    
    // Initial connection check
    setTimeout(checkConnection, 1000);
  }

  // Cleanup function
  function cleanup() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (wsReconnectInterval) {
      clearInterval(wsReconnectInterval);
      wsReconnectInterval = null;
    }
  }

  // Add cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
}