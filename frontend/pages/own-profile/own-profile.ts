import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';
import { UserService } from '../../services/UserService.js';
import { XSSProtection, safeDOM } from '../../core/XSSProtection.js';

interface User {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    wins: number;
    losses: number;
}

interface Match {
    id: number;
    player1Id: number;
    player2Id: number;
    player1Score: number;
    player2Score: number;
    winnerId: number | null;
    startedAt: string;
    endedAt: string | null;
    tournamentId: number | null;
    round: number | null;
}

let currentUser: User | null = null;
let matchHistory: Match[] = [];
let currentFilter = 'all';
let userService: UserService = new UserService();

export function init() {
    setupEventListeners();
    loadProfile();
}

function getToken(): string {
    return localStorage.getItem('authToken') || '';
}

function setupEventListeners(): void {
    const backHomeBtn = document.getElementById('backHomeBtn');
    backHomeBtn?.addEventListener('click', () => {
        router.navigate('home');
    });

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const filter = target.dataset.filter;
            if (filter) {
                setActiveFilter(filter);
                filterMatches(filter);
            }
        });
    });
}

async function loadProfile(): Promise<void> {
    const token = getToken();
    if (!token) {
        notify('No authentication token found', 'red');
        return;
    }

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
            headers:
            {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.user) {
            currentUser = data.user;
            displayProfile(data.user);
            displayAvatar(data.user.avatar);
            await loadUserStats(data.user.id);
            await loadMatchHistory(data.user.id);
        } else {
            notify('Failed to load profile', 'red');
        }
    } catch (error) {
        notify('Error loading profile', 'red');
    }
}

function displayProfile(user: User): void {
    const usernameEl = document.getElementById('username');
    const userEmailEl = document.getElementById('user-email');

    if (usernameEl) safeDOM.setText(usernameEl, XSSProtection.cleanInput(user.username.toUpperCase()));
    if (userEmailEl) safeDOM.setText(userEmailEl, XSSProtection.cleanInput(user.email || 'No email provided'));
}

function displayAvatar(avatarUrl: string | null): void {
    const avatarImg = document.getElementById('user-avatar-img') as HTMLImageElement;
    if (avatarImg && avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
    }
}

async function loadUserStats(userId: number): Promise<void> {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_ID(userId.toString())), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        if (data.user) {
            updateStatsDisplay(data.user);
        } else {
        }
    } catch (error) {
        notify('Error loading user stats', 'red');
    }
}

function updateStatsDisplay(user: User): void {
    const winsEl = document.getElementById('wins-count');
    const lossesEl = document.getElementById('losses-count');
    const winRateEl = document.getElementById('win-rate');
    const totalGamesEl = document.getElementById('total-games');

    const wins = user.wins || 0;
    const losses = user.losses || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    if (winsEl) safeDOM.setText(winsEl, wins.toString());
    if (lossesEl) safeDOM.setText(lossesEl, losses.toString());
    if (totalGamesEl) safeDOM.setText(totalGamesEl, totalGames.toString());
    if (winRateEl) safeDOM.setText(winRateEl, `${winRate}%`);
}

