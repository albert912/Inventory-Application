// db/categoryQueries.js
const pool = require('./pool');

// Function to get all categories
async function getAllCategories() {
  try {
    const { rows } = await pool.query('SELECT id, name, description FROM categories ORDER BY name ASC');
    return rows;
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// Function to get a single category by ID
async function getCategoryById(id) {
  try {
    const { rows } = await pool.query('SELECT id, name, description FROM categories WHERE id = $1', [id]);
    return rows[0]; // Return the first (and should be only) row found
  } catch (error) {
    console.error(`Error in getCategoryById for ID ${id}:`, error);
    throw error;
  }
}

// Function to add a new category
async function addCategory(name, description) {
  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description;',
      [name, description]
    );
    return rows[0]; // Return the newly created category
  } catch (error) {
    console.error('Error in addCategory:', error);
    throw error;
  }
}

// ⭐ NEW FUNCTION: Update an existing category ⭐
/**
 * Updates an existing category in the database.
 * @param {number} id - The ID of the category to update.
 * @param {string} name - The new name of the category.
 * @param {string} [description] - The new description for the category (optional).
 * @returns {Promise<Object>} The updated category object.
 * @throws {Error} If there's an error during the database query or if category not found.
 */
async function updateCategory(id, name, description) {
  try {
    const { rows } = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description;',
      [name, description, id]
    );
    return rows[0]; // Return the updated category
  } catch (error) {
    console.error(`Error in updateCategory for ID ${id}:`, error);
    throw error;
  }
}

// ⭐ NEW FUNCTION: Delete a category ⭐
/**
 * Deletes a category from the database.
 * Assumes items associated with this category will be handled by DB ON DELETE CASCADE
 * or will become null/orphan depending on schema.
 * @param {number} id - The ID of the category to delete.
 * @returns {Promise<boolean>} True if a category was deleted, false otherwise.
 * @throws {Error} If there's an error during the database query.
 */
async function deleteCategory(id) {
  try {
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1;', [id]);
    return rowCount > 0; // Returns true if one or more rows were deleted
  } catch (error) {
    console.error(`Error in deleteCategory for ID ${id}:`, error);
    throw error;
  }
}


module.exports = {
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory, // ⭐ Export the new function ⭐
};