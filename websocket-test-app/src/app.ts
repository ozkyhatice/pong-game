import { connectWebSocket, disconnectWebSocket } from './websocket.js';
import { loadUserProfile } from './profile.js';
import { loadFriendsList, loadFriendRequests, sendFriendRequest, respondToFriendRequest } from './friends.js';
import { initializeDmBox } from './dm.js';
import { initializeGameCanvas, initializeGameControls, setMyUserId } from './game.js';
import { getToken, getCurrentUserId } from './utils.js';

// Global fonksiyonları window objesine ekle
(window as any).respondToFriendRequest = respondToFriendRequest;

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect') as HTMLButtonElement;
    const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
    const sendFriendRequestBtn = document.getElementById('sendFriendRequest') as HTMLButtonElement;

    // WebSocket bağlantısı
    connectBtn.addEventListener('click', async () => {
        const token = getToken();
        if (!token) {
            alert('Please enter token');
            return;
        }

        try {
            await connectWebSocket(token);
            await loadUserProfile();
            await loadFriendsList();
            await loadFriendRequests();
            
            // Set user ID for game functionality
            const userId = getCurrentUserId(token);
            setMyUserId(userId.toString());
        } catch (error) {
            console.error('Connection failed:', error);
        }
    });

    // WebSocket bağlantısını kes
    disconnectBtn.addEventListener('click', () => {
        disconnectWebSocket();
    });

    // Arkadaşlık isteği gönder
    sendFriendRequestBtn.addEventListener('click', () => {
        const input = document.getElementById('friendRequestInput') as HTMLInputElement;
        sendFriendRequest(input.value);
    });

    
    // DM kutusu başlat
    initializeDmBox();
    
    // Game functionality başlat
    initializeGameCanvas();
    initializeGameControls();
});
