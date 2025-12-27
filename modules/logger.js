const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

const levelColors = {
    INFO: colors.green,
    ERROR: colors.red,
    WARN: colors.yellow,
    DEBUG: colors.blue
};

function log(message, level = 'INFO') {
    const timestamp = new Date().toTimeString().slice(0, 8);
    const color = levelColors[level] || colors.white;
    console.log(`[${timestamp}/${color}${level}${colors.reset}]: ${message}`);
}

function logError(message) {
    log(message, 'ERROR');
}

function logWarn(message) {
    log(message, 'WARN');
}

function logDebug(message) {
    log(message, 'DEBUG');
}

module.exports = {
    log,
    logError,
    logWarn,
    logDebug
};