const { enqueue } = require('../services/log');

const isProd = process.env.NODE_ENV === 'production';
const SERVICE = process.env.APP_NAME || 'app';

function join(a) {
    return a
        .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        .join(' ');
}

const logger = {
    info: (...a) => {
        console.log(new Date().toISOString(), '[INFO]', ...a);
    },
    warn: (...a) => {
        console.warn(new Date().toISOString(), '[WARN]', ...a);
        if (isProd)
            enqueue({ service: SERVICE, level: 'WARN', message: join(a) });
    },
    error: (...a) => {
        console.error(new Date().toISOString(), '[WARN]', ...a);
        if (isProd)
            enqueue({ service: SERVICE, level: 'ERROR', message: join(a) });
    },
};

module.exports = logger;
