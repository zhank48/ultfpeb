import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import ComplaintManagement from '../models/ComplaintManagement.js';

const router = express.Router();

// ========== COMPLAINT FIELDS MANAGEMENT ==========

// Get all complaint fields (public access for complaint form)
router.get('/fields', async (req, res) => {
  try {
    const fields = await ComplaintManagement.getDynamicFields();
    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Error fetching complaint fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fields'
    });
  }
});

// Get all complaint fields (admin access for management)
router.get('/admin/fields', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const fields = await ComplaintManagement.getDynamicFields();
    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Error fetching complaint fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fields'
    });
  }
});

// Create new complaint field
router.post('/fields', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const fieldData = req.body;

    if (!fieldData.field_name || !fieldData.field_label || !fieldData.field_type) {
      return res.status(400).json({
        success: false,
        message: 'Field name, label, and type are required'
      });
    }

    const result = await ComplaintManagement.saveDynamicField(fieldData);
    res.status(201).json({
      success: true,
      message: 'Field created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating complaint field:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create field'
    });
  }
});

// Update complaint field
router.put('/fields/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const fieldData = { ...req.body, id };

    const result = await ComplaintManagement.saveDynamicField(fieldData);
    
    res.json({
      success: true,
      message: 'Field updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating complaint field:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update field'
    });
  }
});

// Delete complaint field
router.delete('/fields/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await ComplaintManagement.deleteDynamicField(id);
    
    res.json({
      success: true,
      message: 'Field deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting complaint field:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete field'
    });
  }
});

// ========== COMPLAINT CATEGORIES MANAGEMENT ==========

// Get all complaint categories (public access for complaint form)
router.get('/categories', async (req, res) => {
  try {
    const categories = await ComplaintManagement.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching complaint categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get all complaint categories (admin access for management)
router.get('/admin/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categories = await ComplaintManagement.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching complaint categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Create new complaint category
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryData = req.body;

    if (!categoryData.name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const result = await ComplaintManagement.saveCategory(categoryData);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating complaint category:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create category'
    });
  }
});

// Update complaint category
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const categoryData = { ...req.body, id };

    const result = await ComplaintManagement.saveCategory(categoryData);
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating complaint category:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update category'
    });
  }
});

// Delete complaint category
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await ComplaintManagement.deleteCategory(id);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting complaint category:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete category'
    });
  }
});

// ========== COMPLAINT STATISTICS ==========

// Get complaint statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await ComplaintManagement.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching complaint statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// ========== DATA EXPORT/IMPORT ==========

// Export complaints
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'json', start_date, end_date, status, category_id } = req.query;
    
    const filters = { start_date, end_date, status, category_id };
    
    const result = await ComplaintManagement.exportData(filters, format);
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="complaints_export.${format}"`);
    res.send(result);
  } catch (error) {
    console.error('Error exporting complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export complaints'
    });
  }
});

// Import complaints configuration
router.post('/import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, type = 'categories' } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Data must be an array'
      });
    }
    
    const result = await ComplaintManagement.importData(type, data);
    
    res.json({
      success: true,
      message: `Successfully imported ${result.imported} ${type}`,
      data: result
    });
  } catch (error) {
    console.error('Error importing complaint data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to import data'
    });
  }
});

export default router;
