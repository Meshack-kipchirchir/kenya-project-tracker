const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,       // from .env
  user: process.env.DB_USER,       // from .env
  password: process.env.DB_PASSWORD, // from .env
  database: process.env.DB_NAME    // from .env
});

// Export a promise-based pool
module.exports = pool.promise();
