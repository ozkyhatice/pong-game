import { Component } from "../../../core/Component.js";
import { notify } from "../../../core/notify.js";
import { AppState } from "../../../core/AppState.js";
import { GameService } from "../../../services/GameService.js";
import { UserService } from "../../../services/UserService.js";
import { TournamentService } from "../../../services/TournamentService.js";
import { API_CONFIG, getApiUrl } from "../../../config.js";

export class GameAreaComponent extends Component {
  private gameService = new GameService();
  private userService = new UserService();
  private tournamentService = new TournamentService();
  private currentTournament: any = null;
  private tournamentBracket: any = null;

  constructor() {
    super();
    this.element.className = "h-full";
    this.render();
    this.setupEvents();
    this.loadInvites();
    this.listenForInvites();
    this.setupTournamentListeners();
    this.setupMatchmakingListeners();
    this.loadTournamentData();
    this.checkUserTournamentStatus();
  }

  private render(): void {
    this.setHTML(`
      <!-- Game Content -->
      <div class="w-full h-full flex flex-col rounded bg-console-bg border-2 border-neon-green shadow-terminal">
        <!-- Terminal Header -->
        <div class="bg-terminal-border border-b border-neon-green/30 flex-shrink-0">
          <div class="flex items-center justify-center p-3 bg-header-gradient">
            <!-- Center: Title -->
            <div class="flex items-center space-x-2">
              <span class="text-neon-green text-sm font-bold tracking-wider" style="text-shadow: 0 0 5px #39FF14;">GAME_ARENA.exe</span>
            </div>
          </div>
        </div>

        <!-- Content Area - Flex-1 to fill space -->
        <div class="flex-1 h-full">
          <div class="bg-radial-bg rounded border border-green-400/30 h-full flex flex-col">
            <!-- Player Status Section -->
            <div class="bg-console-bg text-left border-b border-neon-green border-opacity-30 flex-shrink-0">
              <div class="text-[10px] leading-relaxed text-neon-green space-y-1 px-3 py-2">
                <div class="flex items-center gap-1">
                  <div class="w-1 h-1 bg-neon-green rounded-full animate-pulse"></div>
                  <span>PLAYER STATUS: ONLINE</span>
                </div>
                <div class="text-neon-green">
                  > START YOUR GAME...
                </div>
              </div>
            </div>

            <!-- Game Modes Section -->
            <div class="bg-radial-bg p-6">

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- LEFT COLUMN: Quick Match + Invites -->
            <div class="space-y-6">
              <!-- Matchmaking Section -->
              <div class="p-6 bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 rounded border border-neon-yellow/50 shadow-lg">
                <h3 class="text-xl font-semibold text-neon-yellow mb-4">
                  QUICK MATCH
                </h3>

                <div class="mb-4">
                  <p class="text-neon-yellow/80 text-sm mb-4">Find an opponent automatically and start playing immediately!</p>

                  <div id="matchmaking-status" class="mb-4 p-3 bg-black/30 rounded border border-neon-yellow/30 hidden">
                    <div class="flex items-center">
                      <span class="inline-block animate-spin w-4 h-4 border-2 border-neon-yellow border-t-transparent rounded-full mr-3"></span>
                      <span class="text-neon-yellow">Searching for opponent...</span>
                    </div>
                  </div>
                </div>

                <div class="flex space-x-4">
                  <button id="join-matchmaking-btn" class="flex-1 bg-gradient-to-r from-neon-yellow to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-terminal-border font-bold py-3 px-6 rounded transition-all border border-neon-yellow shadow-lg hover:shadow-neon-yellow/25">
                    FIND MATCH
                  </button>
                  <button id="leave-matchmaking-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded transition-all border border-red-400 shadow-lg hover:shadow-red-500/25 hidden">
                    CANCEL
                  </button>
                </div>
              </div>

              <!-- Game Invites -->
              <div class="p-6 bg-gradient-to-r from-red-900/50 to-red-800/50 rounded border border-neon-red/50 shadow-lg">
                <h3 class="text-xl font-semibold text-neon-red mb-4">
                  BATTLE INVITATIONS
                </h3>
                <div id="invites-container" class="space-y-3">
                  <div id="no-invites" class="text-neon-red/80 text-sm text-center py-4 animate-pulse">
                    NO INCOMING CHALLENGES
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN: Tournament -->
            <div>
              <!-- Tournament Section -->
              <div class="p-6 bg-gradient-to-r from-purple-900/50 to-purple-800/50 rounded border border-purple-400/50 shadow-lg">
                <h3 class="text-xl font-semibold text-purple-300 mb-4">
                  TOURNAMENT ARENA
                </h3>

                <!-- Return to Tournament Button (shown when user is in active tournament) -->
                <div id="tournament-return" class="mb-4 p-4 bg-gradient-to-r from-purple-600/20 to-purple-500/20 border border-purple-400 rounded hidden">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-purple-200">ACTIVE TOURNAMENT DETECTED</p>
                      <p class="text-sm text-purple-300">Return to continue your battle</p>
                    </div>
                    <button id="return-tournament-btn" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-all border border-purple-400 shadow-lg hover:shadow-purple-500/25">
                      ENTER ARENA
                    </button>
                  </div>
                </div>

                <div id="tournament-info" class="mb-4">
                  <div id="no-tournament" class="text-purple-400 text-sm text-center animate-pulse">
                    SCANNING FOR TOURNAMENTS...
                  </div>
                  <div id="tournament-details" class="hidden">
                    <div class="flex justify-between items-center mb-4 p-3 bg-black/30 rounded border border-purple-400/30">
                      <span class="font-medium text-purple-200">PLAYERS: <span class="text-purple-400" id="tournament-players">0</span>/4</span>
                      <span class="text-sm bg-purple-600/20 px-3 py-1 rounded-full border border-purple-400/50 text-purple-300" id="tournament-status">pending</span>
                    </div>

                    <!-- Participants List -->
                    <div id="tournament-participants" class="mb-4">
                      <h4 class="font-medium text-sm text-purple-300 mb-3">
                        WARRIORS IN ARENA:
                      </h4>
                      <div id="participants-list" class="grid grid-cols-1 gap-2">
                        <!-- Participants will be populated here -->
                      </div>
                    </div>

                    <div class="text-xs text-purple-400 mt-3 text-center animate-pulse" id="tournament-waiting">
                      AWAITING MORE WARRIORS...
                    </div>

                    <!-- Tournament Bracket Preview -->
                    <div id="tournament-bracket-preview" class="mt-6 hidden">
                      <h4 class="font-medium mb-3 text-green-300 font-mono flex items-center">
                        <span class="w-4 h-4 bg-green-600 rounded-full mr-2"></span>
                        BATTLE BRACKET:
                      </h4>
                      <div id="bracket-preview-container" class="text-sm bg-black/40 p-4 rounded-lg border border-green-400/30">
                        <div class="text-center text-green-400 font-mono">BRACKET GENERATING...</div>
                      </div>
                    </div>

                    <!-- Match Pairings -->
                    <div id="tournament-matches" class="mt-6 hidden">
                      <h4 class="font-medium mb-3 text-green-300 font-mono flex items-center">
                        <span class="w-4 h-4 bg-green-600 rounded-full mr-2"></span>
                        CURRENT BATTLES:
                      </h4>
                      <div id="matches-container" class="space-y-3"></div>
                    </div>
                  </div>
                </div>

                <div class="flex space-x-4">
                  <button id="join-tournament-btn" class="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 px-6 rounded transition-all border border-purple-400 shadow-lg hover:shadow-purple-500/25">
                    JOIN TOURNAMENT
                  </button>
                  <button id="leave-tournament-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded transition-all border border-red-400 shadow-lg hover:shadow-red-500/25 hidden">
                    LEAVE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Information Section - Fixed at bottom -->
        <div class="bottom-0 bg-console-bg text-left border-t border-neon-green border-opacity-30 p-3 mt-auto">
          <div class="text-[10px] leading-relaxed text-neon-green space-y-1">
            <div>> SYSTEM: PONG.exe v4.1.0</div>
            <div>> SERVER: pong.42.fr | PING: 21ms</div>
            <div>> MEMORY: 384MB / 1.2GB | CPU: 26% | STATUS: OPTIMAL</div>
          </div>
        </div>

      </div>
    `);
  }

