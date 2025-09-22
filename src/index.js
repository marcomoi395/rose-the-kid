require('dotenv').config();
require('./configs/init.mongodb');
const DiscordService = require('./services/discord.js');

const log = {
    info: (...a) => console.log(new Date().toISOString(), '[INFO]', ...a),
    warn: (...a) => console.warn(new Date().toISOString(), '[WARN]', ...a),
    error: (...a) => console.error(new Date().toISOString(), '[ERROR]', ...a),
};

function assertEnv() {
    const required = ['BOT_DISCORD_TOKEN'];
    const missing = required.filter(
        (k) => !process.env[k] || process.env[k].trim() === '',
    );
    if (missing.length) {
        throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}`);
    }
}

let discord;

async function shutdown(reason = 'unknown') {
    try {
        log.info(`Đang tắt bot (reason=${reason})...`);
        if (discord && typeof discord.stopBot === 'function') {
            await discord.stopBot();
        } else if (
            discord?.client &&
            typeof discord.client.destroy === 'function'
        ) {
            // fallback nếu DiscordService chưa có stopBot()
            await discord.client.destroy();
        }
    } catch (e) {
        log.error('Lỗi khi shutdown:', e);
    } finally {
        process.exit(reason === 'error' ? 1 : 0);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    log.error('uncaughtException:', err);
    shutdown('error');
});
process.on('unhandledRejection', (reason) => {
    log.error('unhandledRejection:', reason);
    shutdown('error');
});

async function main() {
    assertEnv();

    discord = new DiscordService({
        token: process.env.BOT_DISCORD_TOKEN,
        discordId: process.env.BOT_DISCORD_ID,
    });

    await discord.startBot();
    log.info('Bot đã khởi động xong và sẵn sàng.');
}

(async () => {
    try {
        await main();
    } catch (err) {
        log.error('Lỗi khởi động:', err);
        await shutdown('error');
    }
})();
