import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { UserService } from "../../services/UserService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";
import { XSSProtection, safeDOM } from "../../core/XSSProtection.js";

declare global {
  var router: Router;
}

export function init() {
  const appState = AppState.getInstance();
  const currentRoom: RoomInfo | null = appState.getCurrentRoom();

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

  if (readyBtn) readyBtn.addEventListener('click', handleReady);
  if (leaveBtn) leaveBtn.addEventListener('click', handleLeave);

  initLobby();

  gameService.onPlayerLeft((data) => {
    appState.clearCurrentRoom();
    notify('Player left the game.');
    router.navigate('home');
  });

  gameService.onPlayerReady((data) => {
    updateLobbyStatus(data);
    if (data.newPlayerJoined) {
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  gameService.onPlayerJoined((data) => {
    if (data.roomInfo) {
      appState.setCurrentRoom(data.roomInfo);
      setTimeout(() => loadPlayerInfo(), 500);
    }
  });

  gameService.onAllReady((data) => {
    notify('All players ready! Starting game...');
  });

  gameService.onGameStarted((data) => {
    notify('Game started!', 'green');
    router.navigate('remote-game');
  });

  gameService.onGameError((data) => {
    notify(data.message || 'Game error occurred', 'red');
  });

  gameService.onRoomCreated((data) => {
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
    
    if (readyBtn) {
      (readyBtn as HTMLButtonElement).disabled = true;
      safeDOM.setText(readyBtn, 'READY');
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
    
    if (roomId) safeDOM.setText(roomId, XSSProtection.cleanInput(currentRoom.roomId));
    await loadPlayerInfo();
  }

  async function loadPlayerInfo() {
    try {
      const currentUser = await userService.getCurrentUser();
      if (!currentUser || !currentRoom?.players || currentRoom.players.length < 2) return;

      const [playerId1, playerId2] = currentRoom.players;
      const [player1, player2] = await Promise.all([
        userService.getUserById(playerId1),
        userService.getUserById(playerId2)
      ]);

      if (player1Name) safeDOM.setText(player1Name, XSSProtection.cleanInput(player1?.username || `Player ${playerId1}`));
      if (player1Avatar && player1?.avatar) {
        player1Avatar.src = player1.avatar;
      }

      if (player2Name) safeDOM.setText(player2Name, XSSProtection.cleanInput(player2?.username || `Player ${playerId2}`));
      if (player2Avatar && player2?.avatar) {
        player2Avatar.src = player2.avatar;
      }
    } catch (e) {}
  }

  function updateLobbyStatus(data: any) {
    const readyCount = data.readyPlayers?.length || 0;
    const totalPlayers = data.totalPlayers || 2;
    if (roomStatus) {
      safeDOM.setText(roomStatus, `> ${readyCount}/${totalPlayers} PLAYERS READY`);
    }
    const player1ReadyText = document.getElementById('player1-ready-text');
    const player2ReadyText = document.getElementById('player2-ready-text');
    const readyPlayerIds = data.readyPlayers || [];
    if (currentRoom?.players && currentRoom.players.length >= 2) {
      const [playerId1, playerId2] = currentRoom.players;
      if (player1ReadyText) {
        if (readyPlayerIds.includes(playerId1)) {
          safeDOM.setText(player1ReadyText, 'READY');
          player1ReadyText.classList.remove('text-neon-red');
          player1ReadyText.classList.add('text-neon-green');
        } else {
          safeDOM.setText(player1ReadyText, 'NOT READY');
          player1ReadyText.classList.remove('text-neon-green');
          player1ReadyText.classList.add('text-neon-red');
        }
      }
      if (player2ReadyText) {
        if (readyPlayerIds.includes(playerId2)) {
          safeDOM.setText(player2ReadyText, 'READY');
          player2ReadyText.classList.remove('text-neon-red');
          player2ReadyText.classList.add('text-neon-green');
        } else {
          safeDOM.setText(player2ReadyText, 'NOT READY');
          player2ReadyText.classList.remove('text-neon-green');
          player2ReadyText.classList.add('text-neon-red');
        }
      }
    }
  }
}

export function cleanup() {
}

