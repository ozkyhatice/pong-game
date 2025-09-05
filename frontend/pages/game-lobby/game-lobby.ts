import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { UserService } from "../../services/UserService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";

declare global {
  var router: Router;
}

export function init() {
  const appState = AppState.getInstance();
  const currentRoom: RoomInfo | null = appState.getCurrentRoom();

  //game lobby bi dah agirilmesin room id yoksa
  if (!currentRoom?.roomId) {
    notify('No room found');
    router.navigate('home');
    return;
  }

  const roomStatus = document.getElementById('room-status');
  const roomId = document.getElementById('room-id');
  const readyBtn = document.getElementById('ready-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const player1Name = document.getElementById('player1-name');
  const player2Name = document.getElementById('player2-name');
  const player1Avatar = document.getElementById('player1-avatar') as HTMLImageElement;
  const player2Avatar = document.getElementById('player2-avatar') as HTMLImageElement;

  const gameService = new GameService();
  const userService = new UserService();

  // Event handlers
  if (readyBtn) readyBtn.addEventListener('click', handleReady);
  if (leaveBtn) leaveBtn.addEventListener('click', handleLeave);
  
  // Initialize lobby
  initLobby();

  // Game service listeners with improved handling
  gameService.onPlayerLeft((data) => {
    console.log('🎮 LOBBY: Player left:', data);
    appState.clearCurrentRoom();
    notify(`Player left the game.`);
    router.navigate('home');
  });

  gameService.onPlayerReady((data) => {
    console.log('🎮 LOBBY: Player ready:', data);
    updateLobbyStatus(data);
    // Reload player info when someone joins  
    if (data.newPlayerJoined) {
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  gameService.onPlayerJoined((data) => {
    console.log('🎮 LOBBY: Player joined:', data);
    // Update room info when someone joins
    if (data.roomInfo) {
      console.log('Updating room info:', data.roomInfo);
      appState.setCurrentRoom(data.roomInfo);
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  gameService.onAllReady((data) => {
    console.log('🎮 LOBBY: All players ready:', data);
    notify('All players ready! Starting game...');
    // Navigation is handled by WebSocketManager
  });

  gameService.onGameStarted((data) => {
    console.log('🎮 LOBBY: Game started:', data);
    notify('Game started!', 'green');
    router.navigate('remote-game');
  });

  gameService.onGameError((data) => {
    console.log('🎮 LOBBY: Game error:', data);
    notify(data.message || 'Game error occurred', 'red');
  });

  gameService.onRoomCreated((data) => {
    console.log('🎮 LOBBY: Room created while in lobby:', data);
    if (data.roomId) {
      appState.setCurrentRoom({
        roomId: data.roomId,
        players: data.players || [],
        createdAt: Date.now()
      });
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  function handleReady() {
    const roomId = currentRoom?.roomId || '';
    if (!roomId) {
      notify('No room found');
      router.navigate('home');
      return;
    }
    gameService.setPlayerReady(roomId);
    
    // Disable ready button after clicking
    if (readyBtn) {
      (readyBtn as HTMLButtonElement).disabled = true;
		readyBtn.textContent = 'READY';
		readyBtn.classList.remove('bg-transparent', 'text-neon-green');
		readyBtn.classList.remove('hover:bg-neon-green', 'hover:text-terminal-border');
		readyBtn.classList.add('bg-neon-green', 'text-terminal-border');
		readyBtn.classList.add('cursor-not-allowed');
    }
  }

  function handleLeave() {
    if (!currentRoom?.roomId) return;
    gameService.leaveGame(currentRoom.roomId);
    appState.clearCurrentRoom();
    router.navigate('home');
  }

  async function initLobby() {
    if (!currentRoom?.roomId) return;
    
    if (roomId) roomId.textContent = currentRoom.roomId;
    await loadPlayerInfo();
  }

  async function loadPlayerInfo() {
    try {
      const currentUser = await userService.getCurrentUser();
      console.log('Current user:', currentUser);
      console.log('Current room players:', currentRoom?.players);
      if (!currentUser || !currentRoom?.players || currentRoom.players.length < 2) return;

      const [playerId1, playerId2] = currentRoom.players;
      console.log('Player 1 ID (LEFT/BLUE):', playerId1);
      console.log('Player 2 ID (RIGHT/RED):', playerId2);

      // CONSISTENT PLAYER ORDER: Always use room.players order
      // Player 1 (index 0) = LEFT side = BLUE (like end-game and remote-game)
      // Player 2 (index 1) = RIGHT side = RED (like end-game and remote-game)
      const [player1, player2] = await Promise.all([
        userService.getUserById(playerId1), // LEFT player (BLUE)
        userService.getUserById(playerId2)  // RIGHT player (RED)
      ]);

      // Player 1 (LEFT/BLUE)
      if (player1Name) player1Name.textContent = player1?.username || `Player ${playerId1}`;
      if (player1Avatar && player1?.avatar) {
        player1Avatar.src = player1.avatar;
      }

      // Player 2 (RIGHT/RED) 
      if (player2Name) player2Name.textContent = player2?.username || `Player ${playerId2}`;
      if (player2Avatar && player2?.avatar) {
        player2Avatar.src = player2.avatar;
      }

      console.log('🎮 Player positions set - LEFT (BLUE):', player1?.username, 'RIGHT (RED):', player2?.username);
    } catch (e) {
      console.error('Error loading player info:', e);
    }
  }

  function updateLobbyStatus(data: any) {
    const readyCount = data.readyPlayers?.length || 0;
    const totalPlayers = data.totalPlayers || 2;
    
    if (roomStatus) {
      roomStatus.textContent = `> ${readyCount}/${totalPlayers} PLAYERS READY`;
    }

    // Update ready status for each player - CONSISTENT ORDER
    const player1ReadyText = document.getElementById('player1-ready-text');
    const player2ReadyText = document.getElementById('player2-ready-text');
    const readyPlayerIds = data.readyPlayers || [];
    
    if (currentRoom?.players && currentRoom.players.length >= 2) {
      // CONSISTENT PLAYER ORDER: Always use room.players order
      // Player 1 (index 0) = LEFT side = BLUE
      // Player 2 (index 1) = RIGHT side = RED
      const [playerId1, playerId2] = currentRoom.players;
      
      // Update Player 1 ready status (LEFT/BLUE)
      if (player1ReadyText) {
        if (readyPlayerIds.includes(playerId1)) {
          player1ReadyText.textContent = 'READY';
          player1ReadyText.classList.remove('text-neon-red');
          player1ReadyText.classList.add('text-neon-green');
        } else {
          player1ReadyText.textContent = 'NOT READY';
          player1ReadyText.classList.remove('text-neon-green');
          player1ReadyText.classList.add('text-neon-red');
        }
      }
      
      // Update Player 2 ready status (RIGHT/RED)
      if (player2ReadyText) {
        if (readyPlayerIds.includes(playerId2)) {
          player2ReadyText.textContent = 'READY';
          player2ReadyText.classList.remove('text-neon-red');
          player2ReadyText.classList.add('text-neon-green');
        } else {
          player2ReadyText.textContent = 'NOT READY';
          player2ReadyText.classList.remove('text-neon-green');
          player2ReadyText.classList.add('text-neon-red');
        }
      }
      
      console.log(`🎮 Ready status - LEFT (BLUE) Player ${playerId1}: ${readyPlayerIds.includes(playerId1) ? 'READY' : 'NOT READY'}, RIGHT (RED) Player ${playerId2}: ${readyPlayerIds.includes(playerId2) ? 'READY' : 'NOT READY'}`);
    }
  }
}

// Cleanup function for game-lobby
export function cleanup() {
  console.log('🧹 LOBBY: Cleaning up game-lobby page...');
  
  // GameService cleanup is handled by router's cleanupCurrentPage
  // since it calls GameService.cleanup() automatically
}

