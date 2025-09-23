require('dotenv').config();
require('./configs/init.mongodb');
const DiscordService = require('./services/discord.js');
const assertEnv = require('./helper/assertEnv.js');
const logger = require('./utils/logger.js');
const { startHttp, stopHttp } = require('./services/webhook.js');

let discord;

async function shutdown(reason = 'unknown') {
    try {
        logger.info(`Đang tắt bot (reason=${reason})...`);
        await stopHttp();

        if (discord && typeof discord.stopBot === 'function') {
            await discord.stopBot();
        } else if (
            discord?.client &&
            typeof discord.client.destroy === 'function'
        ) {
            await discord.client.destroy();
        }
    } catch (e) {
        logger.error('Lỗi khi shutdown:', e);
    } finally {
        process.exit(reason === 'error' ? 2 : 0);
    }
}

async function main() {
    assertEnv();

    discord = new DiscordService({
        token: process.env.BOT_DISCORD_TOKEN,
        discordId: process.env.BOT_DISCORD_ID,
    });

    await discord.startBot();
    await startHttp();

    logger.info('Bot đã khởi động xong và sẵn sàng.');
}

(async () => {
    try {
        await main();
    } catch (err) {
        logger.error('Lỗi khởi động:', err);
        await shutdown('error');
    }
})();

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    logger.error('uncaughtException:', err);
    shutdown('error');
});
process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection:', reason);
    shutdown('error');
});

