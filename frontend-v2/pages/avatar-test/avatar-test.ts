const API_BASE = 'http://localhost:3000';

interface User {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    wins: number;
    losses: number;
}

interface ApiResponse {
    user?: User;
    message?: string;
    error?: string;
}

function getToken(): string {
    return localStorage.getItem('authToken') || '';
}

function showMessage(message: string, isError = false): void {
    const div = document.getElementById('messages');
    if (div) div.innerHTML = `<p style="color: ${isError ? 'red' : 'green'}">${message}</p>`;
}

async function loadProfile(): Promise<void> {
    console.log('loadProfile called!');
    const token = getToken();
    console.log('Token:', token);
    if (!token) return showMessage('No token found', true);

    try {
        // profil bilgilerini getirir
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Response status:', response.status);
        const data: ApiResponse = await response.json();
        console.log('Response data:', data);

        if (response.ok && data.user) {
            const user = data.user;
            const profileDiv = document.getElementById('profileInfo');
            if (profileDiv) {
                profileDiv.innerHTML = `
                    <p>ID: ${user.id}</p>
                    <p>Username: ${user.username}</p>
                    <p>Email: ${user.email}</p>
                    <p>Wins: ${user.wins} | Losses: ${user.losses}</p>
                `;
            }

            if (user.avatar) {
                const avatarDiv = document.getElementById('avatarPreview');
                if (avatarDiv) {
                    avatarDiv.innerHTML = `<img src="${API_BASE}${user.avatar}" width="100" height="100">`;
                }
            }
        } else {
            showMessage(data.error || 'Failed to load profile', true);
        }
    } catch (error) {
        showMessage('Error loading profile', true);
    }
}

export async function updateProfile(): Promise<void> {
    const token = getToken();
    if (!token) return showMessage('No token found', true);

    const username = (document.getElementById('newUsername') as HTMLInputElement).value;
    const email = (document.getElementById('newEmail') as HTMLInputElement).value;

    if (!username && !email) return showMessage('Enter username or email', true);

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    try {
        // put metoduyla sadece email-username veya sadece birini gonder update eder
        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        const data: ApiResponse = await response.json();

        if (response.ok) {
            showMessage('Profile updated!');
            loadProfile();
            (document.getElementById('newUsername') as HTMLInputElement).value = '';
            (document.getElementById('newEmail') as HTMLInputElement).value = '';
        } else {
            showMessage(data.error || 'Update failed', true);
        }
    } catch (error) {
        showMessage('Error updating profile', true);
    }
}

export async function uploadAvatar(): Promise<void> {
    const token = getToken();
    if (!token) return showMessage('No token found', true);

    const fileInput = document.getElementById('avatarFile') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return showMessage('Select a file', true);

    // yeni formdat olusturup gelen filei ekle
    const formData = new FormData();
    formData.append('file', file);

    try {
        // AVATAR YUKLEME
        // PUT metoduyla avatar dosyasını yükler
        // Authorization header ile token gönderilir
        // body formData olarak gönderilir
        // formData.append('file', file) ile dosya eklenir
        const response = await fetch(`${API_BASE}/users/me/avatar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data: ApiResponse = await response.json();

        if (response.ok) {
            showMessage(data.message || 'Avatar uploaded!');
            loadProfile();
            fileInput.value = '';
        } else {
            showMessage(data.error || 'Upload failed', true);
        }
    } catch (error) {
        showMessage('Error uploading avatar', true);
    }
}

// Router tarafından çağrılacak init fonksiyonu
export function init() {
    console.log('Avatar test page initialized!');
    
    // Event listener'ları ekle
    const updateBtn = document.getElementById('updateBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (updateBtn) {
        updateBtn.addEventListener('click', updateProfile);
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadAvatar);
    }
    
    // Profil yükle
    loadProfile();
}

