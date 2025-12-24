const ServerManager = require('./modules/serverManager');

console.log(`   _____ _         _ ____`);
console.log(`  |  _  |_|_ _ ___| |    \\ ___ ___ _ _ _`);
console.log(`  |   __| |_'_| -_| |  |  |  _| .'| | | |`);
console.log(`  |__|  |_|_,_|___|_|____/|_| |__,|_____|`);
console.log(`             ----EYPA Magic!----`);
console.log(``);

const serverManager = new ServerManager();
serverManager.start();