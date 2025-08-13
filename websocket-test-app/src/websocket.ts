import { handleNewMessage } from './dm.js';
import { updateOnlineStatus } from './friends.js';
import { handleGameMessage } from './game.js';

let ws: WebSocket | null = null;

export function connectWebSocket(token: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            resolve(ws);
            return;
        }

        ws = new WebSocket('ws://localhost:3000/ws', token);

        ws.onopen = () => {
            updateStatus('Connected ✅');
            console.log('Connected to WebSocket');
            resolve(ws!);
        };

        ws.onmessage = (e) => {
            const message = JSON.parse(e.data);
            console.log('Received:', message);
            displayMessage(`Received: ${JSON.stringify(message)}`);
            
            // Game messages
            if (message.type === 'game') {
                handleGameMessage(message.event, message.data);
                return;
            }
            
            // Online/offline durumunu güncelle
            if (message.type === 'userStatus') {
                updateOnlineStatus(message.userID, message.status === 'online');
            }
            
            // DM kutusuna yönlendir
            handleNewMessage(message);
        };

        ws.onclose = () => {
            updateStatus('Disconnected ❌');
            console.log('WebSocket closed');
            ws = null;
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        };
    });
}

export function disconnectWebSocket(): void {
    if (ws) {
        ws.close();
        ws = null;
    }
}

// Generic sendMessage for any type of message
export function sendMessage(type: string, event: string, data: any): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected!');
        return;
    }

    const message = {
        type: type,
        event: event,
        data: data
    };

    ws.send(JSON.stringify(message));
    console.log('Sent:', message);
    displayMessage(`Sent: ${JSON.stringify(message)}`);
}

// Specific sendMessage for DM (backward compatibility)
export function sendDMMessage(receiverId: number, content: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected!');
        return;
    }

    const message = {
        type: 'message',
        receiverId: receiverId,
        content: content
    };

    ws.send(JSON.stringify(message));
    console.log('Sent:', message);
    displayMessage(`Sent: ${JSON.stringify(message)}`);
}

export function markAsRead(senderId: number): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected, cannot mark as read');
        return;
    }

    const readMessage = {
        type: 'read',
        senderId: senderId
    };

    ws.send(JSON.stringify(readMessage));
    console.log('Marked as read via WebSocket:', readMessage);
}

function updateStatus(status: string): void {
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    statusDiv.textContent = status;
}

function displayMessage(message: string): void {
    const messagesDiv = document.getElementById('messages') as HTMLDivElement;
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
