const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

const defaultConfig = {
    port: 3000,
    siteTitle: 'PixelDraw',
    siteIcon: 'img/icon.png',
    broadcastTitle: '公告',
    boardWidth: 800,
    boardHeight: 500,
    minZoom: 0.5,
    maxZoom: 20,
    rateLimitWindow: 2,
    maxPixelsPerWindow: 100,
    autoSaveInterval: 5,
    shutdownTimeout: 10000,
    enableBackup: true,
    maxBackups: 5,
    enableTimeLimit: false,
    timeLimitStart: '2026-01-01 00:00',
    timeLimitEnd: '2026-03-01 00:00'
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
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 4), 'utf8');
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
    config.SHUTDOWN_TIMEOUT = config.shutdownTimeout;
    config.ENABLE_BACKUP = config.enableBackup;
    config.MAX_BACKUPS = config.maxBackups;
    config.ENABLE_TIME_LIMIT = config.enableTimeLimit;
    config.TIME_LIMIT_START = config.timeLimitStart;
    config.TIME_LIMIT_END = config.timeLimitEnd;
    
    return config;
}

const config = loadConfig();

module.exports = config;