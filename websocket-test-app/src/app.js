let ws = null;
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tokenInput = document.getElementById('token');
    const connectBtn = document.getElementById('connect');
    const disconnectBtn = document.getElementById('disconnect');
    const statusDiv = document.getElementById('status');
    const receiverIdInput = document.getElementById('receiverId');
    const messageTextInput = document.getElementById('messageText');
    const sendMessageBtn = document.getElementById('sendMessage');
    const senderIdInput = document.getElementById('senderId');
    const markReadBtn = document.getElementById('markRead');
    const messagesDiv = document.getElementById('messages');
    // Connect to WebSocket
    connectBtn.addEventListener('click', () => {
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
