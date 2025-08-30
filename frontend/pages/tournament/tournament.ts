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

  // DOM elements
  const tournamentStatus = document.getElementById('tournament-status');
  const participantCount = document.getElementById('participant-count');
  const participantsGrid = document.getElementById('participants-grid');
  const waitingMessage = document.getElementById('waiting-message');
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
  const countdownBar = document.getElementById('countdown-bar');
  const countdownText = document.getElementById('countdown-text');

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

      // Tournament durumunu kontrol et
      await loadTournamentData();
      
      // Event listeners'ı kurulum
      setupEventListeners();
      
      // Tournament service listeners
      setupTournamentListeners();
      
    } catch (error) {
      console.error('Error initializing tournament page:', error);
      notify('Failed to load tournament data');
      (window as any).router.navigate('home');
    }
  }

  async function loadTournamentData() {
    console.log('🔄 TOURNAMENT PAGE: Loading tournament data...');
    
    if (!currentUser) {
      console.error('❌ TOURNAMENT PAGE: No current user, cannot load tournament data');
      return;
    }
    
    // Tournament details'i backend'den al
    console.log('📡 TOURNAMENT PAGE: Requesting tournament details...');
    tournamentService.getTournamentDetails();
    
    // Also request bracket information
    setTimeout(() => {
      console.log('📡 TOURNAMENT PAGE: Requesting tournament bracket...');
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
        // Tournament sayfasındaysak ve kullanıcı tournament'ta ise bekle
        if (currentUser) {
          console.log('⏳ TOURNAMENT PAGE: User exists, retrying tournament data in 2 seconds...');
          setTimeout(() => {
            tournamentService.getTournamentDetails();
          }, 2000);
          return;
        }
        (window as any).router.navigate('home');
        return;
      }
      
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
      }
      loadTournamentData(); // Refresh participants
      notify(`Player joined tournament (${data.currentPlayers}/4)`);
    });

    tournamentService.onTournamentPlayerLeft((data) => {
      console.log('🎯 Player left:', data);
      if (currentTournament) {
        currentTournament.currentPlayers = data.currentPlayers;
      }
      loadTournamentData(); // Refresh participants
      notify(`Player left tournament (${data.currentPlayers}/4)`);
    });

    // Tournament started
    tournamentService.onTournamentStarted((data) => {
      console.log('🏆 Tournament started:', data);
      currentTournament = data;
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
      loadTournamentData(); // Refresh tournament data
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
  }

  function showPendingBracket() {
    if (!bracketContainer || !currentTournament) return;
    
    // 4 kişi var ama henüz başlamamış, bracket şablonunu göster
    bracketContainer.innerHTML = `
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-bold text-white mb-3 flex items-center">
            <span class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-sm mr-2">1</span>
            Semifinals
          </h3>
          <div class="grid grid-cols-1 gap-3">
            <div class="border border-gray-600 rounded-lg p-4 bg-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">?</div>
                  <span class="font-medium text-white">Random Player 1</span>
                </div>
                <div class="text-center px-4"><span class="text-gray-400 text-sm">VS</span></div>
                <div class="flex items-center space-x-3">
                  <span class="font-medium text-white">Random Player 2</span>
                  <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">?</div>
                </div>
              </div>
              <div class="text-center mt-2 text-sm"><span class="text-yellow-400">Starting soon...</span></div>
            </div>
            
            <div class="border border-gray-600 rounded-lg p-4 bg-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">?</div>
                  <span class="font-medium text-white">Random Player 3</span>
                </div>
                <div class="text-center px-4"><span class="text-gray-400 text-sm">VS</span></div>
                <div class="flex items-center space-x-3">
                  <span class="font-medium text-white">Random Player 4</span>
                  <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">?</div>
                </div>
              </div>
              <div class="text-center mt-2 text-sm"><span class="text-yellow-400">Starting soon...</span></div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 class="text-lg font-bold text-white mb-3 flex items-center">
            <span class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-sm mr-2">2</span>
            Final
          </h3>
          <div class="grid grid-cols-1 gap-3">
            <div class="border border-dashed border-gray-600 rounded-lg p-4 bg-gray-800/50">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold">?</div>
                  <span class="font-medium text-gray-400">Winner of Match 1</span>
                </div>
                <div class="text-center px-4"><span class="text-gray-400 text-sm">VS</span></div>
                <div class="flex items-center space-x-3">
                  <span class="font-medium text-gray-400">Winner of Match 2</span>
                  <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold">?</div>
                </div>
              </div>
              <div class="text-center mt-2 text-sm"><span class="text-gray-400">Awaiting semifinal winners</span></div>
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

  function updateParticipantsGrid() {
    if (!participantsGrid || !currentTournament) return;

    let html = '';
    
    // Show current participants
    currentTournament.participants.forEach((participant, index) => {
      const isCurrentUser = participant.id === currentUser?.id;
      const borderClass = isCurrentUser ? 'border-purple-400 bg-purple-500/10' : 'border-gray-600';
      
      html += `
        <div class="flex items-center space-x-3 p-3 border ${borderClass} rounded-lg">
          <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
            ${participant.username[0].toUpperCase()}
          </div>
          <div class="flex-1">
            <p class="font-medium text-white">${participant.username}</p>
            <p class="text-xs text-gray-400">${isCurrentUser ? 'You' : 'Player'}</p>
          </div>
          ${isCurrentUser ? '<span class="text-purple-400 text-sm">👤</span>' : ''}
        </div>
      `;
    });

    // Show empty slots
    const emptySlots = 4 - currentTournament.participants.length;
    for (let i = 0; i < emptySlots; i++) {
      html += `
        <div class="flex items-center space-x-3 p-3 border border-dashed border-gray-600 rounded-lg opacity-50">
          <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-400">
            ?
          </div>
          <div class="flex-1">
            <p class="text-gray-400">Waiting for player...</p>
          </div>
        </div>
      `;
    }

    participantsGrid.innerHTML = html;
  }

  function updateWaitingMessage() {
    if (!waitingMessage || !currentTournament) return;

    if (currentTournament.status === 'pending') {
      const remaining = 4 - currentTournament.currentPlayers;
      if (remaining > 0) {
        waitingMessage.innerHTML = `
          <p class="text-yellow-400 text-sm text-center">
            Waiting for ${remaining} more player${remaining !== 1 ? 's' : ''} to join...
          </p>
        `;
        waitingMessage.classList.remove('hidden');
      } else {
        waitingMessage.innerHTML = `
          <p class="text-green-400 text-sm text-center">
            Tournament is full! Starting soon...
          </p>
        `;
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
          <div class="flex items-center justify-center h-64 text-gray-400">
            <div class="text-center">
              <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-xl">⏳</span>
              </div>
              <p>Tournament bracket will appear when all 4 players join</p>
            </div>
          </div>
        `;
      }
      return;
    }

    if (!currentTournament.matches || currentTournament.matches.length === 0) {
      bracketContainer.innerHTML = `
        <div class="flex items-center justify-center h-64 text-gray-400">
          <div class="text-center">
            <div class="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading matches...</p>
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

    let html = '<div class="space-y-6">';
    
    Object.keys(rounds).forEach(roundKey => {
      const round = parseInt(roundKey);
      const roundMatches = rounds[round];
      const roundName = round === 1 ? 'Semifinals' : round === 2 ? 'Final' : `Round ${round}`;
      
      html += `
        <div>
          <h3 class="text-lg font-bold text-white mb-3 flex items-center">
            <span class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-sm mr-2">
              ${round}
            </span>
            ${roundName}
          </h3>
          <div class="grid grid-cols-1 gap-3">
      `;
      
      roundMatches.forEach(match => {
        const isCompleted = match.winnerId !== null;
        const isUserInMatch = match.player1Id === currentUser?.id || match.player2Id === currentUser?.id;
        const winner = match.winnerId === match.player1Id ? match.player1Username : match.player2Username;
        
        let statusClass = 'bg-gray-700 border-gray-600';
        if (isCompleted) {
          statusClass = 'bg-green-800/30 border-green-500';
        } else if (isUserInMatch) {
          statusClass = 'bg-purple-800/30 border-purple-400 ring-1 ring-purple-400/50';
        }
        
        html += `
          <div class="border ${statusClass} rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ${match.player1Username[0].toUpperCase()}
                </div>
                <span class="font-medium text-white">${match.player1Username}</span>
                ${match.winnerId === match.player1Id ? '<span class="text-yellow-400">👑</span>' : ''}
              </div>
              
              <div class="text-center px-4">
                <span class="text-gray-400 text-sm">VS</span>
              </div>
              
              <div class="flex items-center space-x-3">
                ${match.winnerId === match.player2Id ? '<span class="text-yellow-400">👑</span>' : ''}
                <span class="font-medium text-white">${match.player2Username}</span>
                <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ${match.player2Username[0].toUpperCase()}
                </div>
              </div>
            </div>
            
            <div class="text-center mt-2 text-sm">
              ${isCompleted 
                ? `<span class="text-green-400">Winner: ${winner}</span>`
                : isUserInMatch 
                  ? '<span class="text-purple-400">Your match</span>'
                  : '<span class="text-gray-400">In progress...</span>'
              }
            </div>
          </div>
        `;
      });
      
      html += '</div></div>';
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
            <div class="text-center">
              <p class="text-lg font-semibold text-white mb-2">${roundName}</p>
              <div class="flex items-center justify-center space-x-6">
                <div class="text-center">
                  <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                    ${currentUser?.username[0].toUpperCase()}
                  </div>
                  <p class="text-sm text-purple-200">${currentUser?.username}</p>
                </div>
                
                <div class="text-2xl font-bold text-white">VS</div>
                
                <div class="text-center">
                  <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                    ${opponent[0].toUpperCase()}
                  </div>
                  <p class="text-sm text-red-200">${opponent}</p>
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
    // Show match pairings with countdown
    if (roundTransition && transitionMessage && countdownText && countdownBar) {
      const pairingsText = data.pairings.map((p: any) => `${p.player1} vs ${p.player2}`).join(' | ');
      
      transitionMessage.textContent = `${data.roundName} Pairings!`;
      countdownText.textContent = `${pairingsText} | Matches start in ${data.startsIn}s`;
      
      roundTransition.classList.remove('hidden');
      waitingMessage?.classList.add('hidden');
      
      // Reset and animate countdown bar
      if (countdownBar) {
        (countdownBar as HTMLElement).style.width = '0%';
        setTimeout(() => {
          (countdownBar as HTMLElement).style.width = '100%';
        }, 100);
      }
      
      // Start countdown
      let timeLeft = data.startsIn || 5;
      const countdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownText) {
          countdownText.textContent = `${pairingsText} | Matches start in ${timeLeft}s`;
        }
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          if (transitionMessage) transitionMessage.textContent = 'Matches Starting!';
          if (countdownText) countdownText.textContent = 'Get ready to play!';
        }
      }, 1000);
      
      // Hide after matches start
      setTimeout(() => {
        roundTransition.classList.add('hidden');
        if (countdownBar) {
          (countdownBar as HTMLElement).style.width = '0%';
        }
      }, (data.startsIn || 5) * 1000 + 2000);
    }
    
    // Update display with pairings
    loadTournamentData();
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
    if (roundTransition && transitionMessage && countdownText && countdownBar) {
      const winnersList = data.winners.map((w: any) => w.username).join(', ');
      
      transitionMessage.textContent = `${data.roundName} Complete!`;
      countdownText.textContent = `Winners: ${winnersList} | ${data.nextRoundName} starts in ${data.nextRoundStartsIn}s`;
      
      roundTransition.classList.remove('hidden');
      
      // Animate countdown bar
      setTimeout(() => {
        if (countdownBar) {
          (countdownBar as HTMLElement).style.width = '100%';
        }
      }, 100);
      
      // Start countdown text
      let timeLeft = data.nextRoundStartsIn || 5;
      const countdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownText) {
          countdownText.textContent = `Winners: ${winnersList} | ${data.nextRoundName} starts in ${timeLeft}s`;
        }
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          roundTransition.classList.add('hidden');
          if (countdownBar) {
            (countdownBar as HTMLElement).style.width = '0%';
          }
        }
      }, 1000);
    }
    
    // Update bracket to highlight winners
    loadTournamentData();
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
}