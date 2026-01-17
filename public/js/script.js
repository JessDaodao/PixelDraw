import { initSocketListeners } from './modules/socket.js';
import { resizeCanvas } from './modules/canvas.js';
import { initAuth } from './modules/auth.js';
import { initTools } from './modules/tools.js';
import { initViewport } from './modules/viewport.js';
import { initConfig } from './modules/countdown.js';

console.log(
`   _____ _         _ ____\n` +
`  |  _  |_|_ _ ___| |    \\ ___ ___ _ _ _\n` +
`  |   __| |_'_| -_| |  |  |  _| .'| | | |\n` +
`  |__|  |_|_,_|___|_|____/|_| |__,|_____|\n` +
`             ----Draw Magic!----\n` +
`\n` +
`Powered by PixelDraw\n` +
`Github: https://github.com/JessDaodao/PixelDraw\n`
);

fetch('/api/config')
    .then(res => res.json())
    .then(initConfig);

initSocketListeners();
initAuth();
initTools();
initViewport();

window.addEventListener('resize', resizeCanvas);
