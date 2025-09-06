import { notify } from "../../core/notify.js";
import { Router } from "../../core/router.js";
import { UserService } from "../../services/UserService.js";
import { safeDOM, XSSProtection } from "../../core/XSSProtection.js";

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
			const rawGameResult = JSON.parse(gameResultString);
			const gameResult = XSSProtection.sanitizeJSON(rawGameResult);
			
			let playerIds;
			if (gameResult.playerOrder && gameResult.playerOrder.length >= 2) {
				playerIds = gameResult.playerOrder.map((id: number) => id.toString());
			} else {
				playerIds = Object.keys(gameResult.finalScore || {});
			}

			if (playerIds.length < 2) return;

			const [currentUser, player1, player2] = await Promise.all([
				userService.getCurrentUser(),
				userService.getUserById(parseInt(playerIds[0])),
				userService.getUserById(parseInt(playerIds[1]))
			]);

			const winnerId = gameResult.winner;
			const winnerUser = winnerId == playerIds[0] ? player1 : player2;
			const isCurrentUserWinner = currentUser && currentUser.id == winnerId;

			if (gameResultStatus) {
				if (isCurrentUserWinner) {
					safeDOM.setText(gameResultStatus, '> RESULT: VICTORY!');
					gameResultStatus.className = 'text-neon-green flex items-center gap-1 mb-1';
				} else {
					safeDOM.setText(gameResultStatus, '> RESULT: DEFEAT...');
					gameResultStatus.className = 'text-neon-red flex items-center gap-1 mb-1';
				}
			}

			if (winnerText) {
				const cleanUsername = XSSProtection.escapeHTML(winnerUser?.username || 'Player ' + winnerId);
				safeDOM.setText(winnerText, `${cleanUsername} WINS!`);
			}

			if (scoreText) {
				const score1 = gameResult.finalScore[playerIds[0]] || 0;
				const score2 = gameResult.finalScore[playerIds[1]] || 0;
				safeDOM.setText(scoreText, `${score1} - ${score2}`);
			}

			if (player1Name) safeDOM.setText(player1Name, player1?.username || `Player ${playerIds[0]}`);
			if (player2Name) safeDOM.setText(player2Name, player2?.username || `Player ${playerIds[1]}`);

			if (player1Avatar && player1?.avatar) {
				const safeAvatar1 = XSSProtection.escapeHTML(player1.avatar);
				player1Avatar.src = safeAvatar1;
			}
			if (player2Avatar && player2?.avatar) {
				const safeAvatar2 = XSSProtection.escapeHTML(player2.avatar);
				player2Avatar.src = safeAvatar2;
			}

			localStorage.removeItem('gameResult');
		} catch (e) {
			notify('Error displaying game results. Please refresh page.', 'red');
		}
	}
}
