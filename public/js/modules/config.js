const urlParams = new URLSearchParams(window.location.search);
const euToken = urlParams.get('eu_token');
const euSessionKey = localStorage.getItem('eu_session_key');
const isLiveMode = urlParams.has('live');

if (isLiveMode) {
    document.body.classList.add('live-mode');
}

const socket = io({
    auth: {
        token: euToken,
        sessionKey: euSessionKey
    }
});

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const colorCache = new Map();

const quotaSpan = document.getElementById('quota');
const recoveryProgressBar = document.getElementById('recoveryProgressBar');
const statusDiv = document.getElementById('status');
const connectionStatusDiv = document.getElementById('connection-status');
const pingTextSpan = document.getElementById('ping-text');

const loginBtn = document.getElementById('loginBtn');
const userInfoDiv = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userInfoWrapper = document.querySelector('.user-info-wrapper');
const logoutDropdown = document.getElementById('logoutDropdown');
const logoutBtn = document.getElementById('logoutBtn');

const adminModal = document.getElementById('admin-modal');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminVerifyBtn = document.getElementById('adminVerifyBtn');
const exitAdminBtn = document.getElementById('exitAdminBtn');
const adminModalClose = document.querySelector('.admin-modal-close');
const adminError = document.getElementById('adminError');
const adminTools = document.getElementById('adminTools');
const fillTool = document.getElementById('fillTool');
const brushTool = document.getElementById('brushTool');

const BROADCAST_VERSION_KEY = 'pixelDraw_broadcastVersion';
const COLOR_PRESETS_KEY = 'pixelDraw_colorPresets';
const MAX_COLOR_PRESETS = 10;
const RECONNECT_DELAY = 10000;

const state = {
    isAdminMode: false,
    adminErrorTimeout: null,
    cooldownTimer: null,
    currentCooldown: 0,
    currentTool: 'fill',
    isDrawing: false,
    BOARD_WIDTH: null,
    BOARD_HEIGHT: null,
    board: [],
    selectedColor: '#000000',
    isEraserSelected: false,
    MIN_ZOOM: null,
    MAX_ZOOM: null,
    colorPresets: [],
    scale: null,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMousePos: { x: 0, y: 0 },
    hoverPixel: null,
    initialPinchDistance: 0,
    initialScale: 1,
    initialTouchCenter: { x: 0, y: 0 },
    initialOffset: { x: 0, y: 0 },
    isPinching: false,
    wasPinching: false,
    touchStartTime: 0,
    touchStartPos: { x: 0, y: 0 },
    lastTouchPos: { x: 0, y: 0 },
    isTouchDragging: false,
    boardCacheDirty: true,
    boardCacheCanvas: null,
    boardCacheCtx: null,
    tempCanvas: null,
    tempCtx: null,
    pixelRecoveryInterval: null,
    currentQuota: 10,
    maxQuota: 100,
    pixelRecoveryWindow: 60,
    recoveryCountdown: 0,
    isAnimating: false,
    zoomAnimationId: null,
    zoomStartTime: null,
    zoomStartScale: null,
    zoomStartOffsetX: null,
    zoomStartOffsetY: null,
    zoomTargetScale: null,
    zoomTargetOffsetX: null,
    zoomTargetOffsetY: null,
    reconnectInterval: null,
    pingInterval: null,
    currentPing: 0,
    velocityX: 0,
    velocityY: 0,
    lastMoveTime: 0,
    inertiaAnimationId: null,
    renderAnimationId: null,
    renderRequested: false,
    friction: 0.95,
    minVelocity: 0.1,
    enablePixelCountdown: false,
    pixelCountdownPosition: 'top-right',
    pixelCountdownColor: '#000000',
    pixelCountdownFontSize: 12,
    pixelCountdownOffsetX: 0,
    pixelCountdownOffsetY: 0,
    timeLimitStart: null,
    timeLimitEnd: null
};

export {
    urlParams,
    euToken,
    euSessionKey,
    isLiveMode,
    socket,
    canvas,
    ctx,
    colorCache,
    quotaSpan,
    recoveryProgressBar,
    statusDiv,
    connectionStatusDiv,
    pingTextSpan,
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
    BROADCAST_VERSION_KEY,
    COLOR_PRESETS_KEY,
    MAX_COLOR_PRESETS,
    RECONNECT_DELAY,
    state
};
