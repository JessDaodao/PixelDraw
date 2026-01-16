import {
    COLOR_PRESETS_KEY,
    MAX_COLOR_PRESETS,
    socket,
    state
} from './config.js';
import { showStatus, showBroadcastModalForce } from './utils.js';

function loadColorPresets() {
    const saved = localStorage.getItem(COLOR_PRESETS_KEY);
    if (saved) {
        try {
            state.colorPresets = JSON.parse(saved);
        } catch (e) {
            state.colorPresets = [];
        }
    }
}

function saveColorPresets() {
    localStorage.setItem(COLOR_PRESETS_KEY, JSON.stringify(state.colorPresets));
}

function addColorPreset(color) {
    const existingIndex = state.colorPresets.indexOf(color);
    if (existingIndex !== -1) {
        state.colorPresets.splice(existingIndex, 1);
    }
    state.colorPresets.unshift(color);
    if (state.colorPresets.length > MAX_COLOR_PRESETS) {
        state.colorPresets = state.colorPresets.slice(0, MAX_COLOR_PRESETS);
    }
    saveColorPresets();
    renderColorPresets();
    selectColor(color);
    return existingIndex === -1;
}

function clearColorPresets() {
    state.colorPresets = [];
    saveColorPresets();
    renderColorPresets();
}

function renderColorPresets() {
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.innerHTML = '';
    if (state.colorPresets.length === 0) {
        colorPicker.style.display = 'none';
        return;
    }
    colorPicker.style.display = 'flex';
    const isMobile = window.innerWidth <= 768;
    const maxColors = isMobile ? 6 : state.colorPresets.length;
    state.colorPresets.slice(0, maxColors).forEach((color, index) => {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.style.background = color;
        btn.dataset.color = color;
        if (index === 0 && state.selectedColor === color) {
            btn.classList.add('selected');
        }
        colorPicker.appendChild(btn);
    });
}

function selectColor(color) {
    state.selectedColor = color;
    state.isEraserSelected = false;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('customColorPicker').classList.remove('selected');
    document.getElementById('eraser').classList.remove('selected');
    const targetBtn = document.querySelector(`[data-color="${color}"]`);
    if (targetBtn) {
        targetBtn.classList.add('selected');
    } else {
        document.getElementById('customColorPicker').classList.add('selected');
    }
    document.getElementById('customColorPicker').value = color;
}

function selectEraser() {
    state.isEraserSelected = true;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('customColorPicker').classList.remove('selected');
    document.getElementById('eraser').classList.add('selected');
}

function drawPixel(x, y) {
    if (x < 0 || x >= state.BOARD_WIDTH || y < 0 || y >= state.BOARD_HEIGHT) return;
    
    const drawColor = state.isEraserSelected ? '#FFFFFF' : state.selectedColor;
    
    if (state.board[y] && state.board[y][x] === drawColor) {
        return;
    }
    
    socket.emit('draw-pixel', { x, y, color: drawColor });
}

function drawLine(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
        drawPixel(x0, y0);
        
        if (x0 === x1 && y0 === y1) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function initTools() {
    loadColorPresets();
    if (state.colorPresets.length === 0) {
        state.colorPresets = ['#000000'];
        saveColorPresets();
    }
    if (state.colorPresets.length > 0) {
        state.selectedColor = state.colorPresets[0];
        document.getElementById('customColorPicker').value = state.selectedColor;
    }

    document.getElementById('customColorPicker').addEventListener('change', (e) => {
        selectColor(e.target.value);
    });

    document.getElementById('addColorPreset').addEventListener('click', () => {
        const color = state.selectedColor;
        if (addColorPreset(color)) {
            showStatus(`颜色已添加到预设`, 'success');
        }
    });

    document.getElementById('colorPicker').addEventListener('click', (e) => {
        if (e.target.dataset.color) {
            selectColor(e.target.dataset.color);
        }
    });

    document.getElementById('eraser').addEventListener('click', () => {
        selectEraser();
    });

    document.getElementById('broadcastBtn').addEventListener('click', () => {
        showBroadcastModalForce();
    });
}

export { loadColorPresets, saveColorPresets, addColorPreset, clearColorPresets, renderColorPresets, selectColor, selectEraser, drawPixel, drawLine, initTools };
