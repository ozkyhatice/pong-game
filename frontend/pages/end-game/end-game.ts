import { Router } from "../../core/router.js";
import { UserService } from "../../services/UserService.js";

declare global {
  var router: Router;
}

export function init() {
	const winnerText = document.getElementById('winner-text');
	const scoreText = document.getElementById('score-text');
	const player1Name = document.getElementById('player1-name');
	const player2Name = document.getElementById('player2-name');
	const player1Avatar = document.getElementById('player1-avatar') as HTMLImageElement;
	const player2Avatar = document.getElementById('player2-avatar') as HTMLImageElement;
	const backBtn = document.getElementById('back-btn');
	const gameResultStatus = document.getElementById('game-result-status');

	const userService = new UserService();

	if (backBtn) {
		backBtn.addEventListener('click', () => router.navigate('home'));
	}

	displayGameResults();

	async function displayGameResults() {
		const gameResultString = localStorage.getItem('gameResult');
		if (!gameResultString) return;

		try {
			const gameResult = JSON.parse(gameResultString);
			
			// Use playerOrder if available (from room), otherwise fall back to finalScore keys
			let playerIds;
			if (gameResult.playerOrder && gameResult.playerOrder.length >= 2) {
				playerIds = gameResult.playerOrder.map((id: number) => id.toString());
				console.log('🎮 Using room player order for end-game:', playerIds);
			} else {
				playerIds = Object.keys(gameResult.finalScore || {});
				console.log('🎮 Falling back to finalScore keys:', playerIds);
			}

			if (playerIds.length < 2) return;

			const [currentUser, player1, player2] = await Promise.all([
				userService.getCurrentUser(),
				userService.getUserById(parseInt(playerIds[0])), // Left player (blue)
				userService.getUserById(parseInt(playerIds[1]))  // Right player (red)
			]);

			const winnerId = gameResult.winner;
			const winnerUser = winnerId == playerIds[0] ? player1 : player2;
			const isCurrentUserWinner = currentUser && currentUser.id == winnerId;

			if (gameResultStatus) {
				if (isCurrentUserWinner) {
					gameResultStatus.textContent = '> RESULT: VICTORY!';
					gameResultStatus.className = 'text-neon-green flex items-center gap-1 mb-1';
				} else {
					gameResultStatus.textContent = '> RESULT: DEFEAT...';
					gameResultStatus.className = 'text-neon-red flex items-center gap-1 mb-1';
				}
			}

			if (winnerText) {
				winnerText.textContent = `${winnerUser?.username || 'Player ' + winnerId} WINS!`;
			}

			if (scoreText) {
				const score1 = gameResult.finalScore[playerIds[0]] || 0;
				const score2 = gameResult.finalScore[playerIds[1]] || 0;
				scoreText.textContent = `${score1} - ${score2}`;
			}

			if (player1Name) player1Name.textContent = player1?.username || `Player ${playerIds[0]}`;
			if (player2Name) player2Name.textContent = player2?.username || `Player ${playerIds[1]}`;

			if (player1Avatar && player1?.avatar) player1Avatar.src = player1.avatar;
			if (player2Avatar && player2?.avatar) player2Avatar.src = player2.avatar;

			localStorage.removeItem('gameResult');
		} catch (e) {
			console.error('Error displaying game results:', e);
		}
	}
}
