import {
    canvas,
    ctx,
    colorCache,
    state
} from './config.js';
import { parseDateTime, formatTimeRemaining } from './countdown.js';
import { darkenColor } from './utils.js';
import { renderColorPresets } from './tools.js';

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    if (state.offsetX === 0 && state.offsetY === 0) {
        const optimalScale = Math.min(
            (window.innerWidth * 0.8) / state.BOARD_WIDTH,
            (window.innerHeight * 0.8) / state.BOARD_HEIGHT
        );
        state.scale = Math.max(state.MIN_ZOOM, Math.min(optimalScale, state.MAX_ZOOM));
        state.offsetX = (window.innerWidth - state.BOARD_WIDTH * state.scale) / 2;
        state.offsetY = (window.innerHeight - state.BOARD_HEIGHT * state.scale) / 2;
    }
    const isMobile = window.innerWidth <= 768;
    if (isMobile && state.hoverPixel) {
        state.hoverPixel = null;
    }
    initBoardCache();
    requestRender();
    renderColorPresets();
}

function initBoardCache() {
    if (!state.boardCacheCanvas || state.boardCacheCanvas.width !== state.BOARD_WIDTH || state.boardCacheCanvas.height !== state.BOARD_HEIGHT) {
        state.boardCacheCanvas = document.createElement('canvas');
        state.boardCacheCanvas.width = state.BOARD_WIDTH;
        state.boardCacheCanvas.height = state.BOARD_HEIGHT;
        state.boardCacheCtx = state.boardCacheCanvas.getContext('2d', { alpha: false });
        state.boardCacheDirty = true;
    }
}

function updateBoardCache() {
    if (!state.boardCacheDirty || !state.boardCacheCtx) return;
    
    const imageData = state.boardCacheCtx.createImageData(state.BOARD_WIDTH, state.BOARD_HEIGHT);
    const data = imageData.data;
    
    const getRgb = (hex) => {
        if (colorCache.has(hex)) {
            return colorCache.get(hex);
        }
        const num = parseInt(hex.slice(1), 16);
        const rgb = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        colorCache.set(hex, rgb);
        return rgb;
    };
    
    const lightGrayColor = [238, 238, 238];
    
    for (let y = 0; y < state.BOARD_HEIGHT; y++) {
        const row = state.board[y];
        if (!row) continue;
        for (let x = 0; x < state.BOARD_WIDTH; x++) {
            const color = row[x];
            const rgb = color && color !== '#FFFFFF' ? getRgb(color) : lightGrayColor;
            const index = (y * state.BOARD_WIDTH + x) * 4;
            data[index] = rgb[0];
            data[index + 1] = rgb[1];
            data[index + 2] = rgb[2];
            data[index + 3] = 255;
        }
    }
    
    state.boardCacheCtx.putImageData(imageData, 0, 0);
    state.boardCacheDirty = false;
}

