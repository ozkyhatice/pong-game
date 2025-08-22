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

	// readyBtn.addEventListener('click', handleReady);
  
	if (leaveBtn) {
		leaveBtn.addEventListener('click', handleLeave);
	}




	const appState = AppState.getInstance();
	const gameService = new GameService();

  const currentRoom: RoomInfo | null = appState.getCurrentRoom();

	// Listen for player left events
	gameService.onPlayerLeft((data) => {
		console.log('Player left:', data);
		appState.clearCurrentRoom();
		notify(`Player ${data.leftPlayer} left the game. Returning to home.`);
		router.navigate('home');
	});

  function handleLeave() {
	  const roomId = currentRoom?.roomId || '';
	  gameService.leaveGame(roomId);
	  appState.clearCurrentRoom();
	  router.navigate('home');
  }

}

