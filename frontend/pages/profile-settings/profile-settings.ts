import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';

const API_BASE = 'http://localhost:3000';

interface User {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    wins: number;
    losses: number;
    isTwoFAEnabled?: boolean;
}

interface ProfileResponse {
    user?: User;
    error?: string;
}

interface TwoFASetupResponse {
    qr?: string;
    secret?: string;
    error?: string;
}

interface StandardResponse {
    success?: boolean;
    message?: string;
    error?: string;
}

function getToken(): string {
    return localStorage.getItem('authToken') || '';
}

async function loadProfile(): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data: ProfileResponse = await response.json();

        if (response.ok && data.user) {
            displayProfile(data.user);
            update2FAStatus(data.user.isTwoFAEnabled || false);
            displayAvatar(data.user.avatar);
        } else {
            notify(data.error || 'Failed to load profile', 'red');
        }
    } catch (error) {
        notify('Error loading profile', 'red');
    }
}

function displayProfile(user: User): void {
    const profileDiv = document.getElementById('profileInfo');
    if (profileDiv) {
        profileDiv.innerHTML = `
            <p>ID: ${user.id}</p>
            <p>Username: ${user.username}</p>
            <p>Email: ${user.email}</p>
            <p>Wins: ${user.wins} | Losses: ${user.losses}</p>
        `;
    }
}

function displayAvatar(avatar: string | null): void {
    const avatarDiv = document.getElementById('avatarPreview');
    if (avatarDiv && avatar) {
        avatarDiv.innerHTML = `<img src="${avatar}" width="100" height="100">`;
    }
}

function update2FAStatus(isEnabled: boolean): void {
    const statusDiv = document.getElementById('twofaStatus');
    const enableBtn = document.getElementById('enable2faBtn');
    const disableBtn = document.getElementById('disable2faBtn');
    const qrContainer = document.getElementById('qrCodeContainer');

    if (statusDiv) {
        statusDiv.innerHTML = `<p><strong>2FA Status:</strong> ${isEnabled ? 'Enabled ✅' : 'Disabled ❌'}</p>`;
    }

    if (enableBtn && disableBtn) {
        enableBtn.style.display = isEnabled ? 'none' : 'inline-block';
        disableBtn.style.display = isEnabled ? 'inline-block' : 'none';
    }

    if (qrContainer) qrContainer.style.display = 'none';
}

async function setup2FA(): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA.SETUP), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data: TwoFASetupResponse = await response.json();

        if (response.ok && data.qr && data.secret) {
            displayQRCode(data.qr, data.secret);
            notify('Scan QR code with your authenticator app');
        } else {
            notify(data.error || 'Failed to setup 2FA', 'red');
        }
    } catch (error) {
        notify('Error setting up 2FA', 'red');
    }
}

function displayQRCode(qr: string, secret: string): void {
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrCode = document.getElementById('qrCode');
    const secretKey = document.getElementById('secretKey');

    if (qrContainer && qrCode && secretKey) {
        qrCode.innerHTML = `<img src="${qr}" alt="QR Code">`;
        secretKey.textContent = secret;
        qrContainer.style.display = 'block';
    }
}

async function verify2FA(): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    const codeInput = document.getElementById('verifyCode') as HTMLInputElement;
    const code = codeInput.value;

    if (!code || code.length !== 6) {
        return notify('Please enter a valid 6-digit code', 'red');
    }

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA.VERIFY), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token: code })
        });
        const data: StandardResponse = await response.json();

        if (response.ok && data.success) {
            notify('2FA enabled successfully!');
            update2FAStatus(true);
            codeInput.value = '';
            loadProfile();
        } else {
            notify(data.error || 'Invalid code', 'red');
        }
    } catch (error) {
        notify('Error verifying 2FA', 'red');
    }
}

async function disable2FA(): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    if (!confirm('Are you sure you want to disable 2FA?')) return;

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA.DISABLE), {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data: StandardResponse = await response.json();

        if (response.ok && data.success) {
            notify('2FA disabled successfully!');
            update2FAStatus(false);
            loadProfile();
        } else {
            notify(data.error || 'Failed to disable 2FA', 'red');
        }
    } catch (error) {
        notify('Error disabling 2FA', 'red');
    }
}

export async function updateProfile(): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    const username = (document.getElementById('newUsername') as HTMLInputElement).value;
    const email = (document.getElementById('newEmail') as HTMLInputElement).value;

    if (!username && !email) return notify('Enter username or email', 'red');

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        const data: StandardResponse = await response.json();

        if (response.ok) {
            notify('Profile updated!');
            loadProfile();
            (document.getElementById('newUsername') as HTMLInputElement).value = '';
            (document.getElementById('newEmail') as HTMLInputElement).value = '';
        } else {
            notify(data.error || 'Update failed', 'red');
        }
    } catch (error) {
        notify('Error updating profile', 'red');
    }
}

export async function uploadAvatar(): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    const fileInput = document.getElementById('avatarFile') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return notify('Select a file', 'red');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/users/me/avatar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data: StandardResponse = await response.json();

        if (response.ok) {
            notify(data.message || 'Avatar uploaded!');
            loadProfile();
            fileInput.value = '';
        } else {
            notify(data.error || 'Upload failed', 'red');
        }
    } catch (error) {
        notify('Error uploading avatar', 'red');
    }
}

export function removeAvatar(): void {
    notify('soon');
}

export function init() {
    const updateBtn = document.getElementById('updateBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    const enable2faBtn = document.getElementById('enable2faBtn');
    const disable2faBtn = document.getElementById('disable2faBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const backHomeBtn = document.getElementById('backHomeBtn');
    
    updateBtn?.addEventListener('click', updateProfile);
    uploadBtn?.addEventListener('click', uploadAvatar);
    enable2faBtn?.addEventListener('click', setup2FA);
    disable2faBtn?.addEventListener('click', disable2FA);
    verifyBtn?.addEventListener('click', verify2FA);
    backHomeBtn?.addEventListener('click', () => { router.navigate('home'); });
    removeAvatarBtn?.addEventListener('click', removeAvatar);

    loadProfile();
}

