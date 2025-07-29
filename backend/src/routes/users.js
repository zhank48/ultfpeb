import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { User } from '../models/User.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply authentication middleware to all routes below this point
router.use(authenticateToken);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// Update current user profile
router.put('/profile', [
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('study_program').optional().trim(),
  body('cohort').optional().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { name, email, study_program, cohort, phone } = req.body;
    const userId = req.user.id;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (study_program !== undefined) updateData.study_program = study_program;
    if (cohort !== undefined) updateData.cohort = cohort;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await User.update(userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// Change current user password
router.put('/profile/password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }    // Verify current password
    const isValidPassword = await User.verifyPasswordById(userId, currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await User.updatePassword(userId, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
});

// Upload profile photo
router.put('/profile/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    const userId = req.user.id;
    const photoPath = `uploads/profiles/${req.file.filename}`;

    // Get current user to delete old photo
    const currentUser = await User.findById(userId);
    if (currentUser && currentUser.photo_url) {
      try {
        const oldPhotoPath = path.join(process.cwd(), currentUser.photo_url);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      } catch (deleteError) {
        console.error('Error deleting old photo:', deleteError);
        // Continue with upload even if old photo deletion fails
      }
    }

    // Update user photo_url in database
    const updatedUser = await User.update(userId, { photo_url: photoPath });

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        photo_url: photoPath,
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading photo'
    });
  }
});

// Get all users with filters (Admin only)
router.get('/', authorizeRole(['Admin']), async (req, res) => {
  try {
    const { role, search } = req.query;
    
    const filters = {};
    if (role && ['Admin', 'Receptionist'].includes(role)) {
      filters.role = role;
    }
    if (search) {
      filters.search = search;
    }

    const users = await User.findAll(filters);
    
    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// Get user by ID (Admin only)
router.get('/:id', authorizeRole(['Admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// Create new user (Admin only)
router.post('/', [
  body('name').isLength({ min: 2 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['Admin', 'Receptionist'])
], authorizeRole(['Admin']), async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { name, email, password, role, study_program, cohort } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      study_program,
      cohort
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating user',
      error: error.message
    });
  }
});

// Update user (Admin or self)
router.put('/:id', [
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['Admin', 'Receptionist'])
], async (req, res) => {
  // Allow users to update their own profile or admins to update any profile
  if (req.user.role !== 'Admin' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own profile'
    });
  }
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await User.findByEmail(updateData.email);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updatedUser = await User.update(id, updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// Update user password (Admin only)
router.put('/:id/password', [
  body('password').isLength({ min: 6 })
], authorizeRole(['Admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.updatePassword(id, password);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating password'
    });
  }
});

// Upload user photo (Admin only or own profile)
router.put('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    const { id } = req.params;

    // Check if user is updating their own photo or is admin
    if (req.user.id !== parseInt(id) && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own photo unless you are an admin'
      });
    }

    const photoPath = `uploads/profiles/${req.file.filename}`;

    // Get current user to delete old photo
    const currentUser = await User.findById(id);
    if (currentUser && currentUser.photo_url) {
      try {
        const oldPhotoPath = path.join(process.cwd(), currentUser.photo_url);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      } catch (deleteError) {
        console.error('Error deleting old photo:', deleteError);
        // Continue with upload even if old photo deletion fails
      }
    }

    // Update user photo_url in database
    const updatedUser = await User.update(id, { photo_url: photoPath });

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        photo_url: photoPath,
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading photo'
    });
  }
});

// Change user role (Admin only)
router.patch('/:id/role', [
  body('role').isIn(['Admin', 'Receptionist'])
], authorizeRole(['Admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await User.changeRole(id, role);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing role'
    });
  }
});

// Deactivate user (Admin only) - safer alternative to delete
router.patch('/:id/deactivate', authorizeRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For now, we'll append "[DEACTIVATED]" to email to effectively deactivate
    // This prevents login while keeping records intact
    const deactivatedEmail = user.email.includes('[DEACTIVATED]') 
      ? user.email 
      : `[DEACTIVATED]${user.email}`;
    
    const updatedUser = await User.update(id, { 
      email: deactivatedEmail,
      // Add a note to name to indicate deactivation
      name: user.name.includes('[DEACTIVATED]') ? user.name : `${user.name} [DEACTIVATED]`
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating user'
    });
  }
});

// Reactivate user (Admin only)
router.patch('/:id/reactivate', authorizeRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove [DEACTIVATED] from email and name
    const reactivatedEmail = user.email.replace('[DEACTIVATED]', '');
    const reactivatedName = user.name.replace(' [DEACTIVATED]', '');
    
    const updatedUser = await User.update(id, { 
      email: reactivatedEmail,
      name: reactivatedName
    });

    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reactivating user'
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', authorizeRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.delete(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    // Handle specific error cases
    if (error.message === 'Cannot delete user who has created visitor records') {
      const visitorCount = error.visitorCount || 'some';
      return res.status(400).json({
        success: false,
        message: `Cannot delete user. This user has created ${visitorCount} visitor record${visitorCount !== 1 ? 's' : ''}. Please transfer the records to another user first.`,
        code: 'HAS_VISITOR_RECORDS',
        visitorCount: error.visitorCount
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', authorizeRole(['Admin']), async (req, res) => {
  try {
    const stats = await User.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

// Transfer visitor records from one user to another (Admin only)
router.post('/:fromUserId/transfer-visitors/:toUserId', authorizeRole(['Admin']), async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.params;

    // Verify both users exist
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser) {
      return res.status(404).json({
        success: false,
        message: 'Source user not found'
      });
    }

    if (!toUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }    // Check visitor count for source user
    const visitorCount = await User.getVisitorCount(fromUserId);

    if (visitorCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Source user has no visitor records to transfer'
      });
    }

    // Transfer all visitor records
    const transferredCount = await User.transferVisitors(fromUserId, toUserId);    res.json({
      success: true,
      message: `Successfully transferred ${visitorCount} visitor record${visitorCount !== 1 ? 's' : ''} from ${fromUser.name} to ${toUser.name}`,
      transferCount: visitorCount,
      fromUser: { id: fromUser.id, name: fromUser.name },
      toUser: { id: toUser.id, name: toUser.name }
    });

  } catch (error) {
    console.error('Transfer visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while transferring visitor records'
    });
  }
});

// Get visitor count for a specific user (Admin only)
router.get('/:id/visitor-count', authorizeRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }    const visitorCount = await User.getVisitorCount(id);

    const [recentVisitors] = await db.execute(
      'SELECT id, full_name, check_in_time FROM visitors WHERE input_by_user_id = ? ORDER BY check_in_time DESC LIMIT 5',
      [id]
    );

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        visitorCount: visitorCount,
        recentVisitors: recentVisitors,
        canDelete: visitorCount === 0
      }
    });

  } catch (error) {
    console.error('Get visitor count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting visitor count'
    });
  }
});

export default router;
