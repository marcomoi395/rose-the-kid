const logger = require('../utils/logger');
const express = require('express');
const { enqueue, drainAndStop } = require('./log');

let httpServer;

const {
    DISCORD_WEBHOOK_URL,
    LOG_SHARED_TOKEN,
    LOG_SERVER_PORT = '4000',
} = process.env;

function buildApp() {
    const app = express();
    app.use(express.json({ limit: '256kb' }));

    app.get('/health', (_req, res) => {
        res.json({ ok: true, up: true });
    });

    app.post('/log', (req, res) => {
        if (!LOG_SHARED_TOKEN || !DISCORD_WEBHOOK_URL) {
            return res.status(503).json({
                ok: false,
                error: 'Logger chưa cấu hình DISCORD_WEBHOOK_URL/LOG_SHARED_TOKEN',
            });
        }

        const token = req.get('X-Log-Token');
        if (token !== LOG_SHARED_TOKEN) {
            return res.status(401).json({ ok: false, error: 'Unauthorized' });
        }

        const data = req.body.data || '',
            level = req.body.event === 'payment.created' ? 'INFO' : 'UNKNOWN',
            source = req.body.source || 'unknown';

        enqueue({ source, level, data });

        return res.json({ ok: true });
    });

    return app;
}

async function startHttp() {
    if (!DISCORD_WEBHOOK_URL || !LOG_SHARED_TOKEN) {
        logger.warn(
            'Bỏ qua HTTP logger vì thiếu DISCORD_WEBHOOK_URL hoặc LOG_SHARED_TOKEN (.env).',
        );
        return;
    }
    const app = buildApp();
    await new Promise((resolve) => {
        httpServer = app.listen(Number(LOG_SERVER_PORT), () => {
            logger.info(`HTTP logger đang lắng trên port ${LOG_SERVER_PORT}`);
            resolve();
        });
    });
}

async function stopHttp() {
    try {
        if (httpServer) {
            await new Promise((resolve, reject) => {
                httpServer.close((err) => (err ? reject(err) : resolve()));
            });
            httpServer = null;
        }

        await drainAndStop();
    } catch (e) {
        logger.error('Lỗi khi dừng HTTP logger:', e);
    }
}

module.exports = { startHttp, stopHttp };
