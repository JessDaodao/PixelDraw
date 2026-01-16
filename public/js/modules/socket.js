import {
    socket,
    connectionStatusDiv,
    pingTextSpan,
    quotaSpan,
    recoveryProgressBar,
    RECONNECT_DELAY,
    state
} from './config.js';
import { resizeCanvas, requestRender } from './canvas.js';
import { renderColorPresets } from './tools.js';
import { startPixelRecoveryTimer, stopPixelRecoveryTimer, updateRecoveryProgress, startRecoveryCountdown, showStatus, hideLoadingScreen, checkAndShowBroadcast } from './utils.js';
import { hideAdminModal, showAdminError, startCooldownTimer } from './auth.js';

function updateConnectionStatus(status) {
    connectionStatusDiv.className = 'connection-status ' + status;
    const statusText = connectionStatusDiv.querySelector('.status-text');
    switch (status) {
        case 'connected':
            statusText.textContent = '已连接';
            break;
        case 'reconnecting':
            statusText.textContent = '重连中...';
            break;
    }
}

function initSocketListeners() {
    socket.on('connect', () => {
        updateConnectionStatus('connected');
        if (state.reconnectInterval) {
            clearInterval(state.reconnectInterval);
            state.reconnectInterval = null;
        }
    });

    socket.on('disconnect', () => {
        updateConnectionStatus('reconnecting');
        pingTextSpan.textContent = '';
        if (!state.reconnectInterval) {
            state.reconnectInterval = setInterval(() => {
                socket.connect();
            }, RECONNECT_DELAY);
        }
    });

    socket.on('connect_error', () => {
        if (!socket.connected) {
            updateConnectionStatus('reconnecting');
        }
    });

    socket.on('online-count', (count) => {
        pingTextSpan.textContent = '在线 ' + count;
    });

    socket.on('init-board', (data) => {
        if (data.board) {
            state.board = data.board;
            state.BOARD_WIDTH = data.boardWidth || state.BOARD_WIDTH;
            state.BOARD_HEIGHT = data.boardHeight || state.BOARD_HEIGHT;
            state.MIN_ZOOM = data.minZoom || state.MIN_ZOOM;
            state.MAX_ZOOM = data.maxZoom || state.MAX_ZOOM;
            state.maxQuota = data.maxPixels || state.maxQuota;
            state.pixelRecoveryWindow = data.pixelRecoveryWindow || state.pixelRecoveryWindow;
            resizeCanvas();
        } else {
            state.board = data;
            resizeCanvas();
        }
        renderColorPresets();
        socket.emit('request-quota-update');
        startPixelRecoveryTimer();
        hideLoadingScreen();
    });

    socket.on('login-success', (data) => {
        if (data.sessionKey) {
            localStorage.setItem('eu_session_key', data.sessionKey);
        }

        if (data.user) {
            const loginBtn = document.getElementById('loginBtn');
            const userInfoDiv = document.getElementById('userInfo');
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfoDiv) userInfoDiv.style.display = 'flex';
            if (userName) userName.textContent = data.user.nickname || '用户';
            if (userAvatar && data.user.avatar) userAvatar.src = data.user.avatar;
        }

        showStatus('登录成功！', 'success');
    });

    socket.on('pixel-update', ({ x, y, color }) => {
        if (y >= 0 && y < state.BOARD_HEIGHT && x >= 0 && x < state.BOARD_WIDTH && state.board[y]) {
            state.board[y][x] = color;
            state.boardCacheDirty = true;
        }
        requestRender();
    });

    socket.on('error-message', (msg) => {
        showStatus(msg, 'error');
        const match = msg.match(/(\d+)秒后/);
        if (match) {
            state.recoveryCountdown = parseInt(match[1]);
            recoveryProgressBar.style.opacity = '1';
            updateRecoveryProgress();
            startRecoveryCountdown();
        }
    });

    socket.on('admin-verify-result', (result) => {
        if (result.success) {
            state.isAdminMode = true;
            hideAdminModal();
            exitAdminBtn.style.display = 'block';
            adminTools.style.display = 'flex';
            showStatus('已进入管理员模式', 'success');
            socket.emit('request-quota-update');
        } else {
            if (result.cooldown) {
                startCooldownTimer(result.cooldown);
            } else {
                showAdminError(result.message);
            }
        }
    });

    socket.on('admin-mode-exited', () => {
        state.isAdminMode = false;
        exitAdminBtn.style.display = 'none';
        adminTools.style.display = 'none';
        showStatus('已退出管理员模式', 'warning');
        socket.emit('request-quota-update');
    });

    socket.on('quota-update', (q, nextRefillTime) => {
        if (state.isAdminMode) {
            quotaSpan.innerText = '∞';
            recoveryProgressBar.style.opacity = '0';
        } else {
            quotaSpan.innerText = q;
            state.currentQuota = q;
            if (state.currentQuota >= state.maxQuota) {
                stopPixelRecoveryTimer();
                recoveryProgressBar.style.opacity = '0';
                recoveryProgressBar.style.strokeDasharray = '0, 100';
                state.recoveryCountdown = 0;
            } else {
                if (nextRefillTime) {
                    state.recoveryCountdown = nextRefillTime;
                    recoveryProgressBar.style.opacity = '1';
                    updateRecoveryProgress();
                    startRecoveryCountdown();
                }
            }
        }
    });
}

export { initSocketListeners, updateConnectionStatus };