function renderViewport() {
    const viewportLeft = Math.max(0, Math.floor(-state.offsetX / state.scale));
    const viewportTop = Math.max(0, Math.floor(-state.offsetY / state.scale));
    const viewportRight = Math.min(state.BOARD_WIDTH, Math.ceil((window.innerWidth - state.offsetX) / state.scale));
    const viewportBottom = Math.min(state.BOARD_HEIGHT, Math.ceil((window.innerHeight - state.offsetY) / state.scale));
    
    const width = viewportRight - viewportLeft;
    const height = viewportBottom - viewportTop;
    
    if (!state.tempCanvas || state.tempCanvas.width < width || state.tempCanvas.height < height) {
        state.tempCanvas = document.createElement('canvas');
        state.tempCanvas.width = width;
        state.tempCanvas.height = height;
        state.tempCtx = state.tempCanvas.getContext('2d');
    } else {
        state.tempCanvas.width = width;
        state.tempCanvas.height = height;
    }
    
    const imageData = state.tempCtx.createImageData(width, height);
    const data = imageData.data;
    
    const getRgb = (hex) => {
        if (colorCache.has(hex)) {
            return colorCache.get(hex);
        }
        const num = parseInt(hex.slice(1), 16);
        const rgb = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        colorCache.set(hex, rgb);
        return rgb;
    };
    
    const lightGrayColor = [238, 238, 238];
    
    for (let y = viewportTop; y < viewportBottom; y++) {
        const row = state.board[y];
        if (!row) continue;
        const destY = y - viewportTop;
        for (let x = viewportLeft; x < viewportRight; x++) {
            const color = row[x];
            const rgb = color && color !== '#FFFFFF' ? getRgb(color) : lightGrayColor;
            const destX = x - viewportLeft;
            const index = (destY * width + destX) * 4;
            data[index] = rgb[0];
            data[index + 1] = rgb[1];
            data[index + 2] = rgb[2];
            data[index + 3] = 255;
        }
    }
    
    state.tempCtx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(state.tempCanvas, viewportLeft, viewportTop);
}

function requestRender() {
    if (!state.renderRequested) {
        state.renderRequested = true;
        state.renderAnimationId = requestAnimationFrame(() => {
            state.renderRequested = false;
            render();
        });
    }
}

function render() {
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(state.scale, state.scale);
    
    if (state.scale < 0.5) {
        updateBoardCache();
        if (state.boardCacheCanvas) {
            ctx.drawImage(state.boardCacheCanvas, 0, 0);
        } else {
            renderViewport();
        }
    } else {
        renderViewport();
    }
    
    if (state.scale > 10) {
        const viewportLeft = Math.max(0, Math.floor(-state.offsetX / state.scale));
        const viewportTop = Math.max(0, Math.floor(-state.offsetY / state.scale));
        const viewportRight = Math.min(state.BOARD_WIDTH, Math.ceil((window.innerWidth - state.offsetX) / state.scale));
        const viewportBottom = Math.min(state.BOARD_HEIGHT, Math.ceil((window.innerHeight - state.offsetY) / state.scale));
        
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = "#ccc";
        
        ctx.beginPath();
        for (let i = Math.max(0, viewportLeft); i <= Math.min(state.BOARD_WIDTH, viewportRight); i++) {
            ctx.moveTo(i, viewportTop);
            ctx.lineTo(i, viewportBottom);
        }
        for (let i = Math.max(0, viewportTop); i <= Math.min(state.BOARD_HEIGHT, viewportBottom); i++) {
            ctx.moveTo(viewportLeft, i);
            ctx.lineTo(viewportRight, i);
        }
        ctx.stroke();
    }
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && state.hoverPixel && state.hoverPixel.x >= 0 && state.hoverPixel.x < state.BOARD_WIDTH && state.hoverPixel.y >= 0 && state.hoverPixel.y < state.BOARD_HEIGHT) {
        const pixelColor = state.board[state.hoverPixel.y][state.hoverPixel.x] || '#eee';
        ctx.fillStyle = darkenColor(pixelColor, 30);
        ctx.fillRect(state.hoverPixel.x, state.hoverPixel.y, 1, 1);
    }
    if (state.enablePixelCountdown && state.timeLimitStart && state.timeLimitEnd) {
        drawPixelCountdown();
    }
    ctx.restore();
}

