import { getApiUrl, API_CONFIG } from '../../config.js';
import { notify } from '../../core/notify.js';

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
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data: ProfileResponse = await response.json();

        if (response.ok && data.user) {
            displayProfile(data.user);
            update2FAStatus(data.user.isTwoFAEnabled || false);
            displayAvatar(data.user.avatar);
            loadBlockedUsers(data.user.id);
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
            <div class="text-neon-blue text-xs space-y-1">
                <p class="uppercase tracking-wide">USERNAME: <span class="text-neon-white">${user.username}</span></p>
                <p class="uppercase tracking-wide">EMAIL: <span class="text-neon-white">${user.email}</span></p>
                <p class="uppercase tracking-wide">STATS: <span class="text-neon-white">${user.wins}W / ${user.losses}L</span></p>
            </div>
        `;
    }
}

function displayAvatar(avatar: string | null): void {
    const avatarDiv = document.getElementById('avatarPreview');
    if (avatarDiv) {
        if (avatar) {
            avatarDiv.innerHTML = `<img src="${avatar}" class="w-full h-full object-cover rounded-full">`;
        } else {
            avatarDiv.innerHTML = `<span class="text-neon-blue text-xs uppercase">NO AVATAR</span>`;
        }
    }
}

async function loadBlockedUsers(userId: number): Promise<void> {
    const token = getToken();
    if (!token) return;

    const loadingDiv = document.getElementById('blockedUsersLoading');
    const listDiv = document.getElementById('blockedUsersList');
    
    if (!listDiv) return;

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.BLOCKED(userId.toString())), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }

        if (response.ok) {
            const data = await response.json();
            displayBlockedUsers(data.blockedUsers || []);
        } else {
            listDiv.innerHTML = `
                <div class="text-neon-red text-opacity-70 text-[10px] text-center py-4">
                    FAILED TO LOAD BLOCKED USERS
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading blocked users:', error);
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        listDiv.innerHTML = `
            <div class="text-neon-red text-opacity-70 text-[10px] text-center py-4">
                ERROR LOADING BLOCKED USERS
            </div>
        `;
    }
}

function displayBlockedUsers(blockedUsers: any[]): void {
    const listDiv = document.getElementById('blockedUsersList');
    if (!listDiv) return;

    if (blockedUsers.length === 0) {
        listDiv.innerHTML = `
            <div class="text-neon-red text-opacity-50 text-[10px] text-center py-4">
                NO BLOCKED USERS
            </div>
        `;
        return;
    }

    listDiv.innerHTML = blockedUsers.map(user => `
        <div class="flex items-center justify-between p-2 bg-black bg-opacity-40 border border-neon-red border-opacity-30 rounded-sm">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-neon-red bg-opacity-20 flex items-center justify-center">
                    <span class="text-neon-red text-[8px] font-bold">⛔</span>
                </div>
                <div>
                    <p class="text-neon-red text-[10px] font-medium">${user.username}</p>
                    <p class="text-neon-red text-opacity-60 text-[8px]">BLOCKED USER</p>
                </div>
            </div>
            <button onclick="unblockUser(${user.id})" 
                    class="bg-transparent border border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-terminal-border px-2 py-1 rounded text-[8px] font-bold transition-colors">
                UNBLOCK
            </button>
        </div>
    `).join('');
}

async function unblockUser(userId: number): Promise<void> {
    const token = getToken();
    if (!token) return notify('No token found', 'red');

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.FRIENDS.UNBLOCK(userId.toString())), {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            notify('User unblocked successfully', 'green');
            // Reload the current user's profile to refresh blocked users list
            const currentUserResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const currentUserData = await currentUserResponse.json();
            if (currentUserData.user) {
                loadBlockedUsers(currentUserData.user.id);
            }
        } else {
            const errorData = await response.json();
            notify(errorData.error || 'Failed to unblock user', 'red');
        }
    } catch (error) {
        console.error('Error unblocking user:', error);
        notify('Error unblocking user', 'red');
    }
}

// Make unblockUser globally available
(window as any).unblockUser = unblockUser;

function update2FAStatus(isEnabled: boolean): void {
    const statusDiv = document.getElementById('twofaStatus');
    const enableBtn = document.getElementById('enable2faBtn');
    const disableBtn = document.getElementById('disable2faBtn');
    const qrContainer = document.getElementById('qrCodeContainer');

    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="text-center">
                <p class="text-neon-purple text-xs uppercase tracking-wide mb-1">2FA STATUS:</p>
                <p class="text-neon-white text-xs font-bold">${isEnabled ? 'ENABLED' : 'DISABLED'}</p>
            </div>
        `;
    }

    if (enableBtn && disableBtn) {
        enableBtn.style.display = isEnabled ? 'none' : 'block';
        disableBtn.style.display = isEnabled ? 'block' : 'none';
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
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
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
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.UPDATE_AVATAR), {
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
