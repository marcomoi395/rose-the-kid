const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            default: Date.now(),
        },
        title: String,
        content: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

const ConfessionModel = mongoose.model(
    'Confession',
    confessionSchema,
    'confessions',
);

module.exports = ConfessionModel;
