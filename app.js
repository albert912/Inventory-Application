require('dotenv').config();
const express = require("express");
const path = require("path"); // Corrected: removed extra '= require'
const app = express();

const pool = require('./db/pool');
const categoryQueries = require('./db/categoryQueries');
const itemQueries = require('./db/itemQueries');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
  try {
    const categories = await categoryQueries.getAllCategories();
    res.render("index", { title: "Inventory Application - Home", categories: categories });
  } catch (error) {
    console.error('Error on homepage:', error);
    res.status(500).send('Error loading the homepage.');
  }
});

app.get("/categories/new", (req, res) => {
  res.render("categoryForm", { title: "Add New Category", category: {}, errors: [] });
});

app.post("/categories/new", async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.render("categoryForm", {
      title: "Add New Category",
      category: { name, description },
      errors: [{ msg: 'Category name is required.' }]
    });
  }

  try {
    const newCategory = await categoryQueries.addCategory(name.trim(), description ? description.trim() : null);
    console.log('New category added:', newCategory);
    res.redirect('/');
  } catch (error) {
    if (error.code === '23505') {
      return res.render("categoryForm", {
        title: "Add New Category",
        category: { name, description },
        errors: [{ msg: 'A category with this name already exists. Please choose a different name.' }]
      });
    }
    console.error('Error adding new category:', error);
    res.status(500).send('Error adding new category.');
  }
});



app.get("/categories/:id/edit", async (req, res) => {
  const categoryId = parseInt(req.params.id, 10);

  if (isNaN(categoryId)) {
    return res.status(400).send("Invalid category ID.");
  }

  try {
    const category = await categoryQueries.getCategoryById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found.");
    }
    res.render("categoryForm", {
      title: `Edit Category: ${category.name}`,
      category: category,
      errors: []
    });
  } catch (error) {
    console.error(`Error loading edit category form for ID ${categoryId}:`, error);
    res.status(500).send('Error loading category edit form.');
  }
});

app.post("/categories/:id/edit", async (req, res) => {
  const categoryId = parseInt(req.params.id, 10);
  const { name, description } = req.body;

  if (isNaN(categoryId)) {
    return res.status(400).send("Invalid category ID for update.");
  }

  const errors = [];
  if (!name || name.trim() === '') {
    errors.push({ msg: 'Category name is required.' });
  }

  if (errors.length > 0) {
    try {
      const category = await categoryQueries.getCategoryById(categoryId);
      if (!category) {
        return res.status(404).send("Category not found for update.");
      }
      return res.render("categoryForm", {
        title: `Edit Category: ${category.name}`,
        category: { id: categoryId, name, description },
        errors: errors
      });
    } catch (fetchError) {
      console.error('Error re-rendering edit category form with validation errors:', fetchError);
      return res.status(500).send('Error processing category update form.');
    }
  }

  try {
    const updatedCategory = await categoryQueries.updateCategory(
      categoryId,
      name.trim(),
      description ? description.trim() : null
    );

    if (!updatedCategory) {
      return res.status(404).send("Category not found for update (after validation).");
    }

    console.log('Category updated:', updatedCategory);
    res.redirect(`/categories/${categoryId}`);
  } catch (error) {
    if (error.code === '23505') {
      errors.push({ msg: 'A category with this name already exists. Please choose a different name.' });
      try {
          const category = await categoryQueries.getCategoryById(categoryId);
          return res.render("categoryForm", {
            title: `Edit Category: ${category.name}`,
            category: { id: categoryId, name, description },
            errors: errors
          });
      } catch (fetchError) {
          console.error('Error re-rendering form after unique name error:', fetchError);
          return res.status(500).send('Error updating category.');
      }
    }
    console.error(`Error updating category ${categoryId}:`, error);
    res.status(500).send('Error updating category.');
  }
});

