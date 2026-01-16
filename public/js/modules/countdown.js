import { state } from './config.js';
import { requestRender } from './canvas.js';

function parseDateTime(timeStr) {
    const [datePart, timePart] = timeStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return date;
}

function formatTimeRemaining(ms) {
    if (ms <= 0) return '00:00:00';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) {
        return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateCountdown(startTime, endTime) {
    const now = new Date();
    const start = parseDateTime(startTime);
    const end = parseDateTime(endTime);
    
    const countdownDiv = document.getElementById('countdown');
    const countdownLabel = document.getElementById('countdownLabel');
    const countdownTime = document.getElementById('countdownTime');
    
    countdownDiv.style.display = 'flex';
    
    if (now < start) {
        const timeRemaining = start - now;
        countdownDiv.className = 'countdown waiting';
        countdownLabel.textContent = '即将开始';
        countdownTime.textContent = formatTimeRemaining(timeRemaining);
    } else if (now >= start && now < end) {
        const timeRemaining = end - now;
        countdownDiv.className = 'countdown';
        countdownLabel.textContent = '进行中';
        countdownTime.textContent = formatTimeRemaining(timeRemaining);
    } else {
        countdownDiv.className = 'countdown ended';
        countdownLabel.textContent = '';
        countdownTime.textContent = '已结束';
    }
}

function initCountdown(startTime, endTime) {
    updateCountdown(startTime, endTime);
    setInterval(() => updateCountdown(startTime, endTime), 1000);
    if (state.enablePixelCountdown) {
        setInterval(() => render(), 1000);
    }
}

function initConfig(config) {
    if (config.siteTitle) {
        document.title = config.siteTitle;
    }
    if (config.siteIcon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = config.siteIcon;
    }
    if (config.broadcastTitle) {
        const broadcastTitle = document.querySelector('#broadcast-modal .modal-header h2');
        if (broadcastTitle) {
            broadcastTitle.textContent = config.broadcastTitle;
        }
    }
    if (config.enableTimeLimit) {
        initCountdown(config.timeLimitStart, config.timeLimitEnd);
        
        if (config.enablePixelCountdown) {
            state.enablePixelCountdown = true;
            state.pixelCountdownPosition = config.pixelCountdownPosition || 'top-right';
            state.pixelCountdownColor = config.pixelCountdownColor || '#000000';
            state.pixelCountdownFontSize = config.pixelCountdownFontSize || 12;
            state.pixelCountdownOffsetX = config.pixelCountdownOffsetX || 0;
            state.pixelCountdownOffsetY = config.pixelCountdownOffsetY || 0;
            state.timeLimitStart = config.timeLimitStart;
            state.timeLimitEnd = config.timeLimitEnd;
            
            setInterval(() => {
                if (state.enablePixelCountdown && state.timeLimitStart && state.timeLimitEnd) {
                    requestRender();
                }
            }, 1000);
        }
    }
}

export { parseDateTime, formatTimeRemaining, updateCountdown, initCountdown, initConfig };
