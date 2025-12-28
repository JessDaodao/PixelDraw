const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

const defaultConfig = {
    port: 3000,
    siteTitle: 'PixelDraw',
    siteIcon: 'img/icon.png',
    broadcastTitle: '公告',
    boardWidth: 800,
    boardHeight: 500,
    minZoom: 0.5,
    maxZoom: 20,
    rateLimitWindow: 10,
    maxPixelsPerWindow: 100,
    autoSaveInterval: 5,
    enableBackup: true,
    maxBackups: 5,
    enableTimeLimit: false,
    timeLimitStart: '2026-01-01 00:00',
    timeLimitEnd: '2026-03-01 00:00',
    adminPassword: generateRandomPassword(),
    adminMaxAttempts: 5,
    adminCooldownMinutes: 5
};

function loadConfig() {
    let userConfig = {};
    
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
            userConfig = JSON.parse(fileContent);
        } catch (error) {
            console.error('配置文件读取失败:', error.message);
        }
    } else {
        try {
            const initialConfig = { ...defaultConfig };
            initialConfig.adminPassword = generateRandomPassword();
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 4), 'utf8');
            userConfig = initialConfig;
        } catch (error) {
            console.error('配置文件创建失败:', error.message);
        }
    }
    
    const config = { ...defaultConfig, ...userConfig };
    
    config.PORT = config.port;
    config.SITE_TITLE = config.siteTitle;
    config.SITE_ICON = config.siteIcon;
    config.BROADCAST_TITLE = config.broadcastTitle;
    config.BOARD_WIDTH = config.boardWidth;
    config.BOARD_HEIGHT = config.boardHeight;
    config.MIN_ZOOM = config.minZoom;
    config.MAX_ZOOM = config.maxZoom;
    config.RATE_LIMIT_WINDOW = config.rateLimitWindow;
    config.MAX_PIXELS_PER_WINDOW = config.maxPixelsPerWindow;
    config.AUTO_SAVE_INTERVAL = config.autoSaveInterval;
    config.ENABLE_BACKUP = config.enableBackup;
    config.MAX_BACKUPS = config.maxBackups;
    config.ENABLE_TIME_LIMIT = config.enableTimeLimit;
    config.TIME_LIMIT_START = config.timeLimitStart;
    config.TIME_LIMIT_END = config.timeLimitEnd;
    config.ADMIN_PASSWORD = config.adminPassword;
    config.ADMIN_MAX_ATTEMPTS = config.adminMaxAttempts;
    config.ADMIN_COOLDOWN_MINUTES = config.adminCooldownMinutes;
    
    return config;
}

const config = loadConfig();

module.exports = config;