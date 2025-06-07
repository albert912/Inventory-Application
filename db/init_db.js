// db/init_db.js
const pool = require('./pool');

async function initializeDatabase() {
  try {
    console.log('Attempting to connect to database...');
    // Test connection
    await pool.query('SELECT 1');
    console.log('Database connection successful.');

    // Drop tables if they exist (for fresh start during development)
    console.log('Dropping existing tables (if any)...');
    await pool.query('DROP TABLE IF EXISTS items CASCADE;'); // CASCADE deletes dependent items
    await pool.query('DROP TABLE IF EXISTS categories CASCADE;'); // CASCADE not strictly needed here but good practice

    // Create categories table
    console.log('Creating categories table...');
    await pool.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT
      );
    `);
    console.log('Categories table created.');

    // Create items table
    console.log('Creating items table...');
    await pool.query(`
      CREATE TABLE items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        number_in_stock INTEGER NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT
      );
    `);
    console.log('Items table created.');

    // Insert some initial data (optional, but good for testing)
    console.log('Inserting initial data...');

    const dairyCategory = await pool.query(
      "INSERT INTO categories (name, description) VALUES ('Dairy & Cheese', 'Milk, yogurt, cheese, and more.') RETURNING id;"
    );
    const produceCategory = await pool.query(
      "INSERT INTO categories (name, description) VALUES ('Produce', 'Fresh fruits and vegetables.') RETURNING id;"
    );
    const bakeryCategory = await pool.query(
      "INSERT INTO categories (name, description) VALUES ('Baked Goods', 'Freshly baked bread, pastries, and cakes.') RETURNING id;"
    );
    const beveragesCategory = await pool.query(
        "INSERT INTO categories (name, description) VALUES ('Beverages', 'Drinks like juice, soda, water.') RETURNING id;"
    );

    const dairyId = dairyCategory.rows[0].id;
    const produceId = produceCategory.rows[0].id;
    const bakeryId = bakeryCategory.rows[0].id;
    const beveragesId = beveragesCategory.rows[0].id;

    await pool.query(
      "INSERT INTO items (name, description, price, number_in_stock, category_id) VALUES ($1, $2, $3, $4, $5);",
      ['Organic Whole Milk', 'Creamy organic whole milk.', 4.50, 50, dairyId]
    );
    await pool.query(
      "INSERT INTO items (name, description, price, number_in_stock, category_id) VALUES ($1, $2, $3, $4, $5);",
      ['Cheddar Cheese Block', 'Sharp aged cheddar cheese.', 7.99, 30, dairyId]
    );
    await pool.query(
      "INSERT INTO items (name, description, price, number_in_stock, category_id) VALUES ($1, $2, $3, $4, $5);",
      ['Gala Apples', 'Sweet and crisp apples.', 1.99, 100, produceId]
    );
    await pool.query(
      "INSERT INTO items (name, description, price, number_in_stock, category_id) VALUES ($1, $2, $3, $4, $5);",
      ['Artisan Sourdough Bread', 'Freshly baked sourdough loaf.', 5.25, 20, bakeryId]
    );
    await pool.query(
      "INSERT INTO items (name, description, price, number_in_stock, category_id) VALUES ($1, $2, $3, $4, $5);",
      ['Orange Juice (No Pulp)', '100% pure squeezed orange juice.', 3.75, 40, beveragesId]
    );

    console.log('Initial data inserted successfully.');
    console.log('Database initialization complete!');

  } catch (err) {
    console.error('Database initialization failed:', err);
  } finally {
    // Ensure the pool ends its connection when script finishes
    await pool.end();
    console.log('Database connection pool closed.');
  }
}

initializeDatabase();