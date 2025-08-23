import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { UserService } from "../../services/UserService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";

declare global {
  var router: Router;
}

export function init() {
  const roomStatus = document.getElementById('room-status');
  const roomId = document.getElementById('room-id');
  const readyBtn = document.getElementById('ready-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const player1Name = document.getElementById('player1-name');
  const player2Name = document.getElementById('player2-name');
  const player1Avatar = document.getElementById('player1-avatar') as HTMLImageElement;
  const player2Avatar = document.getElementById('player2-avatar') as HTMLImageElement;

  const appState = AppState.getInstance();
  const gameService = new GameService();
  const userService = new UserService();
  const currentRoom: RoomInfo | null = appState.getCurrentRoom();

  if (readyBtn) readyBtn.addEventListener('click', handleReady);
  if (leaveBtn) leaveBtn.addEventListener('click', handleLeave);
  
  initLobby();

  gameService.onPlayerLeft((data) => {
    appState.clearCurrentRoom();
    notify(`Player left the game.`);
    router.navigate('home');
  });

  gameService.onPlayerReady((data) => {
    updateLobbyStatus(data);
    // Reload player info when someone joins  
    if (data.newPlayerJoined) {
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  gameService.onPlayerJoined((data) => {
    console.log('Player joined event:', data);
    // Update room info when someone joins
    if (data.roomInfo) {
      console.log('Updating room info:', data.roomInfo);
      appState.setCurrentRoom(data.roomInfo);
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  gameService.onAllReady(() => {
    notify('All players ready! Starting game...');
    router.navigate('remote-game');
  });

  function handleReady() {
    const roomId = currentRoom?.roomId || '';
    if (!roomId) {
      notify('No room found');
      return;
    }
    gameService.setPlayerReady(roomId);
    
    // Disable ready button after clicking
    if (readyBtn) {
      (readyBtn as HTMLButtonElement).disabled = true;
      readyBtn.textContent = 'Ready!';
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
      console.log('Player 1 ID:', playerId1);
      console.log('Player 2 ID:', playerId2);

      // Load both players based on their position in the array (like end-game)
      const [player1, player2] = await Promise.all([
        userService.getUserById(playerId1),
        userService.getUserById(playerId2)
      ]);

      // Player 1 (Sol)
      if (player1Name) player1Name.textContent = player1?.username || `Player ${playerId1}`;
      if (player1Avatar && player1?.avatar) {
        player1Avatar.src = player1.avatar;
      }

      // Player 2 (Sağ) 
      if (player2Name) player2Name.textContent = player2?.username || `Player ${playerId2}`;
      if (player2Avatar && player2?.avatar) {
        player2Avatar.src = player2.avatar;
      }

      console.log('Player positions set - Left:', player1?.username, 'Right:', player2?.username);
    } catch (e) {
      console.error('Error loading player info:', e);
    }
  }

  function updateLobbyStatus(data: any) {
    const readyCount = data.readyPlayers?.length || 0;
    const totalPlayers = data.totalPlayers || 2;
    
    if (roomStatus) {
      roomStatus.textContent = `${readyCount}/${totalPlayers} players ready`;
    }
  }
}

