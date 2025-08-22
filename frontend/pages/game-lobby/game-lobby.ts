import { AppState, RoomInfo } from "../../core/AppState.js";
import { GameService } from "../../services/GameService.js";
import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";

declare global {
  var router: Router;
}

export function init() {
  const player1Name = document.getElementById('player1-name');
  const player2Name = document.getElementById('player2-name');
  const player1ReadyText = document.getElementById('player1-ready-text');
  const player2ReadyText = document.getElementById('player2-ready-text');
  const roomStatus = document.getElementById('room-status');
  const roomId = document.getElementById('room-id');
  const readyBtn = document.getElementById('ready-btn');
  const leaveBtn = document.getElementById('leave-btn');

  if (readyBtn) {
    readyBtn.addEventListener('click', handleReady);
  }
  
  if (leaveBtn) {
    leaveBtn.addEventListener('click', handleLeave);
  }




  const appState = AppState.getInstance();
  const gameService = new GameService();

  const currentRoom: RoomInfo | null = appState.getCurrentRoom();

  // odadan birisi ayrilirsa
  gameService.onPlayerLeft((data) => {
    console.log('Player left:', data);
    appState.clearCurrentRoom();
    notify(`Player ${data.leftPlayer} left the game. Returning to home.`);
    router.navigate('home');
  });

  // diger user hazir oldugunda
  gameService.onPlayerReady((data) => {
    console.log('Player ready:', data);
    updateReadyStatus(data);
  });

  // tum userlar hazir mesaji -> oyunu baslat
  gameService.onAllReady((data) => {
    console.log('All players ready:', data);
    notify('All players are ready! Game can now start.');
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

//odadan ayril butonu
  function handleLeave() {
    const roomId = currentRoom?.roomId || '';
    gameService.leaveGame(roomId);
    appState.clearCurrentRoom();
    router.navigate('home');
  }

  function updateReadyStatus(data: any) {
    const { readyPlayerId, readyPlayers, totalPlayers } = data;
    
    // Update UI to show which players are ready
    if (player1ReadyText && player2ReadyText) {
      // Assuming player1 and player2 based on readyPlayers array
      const readyPlayerIds = readyPlayers || [];
      
      if (readyPlayerIds.includes(readyPlayerId)) {
        if (roomStatus) {
          roomStatus.textContent = `${readyPlayerIds.length}/${totalPlayers} players ready`;
        }
      }
    }
  }

}

