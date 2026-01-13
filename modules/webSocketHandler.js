const { log, logError, logWarn } = require('./logger');
const config = require('./config');
const https = require('https');

class WebSocketHandler {
    constructor(io, dataPersistence) {
        this.io = io;
        this.dataPersistence = dataPersistence;
        this.sessions = this.dataPersistence.getSessions();
        this.userRateLimits = this.dataPersistence.getUserRateLimits();
        this.activeConnections = new Map();
        this.adminSessions = new Set();
        this.adminAttempts = new Map();
        this.adminCooldowns = new Map();
        this.boardClearedOnStart = false;
        
        this.io.use(async (socket, next) => {
            const auth = socket.handshake.auth || {};
            const token = auth.token;
            const sessionKey = auth.sessionKey;
            socket.user = { isGuest: true, id: null, nickname: 'Guest' };
            if (sessionKey && this.sessions.has(sessionKey)) {
                socket.user = this.sessions.get(sessionKey);
                return next();
            }
            if (token) {
                const user = await this.verifyToken(token);
                if (user) {
                    const newSessionKey = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    this.sessions.set(newSessionKey, user);
                    socket.user = user;
                    socket.newSessionKey = newSessionKey;
                }
            }
            
            next();
        });
        this.setupSocketHandlers();
        this.startActivityMonitor();
        this.startRateLimitsAutoSave();
    }

    async verifyToken(token) {
        return new Promise((resolve) => {
            const verifyUrl = `https://eqmemory.cn/eu-json/eu-connect/v1/user-profile?token=${token}`;
            
            const options = {
                headers: {
                    'User-Agent': 'PixelDraw-Server/1.0',
                    'Accept': 'application/json'
                }
            };
            const req = https.get(verifyUrl, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        logError(`Token验证请求失败，状态码: ${res.statusCode}`);
                        logError(`响应内容摘要: ${data.substring(0, 100)}...`);
                        resolve(null);
                        return;
                    }
                    try {
                        const userInfo = JSON.parse(data);
                        
                        if (userInfo && userInfo.id && !userInfo.error) {
                            resolve({
                                id: userInfo.id,
                                nickname: userInfo.nickname,
                                avatar: userInfo.avatar,
                                isGuest: false
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        logError(`Token验证解析失败: ${e.message}`);
                        logError(`原始响应: ${data.substring(0, 200)}...`);
                        resolve(null);
                    }
                });
            });
            req.on('error', (e) => {
                logError('Token验证网络错误: ' + e.message);
                resolve(null);
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            const userIP = this.getUserIP(socket);
            const user = socket.user;
            log(`用户连接: ${userIP} (Socket: ${socket.id}, User: ${user.nickname})`);
            this.activeConnections.set(socket.id, {
                socket: socket,
                userIP: userIP,
                user: user,
                connectedAt: Date.now()
            });
            
            this.broadcastOnlineCount();
            
            if (!user.isGuest) {
                socket.emit('login-success', {
                    user: {
                        id: user.id,
                        nickname: user.nickname,
                        avatar: user.avatar
                    },
                    sessionKey: socket.newSessionKey
                });
                delete socket.newSessionKey;
            }
            socket.emit('init-board', { 
                board: this.dataPersistence.getBoard(), 
                boardWidth: config.BOARD_WIDTH,
                boardHeight: config.BOARD_HEIGHT,
                minZoom: config.MIN_ZOOM,
                maxZoom: config.MAX_ZOOM,
                maxPixels: config.MAX_PIXELS_PER_WINDOW,
                pixelRecoveryWindow: config.PIXEL_RECOVERY_WINDOW
            });
            
            this.updateUserQuota(socket);
            socket.on('draw-pixel', ({ x, y, color }) => {
                this.handleDrawPixel(socket, x, y, color);
            });
            socket.on('disconnect', () => {
                log(`用户断开连接: ${userIP} (Socket: ${socket.id})`);
                this.activeConnections.delete(socket.id);
                this.broadcastOnlineCount();
            });
            socket.on('request-quota-update', () => {
                this.updateUserQuota(socket);
            });
            
            socket.on('verify-admin', (password) => {
                this.handleAdminVerification(socket, password);
            });
            
            socket.on('exit-admin-mode', () => {
                this.handleExitAdminMode(socket);
            });
        });
    }

    getUserIP(socket) {
        let ip = socket.handshake.headers['x-forwarded-for'];
        if (ip) {
            ip = ip.split(',')[0].trim();
        } else {
            ip = socket.handshake.address;
            if (ip && ip.startsWith('::ffff:')) {
                ip = ip.substring(7);
            }
        }
        return ip || 'unknown';
    }

    broadcastOnlineCount() {
        const onlineCount = this.activeConnections.size;
        this.io.emit('online-count', onlineCount);
    }

    handleDrawPixel(socket, x, y, color) {
        if (socket.user.isGuest) {
            socket.emit('error-message', '游客无法绘图，请先登录！');
            return;
        }
        
        const isAdmin = this.adminSessions.has(socket.id);
        
        if (config.ENABLE_TIME_LIMIT && !isAdmin) {
            const now = new Date();
            const [startDate, startTime] = config.TIME_LIMIT_START.split(' ');
            const [endDate, endTime] = config.TIME_LIMIT_END.split(' ');
            const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            const startDateTime = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0, 0);
            const endDateTime = new Date(endYear, endMonth - 1, endDay, endHour, endMinute, 0, 0);
            if (now < startDateTime || now >= endDateTime) {
                socket.emit('error-message', '活动未开始或已结束');
                return;
            }
        }
        if (x < 0 || x >= config.BOARD_WIDTH || y < 0 || y >= config.BOARD_HEIGHT) {
            return;
        }
        const currentColor = this.dataPersistence.getPixel(x, y);
        if (currentColor === color) {
            return;
        }
        
        if (isAdmin) {
            if (this.dataPersistence.updatePixel(x, y, color)) {
                this.io.emit('pixel-update', { x, y, color });
                this.updateUserQuota(socket);
            }
            return;
        }
        
        const now = Date.now();
        
        const rateLimitKey = socket.user.id;
        
        let userLimit = this.userRateLimits[rateLimitKey];
        if (!userLimit) {
            userLimit = {
                tokens: config.MAX_PIXELS_PER_WINDOW,
                lastRefillTime: now,
                maxTokens: config.MAX_PIXELS_PER_WINDOW
            };
            this.userRateLimits[rateLimitKey] = userLimit;
        }
        const timeSinceLastRefill = now - userLimit.lastRefillTime;
        const tokensToRefill = Math.floor(timeSinceLastRefill / (config.PIXEL_RECOVERY_WINDOW * 1000));
        
        if (tokensToRefill > 0) {
            userLimit.tokens = Math.min(userLimit.tokens + tokensToRefill, userLimit.maxTokens);
            userLimit.lastRefillTime = now;
        }
        if (userLimit.tokens > 0) {
            userLimit.tokens -= 1;
            
            if (this.dataPersistence.updatePixel(x, y, color)) {
                this.io.emit('pixel-update', { x, y, color });
                this.updateUserQuota(socket);
                this.saveUserRateLimits();
            }
        } else {
            const waitTime = config.PIXEL_RECOVERY_WINDOW - Math.floor((now - userLimit.lastRefillTime) / 1000) % config.PIXEL_RECOVERY_WINDOW;
            socket.emit('error-message', `像素已用完！请等待 ${waitTime} 秒`);
        }
    }

