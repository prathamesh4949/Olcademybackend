// routes/scentRoutes.js
import express from 'express';
import {
  getAllScents,
  getScentsByCollection,
  getScentById,
  getFeaturedScents,
  getScentsByBrand,
  searchScents,
  createScent,
  updateScent,
  deleteScent,
  softDeleteScent
} from '../controllers/scentController.js';

const router = express.Router();

// Public routes
router.get('/', getAllScents);
router.get('/featured', getFeaturedScents);
router.get('/search', searchScents);
router.get('/collection/:collection', getScentsByCollection);
router.get('/brand/:brand', getScentsByBrand);
router.get('/:id', getScentById);

// Admin routes (you can add authentication middleware later)
router.post('/', createScent);
router.put('/:id', updateScent);
router.delete('/:id', deleteScent);
router.patch('/:id/deactivate', softDeleteScent);

export default router;