// ⭐ MODIFIED POST ROUTE: Handle category deletion with password ⭐
app.post("/categories/:id/delete", async (req, res) => {
  const categoryId = parseInt(req.params.id, 10);
  // ⭐ NEW: Get adminPassword from request body ⭐
  const { adminPassword } = req.body;

  if (isNaN(categoryId)) {
    return res.status(400).send("Invalid category ID for deletion.");
  }

  // ⭐ NEW: Password validation ⭐
  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    try {
        const category = await categoryQueries.getCategoryById(categoryId);
        const items = await itemQueries.getItemsByCategoryId(categoryId);
        // Re-render the category detail page with an error
        return res.render("categoryDetail", {
            title: category ? category.name : "Error",
            category: category,
            items: items,
            errors: [{ msg: 'Incorrect admin password.' }]
        });
    } catch (fetchError) {
        console.error('Error re-rendering category detail after password error:', fetchError);
        return res.status(500).send('Error processing category deletion.');
    }
  }
  // ⭐ END NEW password validation ⭐

  try {
    const deleted = await categoryQueries.deleteCategory(categoryId);

    if (deleted) {
      console.log(`Category ${categoryId} deleted successfully.`);
      res.redirect('/'); // Redirect to homepage after successful deletion
    } else {
      return res.status(404).send("Category not found or already deleted.");
    }
  } catch (error) {
    console.error(`Error deleting category ${categoryId}:`, error);
    // ⭐ Optional: More specific error for foreign key constraint ⭐
    if (error.code === '23503') { // Foreign key violation
        try {
            const category = await categoryQueries.getCategoryById(categoryId);
            const items = await itemQueries.getItemsByCategoryId(categoryId);
            return res.render("categoryDetail", {
                title: category ? category.name : "Error",
                category: category,
                items: items,
                errors: [{ msg: 'Cannot delete category: Please remove all associated items first.' }]
            });
        } catch (fetchError) {
            console.error('Error re-rendering category detail after FK error:', fetchError);
            return res.status(500).send('Error processing category deletion.');
        }
    }
    res.status(500).send('Error deleting category.');
  }
});

app.get("/categories/:id", async (req, res) => {
  const categoryId = parseInt(req.params.id, 10);

  if (isNaN(categoryId)) {
    return res.status(400).send("Invalid category ID.");
  }

  try {
    const category = await categoryQueries.getCategoryById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found.");
    }

    const items = await itemQueries.getItemsByCategoryId(categoryId);
    // ⭐ Pass 'errors' to categoryDetail.ejs ⭐
    res.render("categoryDetail", { title: category.name, category: category, items: items, errors: [] });

  } catch (error) {
    console.error(`Error loading category ${categoryId} details:`, error);
    res.status(500).send('Error loading category details.');
  }
});

// --- Item Routes ---
app.get("/items/new", async (req, res) => {
  try {
    const categories = await categoryQueries.getAllCategories();
    res.render("itemForm", {
      title: "Add New Item",
      item: {},
      categories: categories,
      errors: []
    });
  } catch (error) {
    console.error('Error loading new item form:', error);
    res.status(500).send('Error loading item creation form.');
  }
});

app.post("/items/new", async (req, res) => {
  const { name, description, price, number_in_stock, category_id } = req.body;

  const errors = [];
  if (!name || name.trim() === '') {
    errors.push({ msg: 'Item name is required.' });
  }
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    errors.push({ msg: 'Price must be a positive number.' });
  }
  if (!number_in_stock || isNaN(parseInt(number_in_stock, 10)) || parseInt(number_in_stock, 10) < 0) {
    errors.push({ msg: 'Number in stock must be a non-negative integer.' });
  }
  if (!category_id || isNaN(parseInt(category_id, 10))) {
    errors.push({ msg: 'A category must be selected.' });
  }

  if (errors.length > 0) {
    try {
      const categories = await categoryQueries.getAllCategories();
      return res.render("itemForm", {
        title: "Add New Item",
        item: { name, description, price, number_in_stock, category_id },
        categories: categories,
        errors: errors
      });
    } catch (catError) {
      console.error('Error fetching categories for item form error:', catError);
      return res.status(500).send('Error loading form with validation errors.');
    }
  }

  try {
    const newItem = await itemQueries.addItem(
      name.trim(),
      description ? description.trim() : null,
      parseFloat(price),
      parseInt(number_in_stock, 10),
      parseInt(category_id, 10)
    );
    console.log('New item added:', newItem);
    res.redirect(`/categories/${newItem.category_id}`);
  } catch (error) {
    if (error.code === '23505') {
      errors.push({ msg: 'An item with this name already exists.' });
      try {
        const categories = await categoryQueries.getAllCategories();
        return res.render("itemForm", {
            title: "Add New Item",
            item: { name, description, price, number_in_stock, category_id },
            categories: categories,
            errors: errors
        });
      } catch (catError) {
        console.error('Error fetching categories for item form error:', catError);
        return res.status(500).send('Error loading form with validation errors.');
      }
    }
    console.error('Error adding new item:', error);
    res.status(500).send('Error adding new item.');
  }
});