  private setupEvents(): void {
    // Tournament buttons
    const joinTournamentBtn = this.element.querySelector(
      "#join-tournament-btn"
    );
    const leaveTournamentBtn = this.element.querySelector(
      "#leave-tournament-btn"
    );
    const returnTournamentBtn = this.element.querySelector(
      "#return-tournament-btn"
    );

    joinTournamentBtn?.addEventListener(
      "click",
      this.handleJoinTournament.bind(this)
    );
    leaveTournamentBtn?.addEventListener(
      "click",
      this.handleLeaveTournament.bind(this)
    );
    returnTournamentBtn?.addEventListener(
      "click",
      this.handleReturnToTournament.bind(this)
    );

    // Matchmaking buttons
    const joinMatchmakingBtn = this.element.querySelector(
      "#join-matchmaking-btn"
    );
    const leaveMatchmakingBtn = this.element.querySelector(
      "#leave-matchmaking-btn"
    );

    joinMatchmakingBtn?.addEventListener(
      "click",
      this.handleJoinMatchmaking.bind(this)
    );
    leaveMatchmakingBtn?.addEventListener(
      "click",
      this.handleLeaveMatchmaking.bind(this)
    );
  }

  private loadInvites(): void {
    const invites = JSON.parse(localStorage.getItem("gameInvites") || "[]");
    this.displayInvites(invites);
  }

