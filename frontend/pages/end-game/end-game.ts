
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
			const playerIds = Object.keys(gameResult.finalScore || {});
			
			if (playerIds.length < 2) return;

			const [player1, player2] = await Promise.all([
				userService.getUserById(parseInt(playerIds[0])),
				userService.getUserById(parseInt(playerIds[1]))
			]);

			if (winnerText) {
				const winnerUser = gameResult.winner == playerIds[0] ? player1 : player2;
				winnerText.textContent = `Winner: ${winnerUser?.username || 'Player ' + gameResult.winner}`;
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
