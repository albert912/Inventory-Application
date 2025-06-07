// db/pool.js
require('dotenv').config(); // Load environment variables

const { Pool } = require('pg');

// Create a new Pool instance using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Optional: Log connection details (remove in production)
console.log('--- DB_HOST for inventory:', process.env.DB_HOST);
console.log('--- DB_USER for inventory:', process.env.DB_USER);
console.log('--- DB_NAME for inventory:', process.env.DB_DATABASE);
console.log('--- DB_PORT for inventory:', process.env.DB_PORT);

// Optional: Log a message when connected
pool.on('connect', () => {
  console.log('Connected to the inventory_db database!');
});

// Optional: Log errors if they occur
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Exit process if there's a serious connection error
});

module.exports = pool;