async function loadMatchHistory(userId: number): Promise<void> {
    try {
        const token = getToken();
        if (!token) {
            return;
        }

        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.GAME.MATCH_HISTORY(userId.toString())), {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load match history: ${response.status}`);
        }

        const data = await response.json();
        matchHistory = data.matches || [];
        await displayMatchHistory(matchHistory);
    } catch (error) {
        displayEmptyMatchHistory();
    }
}

async function displayMatchHistory(matches: Match[]): Promise<void> {
    const matchHistoryContainer = document.getElementById('match-history');
    if (!matchHistoryContainer) return;

    const loadingEl = document.getElementById('loading-matches');
    if (loadingEl) loadingEl.remove();

    if (matches.length === 0) {
        displayEmptyMatchHistory();
        return;
    }

    const matchesWithUsernames = await Promise.all(matches.map(async (match) => {
        if (!currentUser) return { match, opponentUsername: 'Unknown' };

        const opponentId = match.player1Id === currentUser.id ? match.player2Id : match.player1Id;
        const opponentInfo = await userService.getUserById(opponentId);
        const opponentUsername = opponentInfo?.username || `Player ${opponentId}`;

        return { match, opponentUsername };
    }));

    const matchesHTML = matchesWithUsernames.map(({ match, opponentUsername }) => {
        if (!currentUser) return '';

        const isWin = match.winnerId === currentUser.id;
        const resultClass = isWin ? 'wins' : 'losses';
        const borderColor = isWin ? 'border-neon-green' : 'border-neon-red';
        const bgColor = isWin ? 'bg-neon-green' : 'bg-neon-red';
        const textColor = isWin ? 'text-neon-green' : 'text-neon-red';
        const resultLetter = isWin ? 'W' : 'L';

        const playerScore = match.player1Id === currentUser.id ? match.player1Score : match.player2Score;
        const opponentScore = match.player1Id === currentUser.id ? match.player2Score : match.player1Score;

        return `
            <div class="match-item all ${resultClass} mb-2">
                <div class="flex items-center justify-between p-3 bg-terminal-border border ${borderColor} border-opacity-50 rounded-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 ${bgColor} rounded-sm flex items-center justify-center text-terminal-border text-xs font-bold">${resultLetter}</div>
                        <div>
                            <div class="font-medium text-neon-white text-sm">vs. ${opponentUsername}</div>
                            <div class="text-xs text-neon-white/70">${formatFullDate(new Date(match.startedAt))}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${textColor} text-sm whitespace-nowrap">${playerScore} - ${opponentScore}</div>
                        <div class="text-xs text-neon-white/70">${match.tournamentId ? 'TOURNAMENT' : 'CASUAL'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    matchHistoryContainer.innerHTML = `<div>${matchesHTML}</div>`;
}

function displayEmptyMatchHistory(): void {
    const matchHistoryContainer = document.getElementById('match-history');
    if (!matchHistoryContainer) return;

    const loadingEl = document.getElementById('loading-matches');
    if (loadingEl) loadingEl.remove();

    matchHistoryContainer.innerHTML = `
        <div class="text-center py-8">
            <div class="text-neon-white/50 text-sm">NO MATCH HISTORY AVAILABLE</div>
            <div class="text-neon-white/30 text-xs mt-1">START PLAYING TO SEE YOUR MATCHES HERE!</div>
        </div>
    `;
}

function setActiveFilter(filter: string): void {
    currentFilter = filter;

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        const btnElement = btn as HTMLElement;
        const btnFilter = btnElement.dataset.filter;

        btn.classList.remove('active', 'bg-neon-purple', 'bg-neon-green', 'bg-neon-red', 'bg-opacity-20');
        btn.classList.add('bg-transparent');

        if (btnFilter === filter) {
            btn.classList.add('active');
            btn.classList.remove('bg-transparent');

            if (filter === 'all') {
                btn.classList.add('bg-neon-purple', 'bg-opacity-20');
            } else if (filter === 'wins') {
                btn.classList.add('bg-neon-green', 'bg-opacity-20');
            } else if (filter === 'losses') {
                btn.classList.add('bg-neon-red', 'bg-opacity-20');
            }
        }
    });
}

function filterMatches(filter: string): void {
    const matchItems = document.querySelectorAll('.match-item');
    let visibleCount = 0;

    matchItems.forEach(item => {
        const itemElement = item as HTMLElement;
        if (filter === 'all' || itemElement.classList.contains(filter)) {
            itemElement.style.display = 'block';
            visibleCount++;
        } else {
            itemElement.style.display = 'none';
        }
    });

    const matchHistoryContainer = document.getElementById('match-history');
    if (matchHistoryContainer && visibleCount === 0 && filter !== 'all') {
        const wrapper = matchHistoryContainer.querySelector('div');
        if (wrapper) {
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center py-8 filter-empty-state';
            emptyState.innerHTML = `
                <div class="text-neon-white/50 text-sm">NO ${filter.toUpperCase()} FOUND</div>
                <div class="text-neon-white/30 text-xs mt-1">TRY A DIFFERENT FILTER</div>
            `;

            const existingEmpty = wrapper.querySelector('.filter-empty-state');
            if (existingEmpty) existingEmpty.remove();

            safeDOM.appendChild(wrapper, emptyState);
        }
    } else {
        const existingEmpty = matchHistoryContainer?.querySelector('.filter-empty-state');
        if (existingEmpty) existingEmpty.remove();
    }
}

function formatFullDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function cleanup() {
    currentUser = null;
    matchHistory = [];
    currentFilter = 'all';
    userService = new UserService();
}