    saveUserRateLimits() {
        this.dataPersistence.saveUserRateLimits(this.userRateLimits);
    }

    updateUserQuota(socket) {
        if (socket.user.isGuest) {
            socket.emit('quota-update', 0, null);
            return;
        }
        const now = Date.now();
        const rateLimitKey = socket.user.id;
        
        let userLimit = this.userRateLimits[rateLimitKey];
        
        if (!userLimit) {
            userLimit = {
                tokens: config.MAX_PIXELS_PER_WINDOW,
                lastRefillTime: now,
                maxTokens: config.MAX_PIXELS_PER_WINDOW
            };
            this.userRateLimits[rateLimitKey] = userLimit;
        }
        
        const timeSinceLastRefill = now - userLimit.lastRefillTime;
        const tokensToRefill = Math.floor(timeSinceLastRefill / (config.PIXEL_RECOVERY_WINDOW * 1000));
        
        if (tokensToRefill > 0) {
            userLimit.tokens = Math.min(userLimit.tokens + tokensToRefill, userLimit.maxTokens);
            userLimit.lastRefillTime = now;
        }
        
        let nextRefillTime = null;
        if (userLimit.tokens < userLimit.maxTokens) {
            const timeUntilNextRefill = config.PIXEL_RECOVERY_WINDOW * 1000 - (now - userLimit.lastRefillTime) % (config.PIXEL_RECOVERY_WINDOW * 1000);
            nextRefillTime = Math.ceil(timeUntilNextRefill / 1000);
        }
        
        socket.emit('quota-update', userLimit.tokens, nextRefillTime);
    }

    cleanupInactiveUsers() {
        const now = Date.now();
        for (const [key, limit] of Object.entries(this.userRateLimits)) {
            if (now > limit.lastRefillTime + (5 * 60 * 1000)) {
                delete this.userRateLimits[key];
            }
        }
    }