// ⭐ Existing GET ROUTE: Display form to edit an existing item ⭐
app.get("/items/:id/edit", async (req, res) => {
  const itemId = parseInt(req.params.id, 10);

  if (isNaN(itemId)) {
    return res.status(400).send("Invalid item ID.");
  }

  try {
    const item = await itemQueries.getItemById(itemId);
    if (!item) {
      return res.status(404).send("Item not found.");
    }
    const categories = await categoryQueries.getAllCategories(); // Need all categories for the dropdown

    res.render("itemForm", {
      title: `Edit Item: ${item.name}`,
      item: item, // Pass the fetched item object to pre-fill the form
      categories: categories, // Pass categories for the dropdown
      errors: [] // No initial errors
    });
  } catch (error) {
    console.error(`Error loading edit item form for ID ${itemId}:`, error);
    res.status(500).send('Error loading item edit form.');
  }
});

// ⭐ Existing POST ROUTE: Handle form submission for editing an item ⭐
app.post("/items/:id/edit", async (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const { name, description, price, number_in_stock, category_id } = req.body;

  if (isNaN(itemId)) {
    return res.status(400).send("Invalid item ID for update.");
  }

  const errors = [];
  if (!name || name.trim() === '') {
    errors.push({ msg: 'Item name is required.' });
  }
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    errors.push({ msg: 'Price must be a positive number.' });
  }
  if (!number_in_stock || isNaN(parseInt(number_in_stock, 10)) || parseInt(number_in_stock, 10) < 0) {
    errors.push({ msg: 'Number in stock must be a non-negative integer.' });
  }
  if (!category_id || isNaN(parseInt(category_id, 10))) {
    errors.push({ msg: 'A category must be selected.' });
  }

  if (errors.length > 0) {
    try {
      const categories = await categoryQueries.getAllCategories();
      return res.render("itemForm", {
        title: `Edit Item: ${name || 'N/A'}`, // Use submitted name for title
        item: { id: itemId, name, description, price, number_in_stock, category_id },
        categories: categories,
        errors: errors
      });
    } catch (catError) {
      console.error('Error fetching categories for item edit form error:', catError);
      return res.status(500).send('Error loading form with validation errors.');
    }
  }

  try {
    const updatedItem = await itemQueries.updateItem(
      itemId,
      name.trim(),
      description ? description.trim() : null,
      parseFloat(price),
      parseInt(number_in_stock, 10),
      parseInt(category_id, 10)
    );

    if (!updatedItem) {
      return res.status(404).send("Item not found for update (after validation).");
    }

    console.log('Item updated:', updatedItem);
    res.redirect(`/items/${itemId}`); // Redirect to the updated item's detail page
  } catch (error) {
    if (error.code === '23505') {
      errors.push({ msg: 'An item with this name already exists. Please choose a different name.' });
      try {
        const categories = await categoryQueries.getAllCategories();
        return res.render("itemForm", {
            title: `Edit Item: ${name || 'N/A'}`,
            item: { id: itemId, name, description, price, number_in_stock, category_id },
            categories: categories,
            errors: errors
        });
      } catch (catError) {
        console.error('Error fetching categories for item form error:', catError);
        return res.status(500).send('Error loading form with validation errors.');
      }
    }
    console.error(`Error updating item ${itemId}:`, error);
    res.status(500).send('Error updating item.');
  }
});

// ⭐ NEW POST ROUTE: Handle item deletion ⭐
app.post("/items/:id/delete", async (req, res) => {
  const itemId = parseInt(req.params.id, 10);

  if (isNaN(itemId)) {
    return res.status(400).send("Invalid item ID for deletion.");
  }

  try {
    const itemToDelete = await itemQueries.getItemById(itemId);
    let redirectCategoryId = null;
    if (itemToDelete) {
      redirectCategoryId = itemToDelete.category_id;
    }

    const deleted = await itemQueries.deleteItem(itemId);

    if (deleted) {
      console.log(`Item ${itemId} deleted successfully.`);
      if (redirectCategoryId) {
        res.redirect(`/categories/${redirectCategoryId}`);
      } else {
        res.redirect('/');
      }
    } else {
      return res.status(404).send("Item not found or already deleted.");
    }
  } catch (error) {
    console.error(`Error deleting item ${itemId}:`, error);
    res.status(500).send('Error deleting item.');
  }
});

app.get("/items/:id", async (req, res) => {
  const itemId = parseInt(req.params.id, 10);

  if (isNaN(itemId)) {
    return res.status(400).send("Invalid item ID.");
  }

  try {
    const item = await itemQueries.getItemById(itemId);
    if (!item) {
      return res.status(404).send("Item not found.");
    }
    res.render("itemDetail", { title: item.name, item: item });

  } catch (error) {
    console.error(`Error loading item ${itemId} details:`, error);
    res.status(500).send('Error loading item details.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});




