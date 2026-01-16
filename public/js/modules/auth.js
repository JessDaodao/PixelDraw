import {
    loginBtn,
    userInfoDiv,
    userAvatar,
    userName,
    userInfoWrapper,
    logoutDropdown,
    logoutBtn,
    adminModal,
    adminPasswordInput,
    adminVerifyBtn,
    exitAdminBtn,
    adminModalClose,
    adminError,
    adminTools,
    fillTool,
    brushTool,
    socket,
    state
} from './config.js';
import { showStatus } from './utils.js';

function initAuth() {
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'https://eqmemory.cn/eu-authorize/?callback=' + encodeURIComponent(window.location.href);
        });
    }

    if (userInfoWrapper) {
        userInfoWrapper.addEventListener('click', toggleLogoutDropdown);
    }

    document.addEventListener('click', (e) => {
        if (logoutDropdown && logoutDropdown.style.display === 'block') {
            if (!userInfoWrapper.contains(e.target) && !logoutDropdown.contains(e.target)) {
                hideLogoutDropdown();
            }
        }
    });

    document.addEventListener('touchstart', (e) => {
        if (logoutDropdown && logoutDropdown.style.display === 'block') {
            if (!userInfoWrapper.contains(e.target) && !logoutDropdown.contains(e.target)) {
                hideLogoutDropdown();
            }
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (e.button === 1 && logoutDropdown && logoutDropdown.style.display === 'block') {
            if (!userInfoWrapper.contains(e.target) && !logoutDropdown.contains(e.target)) {
                hideLogoutDropdown();
            }
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.removeItem('eu_session_key');
            document.cookie.split(';').forEach(cookie => {
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
            window.location.reload();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            if (state.isAdminMode) {
                showStatus('您已在管理员模式中', 'warning');
            } else {
                showAdminModal();
            }
        }
    });

    if (adminModalClose) {
        adminModalClose.addEventListener('click', hideAdminModal);
    }

    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                hideAdminModal();
            }
        });
    }

    if (adminVerifyBtn) {
        adminVerifyBtn.addEventListener('click', verifyAdminPassword);
    }

    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyAdminPassword();
            }
        });
    }

    if (exitAdminBtn) {
        exitAdminBtn.addEventListener('click', () => {
            socket.emit('exit-admin-mode');
        });
    }

    if (fillTool) {
        fillTool.addEventListener('click', () => {
            setTool('fill');
        });
    }

    if (brushTool) {
        brushTool.addEventListener('click', () => {
            setTool('brush');
        });
    }
}

function toggleLogoutDropdown(e) {
    e.stopPropagation();
    const isVisible = logoutDropdown.classList.contains('show');
    if (isVisible) {
        logoutDropdown.classList.remove('show');
        setTimeout(() => {
            if (!logoutDropdown.classList.contains('show')) {
                logoutDropdown.style.display = 'none';
            }
        }, 200);
    } else {
        logoutDropdown.style.display = 'block';
        setTimeout(() => {
            logoutDropdown.classList.add('show');
        }, 10);
    }
}

function hideLogoutDropdown() {
    logoutDropdown.classList.remove('show');
    setTimeout(() => {
        if (!logoutDropdown.classList.contains('show')) {
            logoutDropdown.style.display = 'none';
        }
    }, 200);
}

function showAdminModal() {
    adminPasswordInput.value = '';
    adminModal.classList.add('show');
    adminPasswordInput.focus();
}

function hideAdminModal() {
    adminModal.style.animation = 'fadeOut 0.3s ease forwards';
    const modalContent = adminModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.animation = 'slideOut 0.3s ease forwards';
    }
    setTimeout(() => {
        adminModal.classList.remove('show');
        adminModal.style.animation = '';
        if (modalContent) {
            modalContent.style.animation = '';
        }
    }, 300);
}

function verifyAdminPassword() {
    const password = adminPasswordInput.value.trim();
    if (!password) {
        showAdminError('请输入密码');
        return;
    }
    
    socket.emit('verify-admin', password);
}

function showAdminError(message) {
    adminError.textContent = message;
    adminError.classList.add('show');
    
    if (state.adminErrorTimeout) {
        clearTimeout(state.adminErrorTimeout);
    }
    
    state.adminErrorTimeout = setTimeout(() => {
        adminError.classList.remove('show');
        state.adminErrorTimeout = null;
    }, 3000);
}

function startCooldownTimer(seconds) {
    if (state.cooldownTimer) {
        clearInterval(state.cooldownTimer);
    }
    
    state.currentCooldown = seconds;
    
    adminPasswordInput.disabled = true;
    adminVerifyBtn.disabled = true;
    
    adminError.textContent = `密码错误次数过多，请等待 ${seconds} 秒后再试`;
    adminError.classList.add('show', 'cooldown-active');
    
    state.cooldownTimer = setInterval(() => {
        state.currentCooldown--;
        
        if (state.currentCooldown <= 0) {
            clearInterval(state.cooldownTimer);
            state.cooldownTimer = null;
            
            adminPasswordInput.disabled = false;
            adminVerifyBtn.disabled = false;
            
            adminError.classList.remove('show', 'cooldown-active');
            adminError.textContent = '';
        } else {
            adminError.textContent = `密码错误次数过多，请等待 ${state.currentCooldown} 秒后再试`;
        }
    }, 1000);
}

function setTool(tool) {
    state.currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (tool === 'fill') {
        fillTool.classList.add('active');
    } else if (tool === 'brush') {
        brushTool.classList.add('active');
    }
}

export { initAuth, toggleLogoutDropdown, hideLogoutDropdown, showAdminModal, hideAdminModal, verifyAdminPassword, showAdminError, startCooldownTimer, setTool };
