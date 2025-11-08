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
    const content = batch.map(renderItem).join('\n').slice(0, Number(MAX_BODY));

    try {
        const res = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                username: USERNAME,
                avatar_url: AVATAR_URL,
            }),
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

function formatVND(n) {
    try {
        return n.toLocaleString('vi-VN');
    } catch {
        return String(n);
    }
}

function formatTimeVN(iso) {
    try {
        return new Date(iso).toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
        });
    } catch {
        return iso;
    }
}
/*
{
    transaction_id: txId,
    content: 'Test payment content (auto-generated)',
    credit_amount: 500000,
    debit_amount: 0,
    date: new Date(),
    account_receiver: '000123456789',
    account_sender: '999987654321',
    name_sender: 'Test Sender',
}
*/

function renderItem(i) {
    const CYAN = '\u001b[36m';
    const YELLOW = '\u001b[33m';
    const GREEN = '\u001b[32m';
    const RED = '\u001b[31m';
    const RESET = '\u001b[0m';

    const header = `${CYAN}[${i.source}]${RESET} ${YELLOW}[${i.level}]${RESET}`;

    const isCredit = (i.data.credit_amount ?? 0) > 0;
    const typ = isCredit ? 'CREDIT' : 'DEBIT';
    const amt = isCredit ? i.data.credit_amount : i.data.debit_amount;
    const typC = isCredit ? `${GREEN}${typ}${RESET}` : `${RED}${typ}${RESET}`;
    const amtC = isCredit
        ? `${GREEN}+${formatVND(amt)}${RESET}`
        : `${RED}-${formatVND(amt)}${RESET}`;

    const when = formatTimeVN(i.data.date);

    return `\`\`\`ansi
${header}
[TX:${i.data.transaction_id}] ${typC} ${amtC}  ${YELLOW}[${when}]${RESET}
From : ${i.data.account_sender}${i.data.name_sender ? ' - ' + i.data.name_sender : ''}
To   : ${i.data.account_receiver}
Note : ${i.data.content}
\`\`\``;
}

function enqueue({ source, level, data }) {
    queue.push({ source, level, data });
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
