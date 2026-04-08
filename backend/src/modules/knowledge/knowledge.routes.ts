import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  listArticles, getArticle, createArticle, updateArticle, deleteArticle,
  subscribe, unsubscribe, sendDigest,
} from './knowledge.controller';

const router = Router();

// Public routes
router.get('/articles', listArticles);
router.get('/articles/:slug', getArticle);
router.post('/subscribe', subscribe);
router.delete('/subscribe/:token', unsubscribe);

// Admin routes
router.post('/articles', authenticate, authorize(['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE']), createArticle);
router.put('/articles/:id', authenticate, authorize(['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE']), updateArticle);
router.delete('/articles/:id', authenticate, authorize(['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE']), deleteArticle);
router.post('/admin/digest/send', authenticate, authorize(['SUPER_ADMIN']), sendDigest);

export default router;
