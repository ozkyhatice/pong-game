
let ws: WebSocket | null = null;

// Token'dan user ID'sini decode et
function getCurrentUserId(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId || payload.sub;
    } catch (error) {
        console.error('Error decoding token:', error);
        return 0;
    }
}

interface MyProfile {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
    wins: number;
    losses: number;
    createdAt?: string;
}

interface Friend {
    requesterID: number;
    recipientID: number;
    status: string;
    friendInfo: {
        id: number;
        username: string;
        avatar?: string | null;
        wins: number;
        losses: number;
    };
}

interface UserProfile {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
    wins: number;
    losses: number;
    createdAt?: string;
}


document.addEventListener('DOMContentLoaded', async () => {

    // DOM Elements
    const tokenInput = document.getElementById('token') as HTMLInputElement;
    const connectBtn = document.getElementById('connect') as HTMLButtonElement;
    const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const receiverIdInput = document.getElementById('receiverId') as HTMLInputElement;
    const messageTextInput = document.getElementById('messageText') as HTMLInputElement;
    const sendMessageBtn = document.getElementById('sendMessage') as HTMLButtonElement;
    const senderIdInput = document.getElementById('senderId') as HTMLInputElement;
    const markReadBtn = document.getElementById('markRead') as HTMLButtonElement;
    const messagesDiv = document.getElementById('messages') as HTMLDivElement;
    const friendsListDiv = document.getElementById('friendsList') as HTMLDivElement;

// Connect to WebSocket
connectBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
        alert('token girin');
        return;
    }

    // ws baglantısı
    ws = new WebSocket('ws://localhost:3000/ws', token);

    ws.onopen = () => {
        statusDiv.textContent = 'Connected ✅';
        console.log('Connected to WebSocket');
    };

    ws.onmessage = (e) => {
        const message = JSON.parse(e.data);
        console.log('Received:', message);
        
        // Mesajları ekrana yazdır
        const messageElement = document.createElement('div');
        messageElement.textContent = `Received: ${JSON.stringify(message)}`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    ws.onclose = () => {
        statusDiv.textContent = 'Disconnected ❌';
        console.log('WebSocket closed');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    //arkadas listesini guncelle

    const friends = await fetch('http://localhost:3000/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!friends.ok) {
        console.error('Failed to fetch friends list');
        return;
    }

    const friendsResponse = await friends.json();
    console.log('Friends response:', friendsResponse); // Debug için

    friendsListDiv.innerHTML = ''; // Temizle
    
    // Yeni response formatında friends array içinde geliyor
    friendsResponse.friends.forEach((friend: Friend) => {
        try {
            const friendElement = document.createElement('div');
            friendElement.className = 'friend-item';
            friendElement.innerHTML = `
                <div>
                    <strong>Username:</strong> ${friend.friendInfo.username}<br>
                    <strong>ID:</strong> ${friend.friendInfo.id}<br>
                    <strong>Wins:</strong> ${friend.friendInfo.wins || 0} | <strong>Losses:</strong> ${friend.friendInfo.losses || 0}
                    <br><small>Status: ${friend.status}</small>
                </div>
            `;
            friendsListDiv.appendChild(friendElement);
        } catch (error) {
            console.error(`Error displaying friend:`, error);
        }
    });

    



});

// Disconnect
disconnectBtn.addEventListener('click', () => {
    if (ws) {
        ws.close();
        ws = null;
    }
});

// Send Message
sendMessageBtn.addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected!');
        return;
    }

    const receiverId = parseInt(receiverIdInput.value);
    const messageText = messageTextInput.value.trim();

    if (!receiverId || !messageText) {
        alert('Enter receiver ID and message!');
        return;
    }

    // Backend'inizin beklediği format
    const message = {
        type: 'message',
        receiverId: receiverId,
        content: messageText
    };

    ws.send(JSON.stringify(message));
    console.log('Sent:', message);
    
    // Gönderilen mesajı ekrana yazdır
    const messageElement = document.createElement('div');
    messageElement.textContent = `Sent: ${JSON.stringify(message)}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    messageTextInput.value = '';
});

// Mark as Read
markReadBtn.addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected!');
        return;
    }

    const senderId = parseInt(senderIdInput.value);
    if (!senderId) {
        alert('Enter message ID!');
        return;
    }

    // Backend'inizin beklediği format
    const readMessage = {
        type: 'read',
        senderId: senderId
    };

    ws.send(JSON.stringify(readMessage));
    console.log('Marked as read:', readMessage);
    
    senderIdInput.value = '';
});

}); // DOMContentLoaded kapanis