    handleAdminVerification(socket, password) {
        if (socket.user.isGuest) {
            socket.emit('admin-verify-result', { success: false, message: '请先登录' });
            return;
        }
        
        const userId = socket.user.id;
        
        if (this.adminCooldowns.has(userId)) {
            const cooldownEnd = this.adminCooldowns.get(userId);
            const remainingTime = Math.ceil((cooldownEnd - Date.now()) / 1000);
            if (remainingTime > 0) {
                socket.emit('admin-verify-result', { 
                    success: false, 
                    message: `密码错误次数过多，请等待 ${remainingTime} 秒后再试`,
                    cooldown: remainingTime
                });
                return;
            } else {
                this.adminCooldowns.delete(userId);
                this.adminAttempts.delete(userId);
            }
        }
        
        if (password === config.ADMIN_PASSWORD) {
            this.adminAttempts.delete(userId);
            this.adminCooldowns.delete(userId);
            this.adminSessions.add(socket.id);
            socket.emit('admin-verify-result', { success: true });
            log(`用户 ${socket.user.nickname} (ID: ${socket.user.id}) 已进入管理员模式`);
        } else {
            const attempts = (this.adminAttempts.get(userId) || 0) + 1;
            this.adminAttempts.set(userId, attempts);
            
            if (attempts >= config.ADMIN_MAX_ATTEMPTS) {
                const cooldownDuration = config.ADMIN_COOLDOWN_MINUTES * 60 * 1000;
                this.adminCooldowns.set(userId, Date.now() + cooldownDuration);
                socket.emit('admin-verify-result', { 
                    success: false, 
                    message: `密码错误次数过多`,
                    cooldown: config.ADMIN_COOLDOWN_MINUTES * 60
                });
                logWarn(`用户 ${socket.user.nickname} (ID: ${socket.user.id}) 因多次密码错误被禁止登录${config.ADMIN_COOLDOWN_MINUTES}分钟`);
            } else {
                socket.emit('admin-verify-result', { 
                    success: false, 
                    message: `密码错误，您还有 ${config.ADMIN_MAX_ATTEMPTS - attempts} 次尝试机会`
                });
            }
        }
    }

    handleExitAdminMode(socket) {
        if (this.adminSessions.has(socket.id)) {
            this.adminSessions.delete(socket.id);
            socket.emit('admin-mode-exited');
            log(`用户 ${socket.user.nickname} (ID: ${socket.user.id}) 已退出管理员模式`);
        }
    }

    async handleActivityStarted() {
        if (config.CLEAR_BOARD_ON_START && !this.boardClearedOnStart) {
            this.boardClearedOnStart = true;
            log('正在生成备份并清空画板');
            
            try {
                await this.dataPersistence.saveBoardData(true);
                this.dataPersistence.clearBoard();
                
                this.io.emit('init-board', {
                    board: this.dataPersistence.getBoard(),
                    boardWidth: config.BOARD_WIDTH,
                    boardHeight: config.BOARD_HEIGHT,
                    minZoom: config.MIN_ZOOM,
                    maxZoom: config.MAX_ZOOM,
                    maxPixels: config.MAX_PIXELS_PER_WINDOW,
                    pixelRecoveryWindow: config.PIXEL_RECOVERY_WINDOW
                });
            } catch (error) {
                logError('清空画板失败: ' + error);
            }
        }
    }

    startActivityMonitor() {
        if (!config.ENABLE_TIME_LIMIT || !config.CLEAR_BOARD_ON_START) {
            return;
        }

        if (this.activityMonitorInterval) {
            clearInterval(this.activityMonitorInterval);
        }

        this.activityMonitorInterval = setInterval(() => {
            const now = new Date();
            
            const [startDate, startTime] = config.TIME_LIMIT_START.split(' ');
            const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const startDateTime = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0, 0);
            
            const timeUntilStart = startDateTime - now;
            
            if (timeUntilStart <= 0 && timeUntilStart > -60000) {
                this.handleActivityStarted();
                clearInterval(this.activityMonitorInterval);
                this.activityMonitorInterval = null;
            }
        }, 500);
    }

    startRateLimitsAutoSave() {
        if (this.rateLimitsAutoSaveInterval) {
            clearInterval(this.rateLimitsAutoSaveInterval);
        }

        this.rateLimitsAutoSaveInterval = setInterval(() => {
            this.saveUserRateLimits();
        }, 60000);
    }

    async disconnectAllUsers() {
        const connectionCount = this.activeConnections.size;
        log(`正在断开所有连接`);
        
        if (connectionCount === 0) {
            return;
        }
        
        this.io.emit('server-shutdown', { 
            timestamp: new Date().toISOString()
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        for (const [socketId, connection] of this.activeConnections) {
            try {
                if (connection.socket.connected) {
                    connection.socket.disconnect(true);
                }
            } catch (error) {
                logError(`断开连接失败 ${connection.userIP} (${socketId}): ${error.message}`);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        this.activeConnections.clear();
    }
}

module.exports = WebSocketHandler;