  private listenForInvites(): void {
    this.gameService.onGameInvite((data) => {
      this.addInvite(data);
      notify(`Game invite from ${data.senderUsername}`);
    });

    this.gameService.onInviteAccepted((data) => {
      console.log("Invite accepted data:", data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now(),
        });
        notify("Room created! Joining lobby...");
        (window as any).router.navigate("game-lobby");
      }
    });

    this.gameService.onRoomCreated((data) => {
      console.log("Room created data:", data);
      if (data.roomId) {
        const appState = AppState.getInstance();
        appState.setCurrentRoom({
          roomId: data.roomId,
          players: data.players || [],
          createdAt: Date.now(),
        });
        notify("Room ready! Joining lobby...");
        (window as any).router.navigate("game-lobby");
      }
    });
  }

  private addInvite(invite: any): void {
    const invites = JSON.parse(localStorage.getItem("gameInvites") || "[]");

    // Remove old invite from same sender
    const filteredInvites = invites.filter(
      (inv: any) => inv.senderId !== invite.senderId
    );

    // Add new invite with timestamp
    const inviteWithTimestamp = {
      ...invite,
      timestamp: Date.now(),
    };
    filteredInvites.push(inviteWithTimestamp);

    localStorage.setItem("gameInvites", JSON.stringify(filteredInvites));
    this.displayInvites(filteredInvites);
  }

  private async displayInvites(invites: any[]): Promise<void> {
    const container = this.element.querySelector("#invites-container");
    const noInvites = this.element.querySelector("#no-invites");

    if (!container) return;

    // Mevcut davetleri temizle (no-invites hariç)
    container.querySelectorAll(".invite-item").forEach((item) => item.remove());

    if (invites.length === 0) {
      if (noInvites) noInvites.classList.remove("hidden");
      return;
    }

    if (noInvites) noInvites.classList.add("hidden");

    for (const invite of invites) {
      let senderAvatar = `https://placehold.co/400x400?text=${invite.senderUsername?.[0]?.toUpperCase() || 'U'}`;

      try {
        const userInfo = await this.userService.getUserById(invite.senderId);
        if (userInfo && userInfo.avatar) {
          senderAvatar = userInfo.avatar;
        }
      } catch (error) {
        console.error('Failed to fetch sender avatar:', error);
      }

      const inviteEl = document.createElement("div");
      inviteEl.className =
        "invite-item p-4 bg-gradient-to-r from-green-800/20 to-green-700/20 rounded-lg border border-green-400/50 shadow-lg";
      inviteEl.innerHTML = `
        <div class="flex flex-col space-y-4">
          <div class="flex items-center space-x-4">
            <div class="relative flex-shrink-0">
              <img src="${senderAvatar}" alt="Avatar" class="w-12 h-12 rounded-full">
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-sm text-neon-white font-medium truncate" title="${invite.senderUsername || 'Unknown'}">${
                invite.senderUsername || "Unknown"
              }</span>
            </div>
          </div>
          <div class="flex space-x-3">
            <button class="accept-btn px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-orbitron font-medium transition-all border border-green-400 shadow-lg hover:shadow-green-500/25">ACCEPT</button>
            <button class="reject-btn px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg font-orbitron font-medium transition-all border border-red-400 shadow-lg hover:shadow-red-500/25">DECLINE</button>
          </div>
        </div>
      `;

      // Event listeners
      inviteEl
        .querySelector(".accept-btn")
        ?.addEventListener("click", () => this.acceptInvite(invite));
      inviteEl
        .querySelector(".reject-btn")
        ?.addEventListener("click", () => this.rejectInvite(invite));

      container.appendChild(inviteEl);
    }
  }

  private acceptInvite(invite: any): void {
    this.gameService.acceptGameInvite(invite.senderId);
    this.removeInvite(invite.senderId);
    notify("Game invite accepted! Waiting for room...");

    // Room bilgisi invite-accepted event'inde gelecek, orada yönlendirme yapacağız
  }

  private rejectInvite(invite: any): void {
    this.removeInvite(invite.senderId);
    notify("Game invite rejected");
  }

  private removeInvite(senderId: number): void {
    const invites = JSON.parse(localStorage.getItem("gameInvites") || "[]");
    const filtered = invites.filter((inv: any) => inv.senderId !== senderId);
    localStorage.setItem("gameInvites", JSON.stringify(filtered));
    this.displayInvites(filtered);
  }

  // Tournament Methods
  private async handleJoinTournament(): Promise<void> {
    try {
      const currentUser = await this.userService.getCurrentUser();
      if (!currentUser) {
        notify("Please login first");
        return;
      }

      this.tournamentService.joinTournament();
      notify("Joining tournament...");

      // Store tournament state and navigate to tournament page after joining
      const appState = AppState.getInstance();
      setTimeout(() => {
        // Navigate to tournament page - we'll know we're in a tournament from the state
        (window as any).router.navigate("tournament");
      }, 500); // Wait a bit for join confirmation
    } catch (error) {
      console.error("Error joining tournament:", error);
      notify("Failed to join tournament");
    }
  }

  private handleLeaveTournament(): void {
    this.tournamentService.leaveTournament();
    notify("Leaving tournament...");
  }

  private handleReturnToTournament(): void {
    (window as any).router.navigate("tournament");
  }

  // Check if user is in an active tournament
  private async checkUserTournamentStatus(): Promise<void> {
    const returnSection = this.element.querySelector("#tournament-return");

    try {
      const currentUser = await this.userService.getCurrentUser();
      if (!currentUser) {
        returnSection?.classList.add("hidden");
        return;
      }

      // Check if user has currentTournamentId in database
      const response = await fetch(
        getApiUrl(
          API_CONFIG.ENDPOINTS.USER.TOURNAMENT_STATUS(currentUser.id.toString())
        ),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(
          `🔍 USER TOURNAMENT STATUS: User ${currentUser.id} status:`,
          data
        );

        if (
          data.isInTournament &&
          !data.isEliminated &&
          data.tournamentStatus !== "completed"
        ) {
          console.log(
            `✅ USER TOURNAMENT STATUS: Showing return button for user in active tournament`
          );
          returnSection?.classList.remove("hidden");

          // Store in app state
          const appState = AppState.getInstance();
          appState.setCurrentTournament({
            tournamentId: data.tournamentId,
            status: data.tournamentStatus,
            isParticipant: true,
            joinedAt: Date.now(),
          });
        } else {
          console.log(
            `❌ USER TOURNAMENT STATUS: Hiding return button (not in tournament, eliminated, or tournament completed)`
          );
          returnSection?.classList.add("hidden");
        }
      } else {
        console.log(
          `❌ USER TOURNAMENT STATUS: API call failed, hiding return button`
        );
        returnSection?.classList.add("hidden");
      }
    } catch (error) {
      console.error("Error checking tournament status:", error);
      returnSection?.classList.add("hidden");
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
      console.log("🎯 Tournament player joined event received:", data);
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
      notify(data.message || "Tournament started!");

      // Eğer kullanıcı turnuvada ise tournament sayfasına yönlendir
      this.userService.getCurrentUser().then((currentUser) => {
        if (
          currentUser &&
          data.participants &&
          data.participants.some((p: any) => p.id === currentUser.id)
        ) {
          console.log(
            "🏆 User is in tournament, staying on current page or going to tournament page"
          );
          // Tournament sayfasında değilsek yönlendir
          if (window.location.pathname !== "/tournament") {
            (window as any).router.navigate("tournament");
          }
        }
      });
    });

    // Maç başladığında
    this.tournamentService.onTournamentMatchStarted((data) => {
      console.log("🎮 Tournament match starting from home:", data);
      notify(`Your match started against ${data.opponent}`);
      // Navigate directly to remote-game for tournaments (skip lobby)
      const appState = AppState.getInstance();
      appState.setCurrentRoom({
        roomId: data.roomId,
        players: data.players || [],
        createdAt: Date.now(),
      });
      (window as any).router.navigate("remote-game");
    });

    // Sonraki round başladığında
    this.tournamentService.onTournamentNextRound((data) => {
      notify(`Round ${data.round} started!`);
      this.updateTournamentBracket(data);
      this.loadTournamentData(); // Bracket'i güncelle
    });

    // Maç tamamlandığında
    this.tournamentService.onTournamentMatchCompleted((data) => {
      console.log("🏆 Tournament match completed:", data);
      notify(
        `Match completed! Winner: ${data.winnerUsername || data.winnerId}`
      );
      this.loadTournamentData(); // Bracket'i güncelle
    });

    // Round tamamlandığında
    this.tournamentService.onTournamentRoundCompleted((data) => {
      console.log("🏆 Tournament round completed:", data);
      notify(
        `${data.roundName} completed! ${data.winners.length} players advancing.`
      );
      this.loadTournamentData(); // Bracket'i güncelle
    });

    // Turnuva bittiğinde
    this.tournamentService.onTournamentEnded((data) => {
      notify(data.message || "Tournament ended!");
      this.resetTournamentDisplay();
      this.loadTournamentData(); // Yeni turnuva yüklenir
      this.checkUserTournamentStatus(); // Return button'u güncelle
    });

    // Yeni turnuva oluşturulduğunda
    this.tournamentService.onNewTournamentCreated((data) => {
      notify(data.message || "New tournament created!");
      this.loadTournamentData();
    });

    // Turnuva detayları geldiğinde
    this.tournamentService.onTournamentDetails(async (data) => {
      console.log("🎯 Tournament details received:", data);
      this.currentTournament = data.tournament;
      await this.displayTournamentDetails(data.tournament);

      // Store tournament state if user is participant
      const currentUser = await this.userService.getCurrentUser();
      if (
        currentUser &&
        data.tournament &&
        data.tournament.participants.some((p: any) => p.id === currentUser.id)
      ) {
        const appState = AppState.getInstance();
        appState.setCurrentTournament({
          tournamentId: data.tournament.id,
          status: data.tournament.status,
          isParticipant: true,
          currentRound: 1,
          joinedAt: Date.now(),
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
    const playersElement = this.element.querySelector("#tournament-players");
    const waitingElement = this.element.querySelector("#tournament-waiting");

    if (playersElement) {
      playersElement.textContent = data.currentPlayers.toString();
    }

    if (waitingElement) {
      const remaining = 4 - data.currentPlayers;
      if (remaining > 0) {
        waitingElement.textContent = `Waiting for ${remaining} more players to join...`;
        waitingElement.classList.remove("hidden");
      } else {
        waitingElement.textContent = "Tournament will start soon!";
        waitingElement.classList.remove("hidden");
      }
    }
  }

  private async displayTournamentDetails(tournament: any): Promise<void> {
    const noTournament = this.element.querySelector("#no-tournament");
    const tournamentDetails = this.element.querySelector("#tournament-details");
    const playersElement = this.element.querySelector("#tournament-players");
    const statusElement = this.element.querySelector("#tournament-status");
    const joinBtn = this.element.querySelector("#join-tournament-btn");
    const leaveBtn = this.element.querySelector("#leave-tournament-btn");

    if (!tournament) {
      // Aktif turnuva yok
      if (noTournament) noTournament.textContent = "No active tournament";
      noTournament?.classList.remove("hidden");
      tournamentDetails?.classList.add("hidden");
      joinBtn?.classList.add("hidden");
      leaveBtn?.classList.add("hidden");
      return;
    }

    // Turnuva var, bilgileri göster
    noTournament?.classList.add("hidden");
    tournamentDetails?.classList.remove("hidden");

    if (playersElement)
      playersElement.textContent = tournament.currentPlayers.toString();
    if (statusElement) statusElement.textContent = tournament.status;

    // Waiting message güncelle
    const waitingElement = this.element.querySelector("#tournament-waiting");
    if (waitingElement) {
      if (tournament.status === "pending") {
        const remaining = 4 - tournament.currentPlayers;
        if (remaining > 0) {
          waitingElement.textContent = `Waiting for ${remaining} more players to join...`;
        } else {
          waitingElement.textContent = "Tournament will start soon!";
        }
        waitingElement.classList.remove("hidden");
      } else if (tournament.status === "active") {
        waitingElement.textContent = "Tournament in progress";
        waitingElement.classList.remove("hidden");
      } else {
        waitingElement.classList.add("hidden");
      }
    }

    // Buton durumlarını ayarla
    const currentUser = await this.userService.getCurrentUser();
    const isUserInTournament =
      currentUser &&
      tournament.participants.some((p: any) => p.id === currentUser.id);

    if (isUserInTournament) {
      joinBtn?.classList.add("hidden");
      leaveBtn?.classList.remove("hidden");
    } else {
      if (tournament.status === "pending" && tournament.currentPlayers < 4) {
        joinBtn?.classList.remove("hidden");
      } else {
        joinBtn?.classList.add("hidden");
      }
      leaveBtn?.classList.add("hidden");
    }

    // Katılımcı listesini göster
    this.displayTournamentParticipants(tournament.participants || []);

    // Home ekranında bracket hiç gösterilmesin
    const bracketPreview = this.element.querySelector(
      "#tournament-bracket-preview"
    );
    bracketPreview?.classList.add("hidden");
  }

  private displayTournamentStarted(data: any): void {
    const bracketElement = this.element.querySelector("#tournament-bracket");
    bracketElement?.classList.remove("hidden");
    this.displayTournamentBracket(data.bracket);
  }

  private displayTournamentBracket(bracket: any): void {
    if (!bracket) {
      // Bracket yoksa tournament data'dan pairings'i kullan
      if (this.currentTournament?.pairings) {
        this.displayTournamentBracketFromPairings(
          this.currentTournament.pairings
        );
      }
      return;
    }

    const container = this.element.querySelector("#bracket-container");
    if (!container) return;

    let html = "";

    bracket.forEach((round: any, roundIndex: number) => {
      const roundName =
        roundIndex === 0
          ? "Semifinals"
          : roundIndex === 1
          ? "Final"
          : `Round ${roundIndex + 1}`;
      html += `<div class="mb-4">`;
      html += `<h5 class="font-medium text-green-300 mb-2 font-mono">${roundName}</h5>`;
      html += `<div class="space-y-2">`;

      round.forEach((match: any, matchIndex: number) => {
        const player1Name = match.player1?.username || "TBD";
        const player2Name = match.player2?.username || "TBD";
        const winnerClass = match.winner
          ? "bg-green-900/50 border-green-400"
          : "bg-gray-800 border-gray-600";

        html += `
          <div class="flex items-center justify-between p-2 border rounded ${winnerClass}">
            <span class="text-sm font-medium text-green-200">${player1Name}</span>
            <span class="text-xs text-green-400 font-mono">vs</span>
            <span class="text-sm font-medium text-green-200">${player2Name}</span>
            ${
              match.winner
                ? `<span class="text-xs text-green-400 font-bold font-mono">🏆 ${match.winner.username}</span>`
                : ""
            }
          </div>
        `;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;
  }

  private displayTournamentBracketFromPairings(pairings: any[]): void {
    const container = this.element.querySelector("#bracket-container");
    if (!container || !pairings) return;

    // Group by round
    const rounds: { [key: number]: any[] } = {};
    pairings.forEach((pairing) => {
      if (!rounds[pairing.round]) {
        rounds[pairing.round] = [];
      }
      rounds[pairing.round].push(pairing);
    });

    let html = "";

    Object.keys(rounds)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((roundNum) => {
        const round = rounds[parseInt(roundNum)];
        const roundName =
          parseInt(roundNum) === 1
            ? "Semifinals"
            : parseInt(roundNum) === 2
            ? "Final"
            : `Round ${roundNum}`;

        html += `<div class="mb-4">`;
        html += `<h5 class="font-medium text-green-300 mb-2 font-mono">${roundName}</h5>`;
        html += `<div class="space-y-2">`;

        round.forEach((pairing) => {
          const player1Name = pairing.player1Username || "TBD";
          const player2Name = pairing.player2Username || "TBD";
          const winnerClass = pairing.winnerId
            ? "bg-green-900/50 border-green-400"
            : "bg-gray-800 border-gray-600";
          const winnerName = pairing.winnerUsername;

          html += `
          <div class="flex items-center justify-between p-2 border rounded ${winnerClass}">
            <span class="text-sm font-medium text-green-200 ${
              pairing.winnerId === pairing.player1Id
                ? "font-bold text-green-400"
                : ""
            }">${player1Name}</span>
            <span class="text-xs text-green-400 font-mono">vs</span>
            <span class="text-sm font-medium text-green-200 ${
              pairing.winnerId === pairing.player2Id
                ? "font-bold text-green-400"
                : ""
            }">${player2Name}</span>
            ${
              winnerName
                ? `<span class="text-xs text-green-400 font-bold font-mono">🏆 ${winnerName}</span>`
                : ""
            }
          </div>
        `;
        });

        html += `</div></div>`;
      });

    container.innerHTML = html;
  }

  private displayTournamentMatches(matches: any[]): void {
    const container = this.element.querySelector("#bracket-container");
    if (!container) return;

    const rounds: { [key: number]: any[] } = {};

    // Maçları round'lara göre grupla
    matches.forEach((match) => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    let html = "";

    Object.keys(rounds).forEach((roundKey) => {
      const round = parseInt(roundKey);
      const roundMatches = rounds[round];

      html += `<div class="mb-4">`;
      html += `<h5 class="font-medium text-purple-700 mb-2">Round ${round}</h5>`;
      html += `<div class="space-y-2">`;

      roundMatches.forEach((match) => {
        const isCompleted = match.winnerId !== null;
        const statusClass = isCompleted
          ? "bg-green-100 border-green-300"
          : "bg-yellow-100 border-yellow-300";
        const statusText = isCompleted ? "Completed" : "In Progress";

        html += `
          <div class="p-2 border rounded ${statusClass}">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium">${match.player1Username}</span>
              <span class="text-xs text-gray-500">vs</span>
              <span class="text-sm font-medium">${match.player2Username}</span>
            </div>
            <div class="text-xs text-center text-gray-600">
              ${
                isCompleted
                  ? `Winner: ${
                      match.winnerId === match.player1Id
                        ? match.player1Username
                        : match.player2Username
                    }`
                  : statusText
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

    const noTournament = this.element.querySelector("#no-tournament");
    const tournamentDetails = this.element.querySelector("#tournament-details");
    const bracketElement = this.element.querySelector("#tournament-bracket");
    const matchesElement = this.element.querySelector("#tournament-matches");

    noTournament?.classList.remove("hidden");
    tournamentDetails?.classList.add("hidden");
    bracketElement?.classList.add("hidden");
    matchesElement?.classList.add("hidden");
  }

  // Katılımcı listesini gösterme
  private async displayTournamentParticipants(
    participants: any[]
  ): Promise<void> {
    const container = this.element.querySelector("#participants-list");
    if (!container) return;

    let html = "";

    // Mevcut katılımcıları göster
    for (const participant of participants) {
      // Fetch user details for avatar
      let avatarUrl = "";
      try {
        const userDetails = await this.userService.getUserById(participant.id);
        avatarUrl = userDetails?.avatar || "";
      } catch (error) {
        console.log("Could not fetch user details for avatar");
      }

      html += `
        <div class="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-800/30 to-green-700/30 rounded-lg border border-green-400/50">
          <div class="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white font-bold border-2 border-green-400">
            ${
              avatarUrl
                ? `<img src="${avatarUrl}" alt="${participant.username}" class="w-full h-full rounded-full object-cover">`
                : participant.username?.[0]?.toUpperCase() || "W"
            }
          </div>
          <div class="flex-1">
            <span class="text-green-200 font-medium font-mono">${
              participant.username
            }</span>
          </div>
          <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      `;
    }

    // Boş slotları göster
    const emptySlots = 4 - participants.length;
    for (let i = 0; i < emptySlots; i++) {
      html += `
        <div class="flex items-center space-x-3 p-3 bg-black/30 rounded-lg border border-dashed border-green-400/30">
          <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border-2 border-gray-600">
            ?
          </div>
          <div class="flex-1">
            <span class="text-gray-400 font-mono">AWAITING WARRIOR...</span>
            <div class="text-xs text-gray-500 font-mono">🔍 SEARCHING</div>
          </div>
          <div class="w-3 h-3 bg-gray-600 rounded-full animate-pulse"></div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // Aktif round maçlarını gösterme
  private displayCurrentRoundMatches(matches: any[]): void {
    const container = this.element.querySelector("#matches-container");
    const matchesSection = this.element.querySelector("#tournament-matches");
    if (!container || !matchesSection) return;

    // En yüksek round'u bul (aktif round)
    const currentRound = Math.max(...matches.map((m) => m.round));
    const currentRoundMatches = matches.filter(
      (m) => m.round === currentRound && !m.winnerId
    );

    if (currentRoundMatches.length === 0) {
      matchesSection.classList.add("hidden");
      return;
    }

    matchesSection.classList.remove("hidden");

    let html = "";

    currentRoundMatches.forEach((match, index) => {
      const isUserInMatch = false; // TODO: Current user match kontrolü
      const highlightClass = isUserInMatch
        ? "bg-yellow-100 border-yellow-400"
        : "bg-white border-gray-200";

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
    const container = this.element.querySelector("#bracket-preview-container");
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

  // Matchmaking Methods
  private setupMatchmakingListeners(): void {
    this.gameService.onMatchmakingJoined((data) => {
      console.log("🔍 Joined matchmaking queue:", data);
      this.showMatchmakingStatus();
      notify(`Joined matchmaking queue (position: ${data.position})`);
    });

    this.gameService.onMatchmakingLeft((data) => {
      console.log("❌ Left matchmaking queue:", data);
      this.hideMatchmakingStatus();
      notify("Left matchmaking queue");
    });

    this.gameService.onMatchFound(async (data) => {
      console.log("🎮 Match found:", data);
      console.log("🎮 Match found players order from server:", data.players);
      this.hideMatchmakingStatus();
      notify(`Match found! Opponent: ${data.opponent}`);

      // Set room info and navigate to game
      if (data.roomId) {
        const appState = AppState.getInstance();

        // CRITICAL: Use server's players order instead of manually creating array
        const playersOrder = data.players || [];
        console.log("🎮 MATCHMAKING: Using server players order:", playersOrder);
        console.log("🎮 MATCHMAKING POSITIONS - LEFT (BLUE):", playersOrder[0], ", RIGHT (RED):", playersOrder[1]);

        appState.setCurrentRoom({
          roomId: data.roomId,
          players: playersOrder, // Use server's authoritative order
          createdAt: Date.now(),
          isMatchmaking: true,
        });

        // Navigate to remote-game directly for matchmaking
        (window as any).router.navigate("remote-game");
      }
    });

    this.gameService.onMatchmakingStatus((data) => {
      console.log("📊 Matchmaking status:", data);
      if (data.inQueue) {
        this.showMatchmakingStatus();
      } else {
        this.hideMatchmakingStatus();
      }
    });
  }

  private showMatchmakingStatus(): void {
    const statusElement = this.element.querySelector("#matchmaking-status");
    const joinBtn = this.element.querySelector("#join-matchmaking-btn");
    const leaveBtn = this.element.querySelector("#leave-matchmaking-btn");

    statusElement?.classList.remove("hidden");
    joinBtn?.classList.add("hidden");
    leaveBtn?.classList.remove("hidden");
  }

  private hideMatchmakingStatus(): void {
    const statusElement = this.element.querySelector("#matchmaking-status");
    const joinBtn = this.element.querySelector("#join-matchmaking-btn");
    const leaveBtn = this.element.querySelector("#leave-matchmaking-btn");

    statusElement?.classList.add("hidden");
    joinBtn?.classList.remove("hidden");
    leaveBtn?.classList.add("hidden");
  }

  // Matchmaking Methods
  private handleJoinMatchmaking(): void {
    console.log(
      "🔍 MATCHMAKING: Button clicked - Joining matchmaking queue..."
    );

    // Check if WebSocket is connected
    const wsManager = (this.gameService as any).wsManager;
    if (!wsManager || !wsManager.isConnected()) {
      console.error("❌ MATCHMAKING: WebSocket not connected!");
      notify("Connection error. Please refresh the page.");
      return;
    }

    console.log("✅ MATCHMAKING: WebSocket connected, sending join request...");
    this.gameService.joinMatchmakingQueue();
    this.showMatchmakingStatus();
    notify("Searching for opponent...");
  }

  private handleLeaveMatchmaking(): void {
    console.log("❌ Leaving matchmaking queue...");
    this.gameService.leaveMatchmakingQueue();
    this.hideMatchmakingStatus();
    notify("Matchmaking cancelled");
  }
}
