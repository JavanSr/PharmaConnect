"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const knowledge_controller_1 = require("./knowledge.controller");
const router = (0, express_1.Router)();
// Public routes
router.get('/articles', knowledge_controller_1.listArticles);
router.get('/articles/:slug', knowledge_controller_1.getArticle);
router.post('/subscribe', knowledge_controller_1.subscribe);
router.delete('/subscribe/:token', knowledge_controller_1.unsubscribe);
// Admin routes
router.post('/articles', authenticate_1.authenticate, (0, authorize_1.authorize)(['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE']), knowledge_controller_1.createArticle);
router.put('/articles/:id', authenticate_1.authenticate, (0, authorize_1.authorize)(['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE']), knowledge_controller_1.updateArticle);
router.delete('/articles/:id', authenticate_1.authenticate, (0, authorize_1.authorize)(['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE']), knowledge_controller_1.deleteArticle);
router.post('/admin/digest/send', authenticate_1.authenticate, (0, authorize_1.authorize)(['SUPER_ADMIN']), knowledge_controller_1.sendDigest);
exports.default = router;
//# sourceMappingURL=knowledge.routes.js.map