const mongoose = require('mongoose');

class Database {
    constructor() {
        this.connect();
    }

    // Connect
    connect(type = 'mongodb') {
        mongoose
            .connect(process.env.MONGO_URL, { maxPoolSize: 50 })
            .then((_) => {
                console.log('Connected to MongoDB');
            })
            .catch((err) => console.error(err));
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }

        return Database.instance;
    }
}

module.exports = Database.getInstance();
