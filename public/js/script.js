import { initSocketListeners } from './modules/socket.js';
import { resizeCanvas } from './modules/canvas.js';
import { initAuth } from './modules/auth.js';
import { initTools } from './modules/tools.js';
import { initViewport } from './modules/viewport.js';
import { initConfig } from './modules/countdown.js';

fetch('/api/config')
    .then(res => res.json())
    .then(initConfig);

initSocketListeners();
initAuth();
initTools();
initViewport();

window.addEventListener('resize', resizeCanvas);
