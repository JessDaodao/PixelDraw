import {
    socket,
    recoveryProgressBar,
    BROADCAST_VERSION_KEY,
    state
} from './config.js';

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (statusDiv.hideTimeout) {
        clearTimeout(statusDiv.hideTimeout);
    }
    statusDiv.classList.remove('show', 'hide', 'status-success', 'status-error', 'status-warning');
    switch (type) {
        case 'success':
            statusDiv.classList.add('status-success');
            break;
        case 'error':
            statusDiv.classList.add('status-error');
            break;
        case 'warning':
            statusDiv.classList.add('status-warning');
            break;
    }
    void statusDiv.offsetWidth;
    statusDiv.innerText = message;
    statusDiv.classList.add('show');
    statusDiv.hideTimeout = setTimeout(() => {
        statusDiv.classList.add('hide');
        setTimeout(() => {
            statusDiv.innerText = '';
            statusDiv.classList.remove('show', 'hide', 'status-success', 'status-error', 'status-warning');
        }, 300);
    }, 2000);
}

function startPixelRecoveryTimer() {
    if (state.currentQuota < state.maxQuota && !state.pixelRecoveryInterval) {
        state.pixelRecoveryInterval = setInterval(() => {
            socket.emit('request-quota-update');
        }, 1000);
    }
}

function stopPixelRecoveryTimer() {
    if (state.pixelRecoveryInterval) {
        clearInterval(state.pixelRecoveryInterval);
        state.pixelRecoveryInterval = null;
    }
}

function startRecoveryCountdown() {
    if (state.currentQuota >= state.maxQuota) {
        recoveryProgressBar.style.opacity = '0';
        recoveryProgressBar.style.strokeDasharray = '0, 100';
        return;
    }
    if (window.recoveryCountdownInterval) {
        clearInterval(window.recoveryCountdownInterval);
    }
    updateRecoveryProgress();
    window.recoveryCountdownInterval = setInterval(() => {
        state.recoveryCountdown--;
        if (state.recoveryCountdown >= 0) {
            updateRecoveryProgress();
        } else {
            recoveryProgressBar.style.opacity = '0';
            recoveryProgressBar.style.strokeDasharray = '0, 100';
            clearInterval(window.recoveryCountdownInterval);
            setTimeout(() => {
                socket.emit('request-quota-update');
            }, 500);
        }
    }, 1000);
}

function updateRecoveryProgress() {
    const progress = 100 - (state.recoveryCountdown * (100 / state.pixelRecoveryWindow));
    recoveryProgressBar.style.strokeDasharray = `${progress}, 100`;
}

function showBroadcastModal() {
    const broadcastModal = document.getElementById('broadcast-modal');
    const broadcastContent = document.getElementById('broadcast-content');
    const closeBtn = document.querySelector('.modal-close');
    fetch('/api/broadcast')
        .then(response => response.json())
        .then(data => {
            if (data.content) {
                const currentVersion = localStorage.getItem(BROADCAST_VERSION_KEY);
                if (currentVersion === String(data.version)) {
                    return;
                }
                broadcastContent.textContent = data.content;
                broadcastModal.classList.add('show');
                const closeModal = () => {
                    broadcastModal.style.animation = 'fadeOut 0.3s ease forwards';
                    broadcastModal.querySelector('.modal-content').style.animation = 'slideOut 0.3s ease forwards';
                    setTimeout(() => {
                        broadcastModal.classList.remove('show');
                        broadcastModal.style.animation = '';
                        broadcastModal.querySelector('.modal-content').style.animation = '';
                        localStorage.setItem(BROADCAST_VERSION_KEY, String(data.version));
                    }, 300);
                };
                closeBtn.onclick = closeModal;
                broadcastModal.onclick = (e) => {
                    if (e.target === broadcastModal) {
                        closeModal();
                    }
                };
            }
        })
}

function showBroadcastModalForce() {
    const broadcastModal = document.getElementById('broadcast-modal');
    const broadcastContent = document.getElementById('broadcast-content');
    const closeBtn = document.querySelector('.modal-close');
    fetch('/api/broadcast')
        .then(response => response.json())
        .then(data => {
            if (data.content) {
                broadcastContent.textContent = data.content;
                broadcastModal.classList.add('show');
                const closeModal = () => {
                    broadcastModal.style.animation = 'fadeOut 0.3s ease forwards';
                    broadcastModal.querySelector('.modal-content').style.animation = 'slideOut 0.3s ease forwards';
                    setTimeout(() => {
                        broadcastModal.classList.remove('show');
                        broadcastModal.style.animation = '';
                        broadcastModal.querySelector('.modal-content').style.animation = '';
                    }, 300);
                };
                closeBtn.onclick = closeModal;
                broadcastModal.onclick = (e) => {
                    if (e.target === broadcastModal) {
                        closeModal();
                    }
                };
            }
        })
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            checkAndShowBroadcast();
        }, 800);
    }
}

function checkAndShowBroadcast() {
    setTimeout(() => {
        showBroadcastModal();
    }, 600);
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

export {
    showStatus,
    startPixelRecoveryTimer,
    stopPixelRecoveryTimer,
    startRecoveryCountdown,
    updateRecoveryProgress,
    showBroadcastModal,
    showBroadcastModalForce,
    hideLoadingScreen,
    checkAndShowBroadcast,
    darkenColor
};
