const sql = require("mssql");

// Samler alle Azure credentials fra .env så de ikke hardcodes i koden
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true // Kræves af Azure
    }
};

class Database {
    constructor() {
        this.pool = null;
    }

    // Opretter forbindelsen én gang og genbruger den
    async connect() {
        if (!this.pool) {
            this.pool = await sql.connect(config);
        }
        return this.pool;
    }

    async query(queryString, params = []) {
        const pool = await this.connect();
        const request = pool.request();
        
        // Parameteriserede queries forhindrer SQL injection
        params.forEach(p => request.input(p.name, p.value));
        
        return await request.query(queryString);
    }
}

module.exports = new Database();
