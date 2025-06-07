const pool = require('./pool');

async function getItemsByCategoryId(categoryId) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, price, number_in_stock, category_id FROM items WHERE category_id = $1 ORDER BY name ASC',
      [categoryId]
    );
    return rows.map(item => ({
      ...item,
      price: parseFloat(item.price)
    }));
  } catch (error) {
    console.error(`Error in getItemsByCategoryId for category ${categoryId}:`, error);
    throw error;
  }
}

async function getItemById(id) {
  try {
    const { rows } = await pool.query(`
      SELECT
          i.id,
          i.name,
          i.description,
          i.price,
          i.number_in_stock,
          i.category_id,
          c.name AS category_name
      FROM
          items i
      JOIN
          categories c ON i.category_id = c.id
      WHERE
          i.id = $1;
    `, [id]);
    if (rows[0]) {
      rows[0].price = parseFloat(rows[0].price);
    }
    return rows[0];
  } catch (error) {
    console.error(`Error in getItemById for ID ${id}:`, error);
    throw error;
  }
}

async function addItem(name, description, price, number_in_stock, category_id) {
  try {
    const { rows } = await pool.query(
      'INSERT INTO items (name, description, price, number_in_stock, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
      [name, description, price, number_in_stock, category_id]
    );
    if (rows[0]) {
        rows[0].price = parseFloat(rows[0].price);
    }
    return rows[0];
  } catch (error) {
    console.error('Error in addItem:', error);
    throw error;
  }
}

// ⭐ NEW FUNCTION: Update an existing item ⭐
async function updateItem(id, name, description, price, number_in_stock, category_id) {
  try {
    const { rows } = await pool.query(
      'UPDATE items SET name = $1, description = $2, price = $3, number_in_stock = $4, category_id = $5 WHERE id = $6 RETURNING *;',
      [name, description, price, number_in_stock, category_id, id]
    );
    if (rows[0]) {
        rows[0].price = parseFloat(rows[0].price);
    }
    return rows[0];
  } catch (error) {
    console.error(`Error in updateItem for ID ${id}:`, error);
    throw error;
  }
}

// ⭐ NEW FUNCTION: Delete an item ⭐ (This was missing)
/**
 * Deletes an item from the database.
 * @param {number} id - The ID of the item to delete.
 * @returns {Promise<boolean>} True if an item was deleted, false otherwise.
 * @throws {Error} If there's an error during the database query.
 */
async function deleteItem(id) {
  try {
    const { rowCount } = await pool.query('DELETE FROM items WHERE id = $1;', [id]);
    return rowCount > 0; // Returns true if one or more rows were deleted
  } catch (error) {
    console.error(`Error in deleteItem for ID ${id}:`, error);
    throw error;
  }
}

module.exports = {
  getItemsByCategoryId,
  getItemById,
  addItem,
  updateItem,
  deleteItem, // ⭐ Export the new function ⭐
};