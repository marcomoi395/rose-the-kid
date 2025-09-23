const logger = require('../utils/logger');

let flushTimer = null;
const queue = [];
const {
    DISCORD_WEBHOOK_URL,
    BATCH_MAX = '10',
    BATCH_WINDOW_MS = '1500',
    MAX_BODY = '2000',
    USERNAME = 'Logger',
    AVATAR_URL = '',
} = process.env;

function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, Number(BATCH_WINDOW_MS));
}

async function flush() {
    flushTimer = null;
    if (queue.length === 0) return;

    const batch = queue.splice(0, Number(BATCH_MAX));
    const content = batch
        .map(
            (i) =>
                `\`\`\`ansi
\u001b[36m[${i.service}]\u001b[0m \u001b[33m[${i.level}]\u001b[0m
${i.message}
\`\`\``
        )
        .join('\n')
        .slice(0, Number(MAX_BODY));

    try {
        const res = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, username: USERNAME, avatar_url: AVATAR_URL}),
        });

        if (res.status === 429) {
            let retry = 2000;
            try {
                const data = await res.json();
                if (data && typeof data.retry_after === 'number') {
                    retry = Math.ceil(data.retry_after * 1000);
                }
            } catch (_) {
                console.error('Lỗi parse 429 body:', await res.text());
            }
            queue.unshift(...batch);
            setTimeout(scheduleFlush, retry);
            return;
        }

        if (!res.ok) {
            logger.warn('Discord webhook lỗi:', res.status, await res.text());
        }
    } catch (e) {
        logger.error('Gửi Discord thất bại:', e.message);
        queue.unshift(...batch);
    }

    if (queue.length > 0) scheduleFlush();
}

function enqueue({
    service = process.env.APP_NAME || 'app',
    level = 'INFO',
    message = '',
}) {
    if (!message || typeof message !== 'string') return;
    queue.push({ service, level, message });
    scheduleFlush();
}

async function drainAndStop() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (queue.length > 0) await flush();
}

module.exports = { enqueue, drainAndStop };
