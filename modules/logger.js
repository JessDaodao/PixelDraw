function log(message, level = 'INFO') {
    const timestamp = new Date().toTimeString().slice(0, 8);
    console.log(`[${timestamp}/${level}]: ${message}`);
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