import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Regular authentication middleware
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please log in.',
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please verify your email.',
      });
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// Admin authentication middleware
export const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Admin access required.',
      });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please verify your email.',
      });
    }

    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// Middleware to check if user is admin or the owner of the resource
export const adminOrOwnerMiddleware = (resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided. Please log in.',
        });
      }

      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
        });
      }

      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: 'Account not verified. Please verify your email.',
        });
      }

      const resourceId = req.params[resourceIdParam];
      
      // Allow if user is admin or if they're accessing their own resource
      if (user.isAdmin || user._id.toString() === resourceId) {
        req.user = user;
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
        });
      }
    } catch (error) {
      console.error('Admin or owner middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }
  };
};