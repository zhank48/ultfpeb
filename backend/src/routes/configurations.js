import express from 'express';
import Configuration from '../models/Configuration.js';

const router = express.Router();

// Get all configurations
router.get('/', async (req, res) => {
  try {
    console.log('Fetching configurations from database...');
    
    const configurations = await Configuration.getAll();
    
    if (!configurations) {
      throw new Error('Failed to fetch configurations from database');
    }

    console.log('Successfully fetched configurations:', Object.keys(configurations));

    // Format the response to match frontend expectations
    const response = {
      purposes: configurations.purposes || [],
      units: configurations.units || [],
      personToMeet: configurations.personToMeet || []
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in /api/configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configurations',
      error: error.message
    });
  }
});

// Get categories list
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Configuration.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories list',
      error: error.message
    });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Configuration.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get configuration for management (detailed view)
router.get('/manage/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const options = await Configuration.getByCategory(category);
    
    res.json({
      success: true,
      data: {
        category: category,
        options: options
      }
    });
  } catch (error) {
    console.error(`Error fetching management data for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${req.params.category} management data`,
      error: error.message
    });
  }
});

// Get by category
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const options = await Configuration.getByCategory(category);
    
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error(`Error fetching category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${req.params.category} configurations`,
      error: error.message
    });
  }
});

// Create new configuration option
router.post('/options', async (req, res) => {
  try {
    const { category, name, value, sort_order } = req.body;
    
    if (!category || !name) {
      return res.status(400).json({
        success: false,
        message: 'Category and name are required'
      });
    }
    
    const option = await Configuration.createOption(category, {
      name,
      value,
      sort_order
    });
    
    res.json({
      success: true,
      data: option,
      message: 'Configuration option created successfully'
    });
  } catch (error) {
    console.error('Error creating configuration option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create configuration option',
      error: error.message
    });
  }
});

// Update configuration option
router.put('/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    const option = await Configuration.updateOption(id, {
      name,
      value,
      sort_order
    });
    
    res.json({
      success: true,
      data: option,
      message: 'Configuration option updated successfully'
    });
  } catch (error) {
    console.error('Error updating configuration option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration option',
      error: error.message
    });
  }
});

// Delete configuration option
router.delete('/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await Configuration.deleteOption(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Configuration option deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Configuration option not found'
      });
    }
  } catch (error) {
    console.error('Error deleting configuration option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete configuration option',
      error: error.message
    });
  }
});

// Get single option
router.get('/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const option = await Configuration.getOptionById(id);
    
    if (option) {
      res.json({
        success: true,
        data: option
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Configuration option not found'
      });
    }
  } catch (error) {
    console.error('Error fetching configuration option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration option',
      error: error.message
    });
  }
});

export default router;
