const path = require('path');

const config = {
    // 服务端口
    PORT: 3000,
    
    // 画布长度与宽度
    BOARD_WIDTH: 800,
    BOARD_HEIGHT: 600,
    
    // 最小缩放与最大缩放
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 20,
    
    // 用户每指定时间可放置的像素
    RATE_LIMIT_WINDOW: 2 * 60 * 1000,
    MAX_PIXELS_PER_WINDOW: 100,
    
    // 文件配置
    DATA_FILE: path.join(__dirname, '..', 'board_data.json'),
    BACKUP_DIR: path.join(__dirname, '..', 'backup'),
    
    // 自动保存间隔（毫秒）
    AUTO_SAVE_INTERVAL: 5 * 60 * 1000, // 5分钟
    
    // 关闭超时时间
    SHUTDOWN_TIMEOUT: 3000 // 3秒
};

module.exports = config;