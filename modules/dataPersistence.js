const fs = require('fs');
const path = require('path');
const { log, logError } = require('./logger');
const config = require('./config');

class DataPersistence {
    constructor() {
        this.board = Array(config.BOARD_HEIGHT).fill(null).map(() => 
            Array(config.BOARD_WIDTH).fill('#FFFFFF')
        );
        this.lastSave = null;
        this.createBackupDir();
    }

    createBackupDir() {
        if (!fs.existsSync(path.join(__dirname, '..', 'backup'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'backup'), { recursive: true });
        }
    }

    loadBoardData() {
        try {
            if (fs.existsSync(path.join(__dirname, '..', 'board_data.json'))) {
                const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'board_data.json'), 'utf8'));
                if (data.board && Array.isArray(data.board)) {
                    this.board = data.board;
                    log('数据加载成功');
                    return true;
                }
            }
            return false;
        } catch (error) {
            logError('数据加载失败: ' + error);
            return false;
        }
    }

    saveBoardData(isBackup = false) {
        return new Promise((resolve, reject) => {
            try {
                if (isBackup && !config.ENABLE_BACKUP) {
                    resolve();
                    return;
                }

                this.lastSave = new Date().toISOString();
                const data = {
                    board: this.board,
                    boardWidth: config.BOARD_WIDTH,
                    boardHeight: config.BOARD_HEIGHT,
                    lastSave: this.lastSave
                };
                
                const fileName = isBackup ? 
                    path.join(path.join(__dirname, '..', 'backup'), `board_backup_${Date.now()}.json`) : 
                    path.join(__dirname, '..', 'board_data.json');
                
                fs.writeFile(fileName, JSON.stringify(data, null, 2), (err) => {
                    if (err) {
                        logError('数据保存失败: ' + err);
                        reject(err);
                    } else {
                        if (isBackup) {
                            this.cleanOldBackups();
                        }
                        resolve();
                    }
                });
            } catch (error) {
                logError('数据保存失败: ' + error);
                reject(error);
            }
        });
    }

    cleanOldBackups() {
        try {
            const backupDir = path.join(__dirname, '..', 'backup');
            if (!fs.existsSync(backupDir)) {
                return;
            }

            const files = fs.readdirSync(backupDir)
                .filter(file => file.startsWith('board_backup_') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > config.MAX_BACKUPS) {
                const filesToDelete = files.slice(config.MAX_BACKUPS);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    log(`删除旧备份: ${file.name}`);
                });
            }
        } catch (error) {
            logError('旧备份删除失败: ' + error);
        }
    }

    getBoard() {
        return this.board;
    }

    setBoard(board) {
        this.board = board;
    }

    updatePixel(x, y, color) {
        if (x >= 0 && x < config.BOARD_WIDTH && y >= 0 && y < config.BOARD_HEIGHT) {
            this.board[y][x] = color;
            return true;
        }
        return false;
    }

    getPixel(x, y) {
        if (x >= 0 && x < config.BOARD_WIDTH && y >= 0 && y < config.BOARD_HEIGHT) {
            return this.board[y][x];
        }
        return null;
    }
}

module.exports = DataPersistence;