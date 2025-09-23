const required = ['BOT_DISCORD_TOKEN'];

function assertEnv() {
    const missing = required.filter(
        (k) => !process.env[k] || process.env[k].trim() === '',
    );
    if (missing.length) {
        throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}`);
    }
}

module.exports = assertEnv;