function drawPixelCountdown() {
    const now = new Date();
    const start = parseDateTime(state.timeLimitStart);
    const end = parseDateTime(state.timeLimitEnd);
    
    let text = '';
    let textColor = state.pixelCountdownColor;
    
    if (now < start) {
        const timeRemaining = start - now;
        text = formatTimeRemaining(timeRemaining);
    } else {
        return;
    }
    
    const pixelFont = {
        '0': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,1,1],
            [1,0,1,0,1],
            [1,1,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        '1': [
            [0,0,1,0,0],
            [0,1,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,1,1,1,0]
        ],
        '2': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [0,0,0,0,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,1,0,0,0],
            [1,1,1,1,1]
        ],
        '3': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [0,0,0,0,1],
            [0,0,1,1,0],
            [0,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        '4': [
            [0,0,0,1,0],
            [0,0,1,1,0],
            [0,1,0,1,0],
            [1,0,0,1,0],
            [1,1,1,1,1],
            [0,0,0,1,0],
            [0,0,0,1,0]
        ],
        '5': [
            [1,1,1,1,1],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        '6': [
            [0,1,1,1,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        '7': [
            [1,1,1,1,1],
            [0,0,0,0,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,1,0,0,0],
            [0,1,0,0,0],
            [0,1,0,0,0]
        ],
        '8': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0]
        ],
        '9': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,1],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [0,1,1,1,0]
        ],
        ':': [
            [0,0,0,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,0,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        '天': [
            [0,1,1,1,1,1,0],
            [0,0,0,1,0,0,0],
            [1,1,1,1,1,1,1],
            [0,0,0,1,0,0,0],
            [0,0,1,0,1,0,0],
            [0,1,0,0,0,1,0],
            [1,0,0,0,0,0,1]
        ]
    };
    
    const charWidth = 5;
    const charHeight = 7;
    const charSpacing = 1;
    const lineSpacing = 2;
    const pixelSize = Math.max(1, Math.floor(state.pixelCountdownFontSize / 7));
    
    const lines = text.split('\n');
    let totalWidth = 0;
    let totalHeight = lines.length * (charHeight + lineSpacing) - lineSpacing;
    totalHeight *= pixelSize;
    
    lines.forEach(line => {
        let lineWidth = 0;
        for (let char of line) {
            const fontChar = pixelFont[char];
            if (fontChar) {
                lineWidth += fontChar[0].length + charSpacing;
            }
        }
        if (lineWidth > totalWidth) {
            totalWidth = lineWidth;
        }
    });
    totalWidth *= pixelSize;
    
    let startX, startY;
    const padding = 2 * pixelSize;
    
    switch (state.pixelCountdownPosition) {
        case 'top-left':
            startX = padding;
            startY = padding;
            break;
        case 'top-right':
            startX = state.BOARD_WIDTH - totalWidth - padding;
            startY = padding;
            break;
        case 'bottom-left':
            startX = padding;
            startY = state.BOARD_HEIGHT - totalHeight - padding;
            break;
        case 'bottom-right':
            startX = state.BOARD_WIDTH - totalWidth - padding;
            startY = state.BOARD_HEIGHT - totalHeight - padding;
            break;
        case 'center':
            startX = Math.floor((state.BOARD_WIDTH - totalWidth) / 2);
            startY = Math.floor((state.BOARD_HEIGHT - totalHeight) / 2);
            break;
        default:
            startX = state.BOARD_WIDTH - totalWidth - padding;
            startY = padding;
    }
    
    startX += state.pixelCountdownOffsetX;
    startY += state.pixelCountdownOffsetY;
    
    ctx.fillStyle = textColor;
    
    let currentY = startY;
    lines.forEach(line => {
        let currentX = startX;
        for (let char of line) {
            const fontChar = pixelFont[char];
            if (fontChar) {
                for (let row = 0; row < fontChar.length; row++) {
                    for (let col = 0; col < fontChar[row].length; col++) {
                        if (fontChar[row][col] === 1) {
                            ctx.fillRect(
                                currentX + col * pixelSize,
                                currentY + row * pixelSize,
                                pixelSize,
                                pixelSize
                            );
                        }
                    }
                }
                currentX += (fontChar[0].length + charSpacing) * pixelSize;
            }
        }
        currentY += (charHeight + lineSpacing) * pixelSize;
    });
}

export { resizeCanvas, initBoardCache, updateBoardCache, renderViewport, requestRender, render, drawPixelCountdown };
