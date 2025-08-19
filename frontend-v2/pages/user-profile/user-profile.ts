import { AppState } from '../../core/AppState.js';

interface ApiMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: number;
  delivered: number;
  createdAt: string;
}

interface ChatHistoryResponse {
  success: boolean;
  data: {
    messages: ApiMessage[];
  };
}

export function init() {
  const matchesTab = document.getElementById('matches-tab') as HTMLButtonElement;
  const chatTab = document.getElementById('chat-tab') as HTMLButtonElement;
  const matchesContent = document.getElementById('matches-content') as HTMLElement;
  const chatContent = document.getElementById('chat-content') as HTMLElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-message-btn') as HTMLButtonElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;

  let currentUserId: number | null = null;
  let friendUserId: number | null = null;
  let isLoadingMessages = false;

  const appState = AppState.getInstance();

  // Get current user info
  initCurrentUser();

  // Tab switching
  matchesTab?.addEventListener('click', () => showTab('matches'));
  chatTab?.addEventListener('click', () => showTab('chat'));


  // Chat functionality
  sendBtn?.addEventListener('click', handleSendMessage);
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  function initCurrentUser(): void {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      currentUserId = userData.id;
    }
    
    // Get viewing user from AppState
    const viewingUser = appState.getViewingUser();
    if (viewingUser) {
      friendUserId = viewingUser.id;
      updatePageContent(viewingUser);
    } else {
      showError('No user selected to view');
    }
  }

  function updatePageContent(user: any): void {
    // Update page elements with user data
    const usernameEl = document.getElementById('username');
    const avatarEl = document.getElementById('user-avatar');
    const chatTitleEl = document.querySelector('#chat-content h3');

    if (usernameEl) usernameEl.textContent = user.username;
    if (avatarEl) avatarEl.textContent = user.avatar || user.username.substring(0, 2).toUpperCase();
    if (chatTitleEl) chatTitleEl.textContent = `Chat with ${user.username}`;
  }

  function showTab(tabName: 'matches' | 'chat'): void {
    if (tabName === 'matches') {
      matchesTab.className = 'flex-1 px-6 py-4 text-center font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50';
      chatTab.className = 'flex-1 px-6 py-4 text-center font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors';
      matchesContent.classList.remove('hidden');
      chatContent.classList.add('hidden');
    } else {
      chatTab.className = 'flex-1 px-6 py-4 text-center font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50';
      matchesTab.className = 'flex-1 px-6 py-4 text-center font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors';
      chatContent.classList.remove('hidden');
      matchesContent.classList.add('hidden');

      // Load messages when chat tab is opened
      if (!isLoadingMessages) {
        loadChatMessages();
      }
    }
  }

  async function loadChatMessages(): Promise<void> {
    if (isLoadingMessages || !friendUserId || !currentUserId) return;
    
    isLoadingMessages = true;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:3000/chat/history/${friendUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ChatHistoryResponse = await response.json();
      
      if (data.success) {
        renderMessages(data.data.messages);
      } else {
        showError('Failed to load messages');
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      showError('Failed to load messages. Please try again.');
    } finally {
      isLoadingMessages = false;
    }
  }

  function renderMessages(messages: ApiMessage[]): void {
    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
      const messageElement = createMessageElement(message);
      chatMessages.appendChild(messageElement);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function createMessageElement(message: ApiMessage): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-4';

    const messageDate = new Date(message.createdAt);
    const timeAgo = getTimeAgo(messageDate);
    const isFromMe = message.senderId === currentUserId;

    if (isFromMe) {
      messageDiv.innerHTML = `
        <div class="flex items-start gap-3 justify-end">
          <div class="flex-1">
            <div class="bg-blue-600 text-white p-3 rounded-lg shadow-sm">
              <p>${escapeHtml(message.content)}</p>
            </div>
            <div class="text-xs text-slate-500 mt-1 text-right">${timeAgo}</div>
          </div>
          <div class="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white text-sm font-bold">ME</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">U</div>
          <div class="flex-1">
            <div class="bg-white p-3 rounded-lg shadow-sm">
              <p class="text-slate-800">${escapeHtml(message.content)}</p>
            </div>
            <div class="text-xs text-slate-500 mt-1">${timeAgo}</div>
          </div>
        </div>
      `;
    }

    return messageDiv;
  }

  async function handleSendMessage(): Promise<void> {
    const message = chatInput.value.trim();
    if (!message || !friendUserId || !currentUserId) return;

    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    try {
      const token = localStorage.getItem('authToken');
      
      // TODO: Make API call to send message
      // const response = await fetch('/api/chat/send', {
      //   method: 'POST',
      //   headers: { 
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json' 
      //   },
      //   body: JSON.stringify({
      //     receiverId: friendUserId,
      //     content: message
      //   })
      // });
      
      // Add message to UI immediately (optimistic update)
      const newMessage: ApiMessage = {
        id: Date.now(),
        senderId: currentUserId,
        receiverId: friendUserId,
        content: message,
        isRead: 0,
        delivered: 1,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      const messageElement = createMessageElement(newMessage);
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // TODO: Send via WebSocket for real-time delivery
      
    } catch (error) {
      console.error('Failed to send message:', error);
      showError('Failed to send message. Please try again.');
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  function showError(message: string): void {
    // TODO: Show error notification
    console.error(message);
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

}
