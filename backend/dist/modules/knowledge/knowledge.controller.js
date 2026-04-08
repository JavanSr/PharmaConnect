"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDigest = exports.unsubscribe = exports.subscribe = exports.deleteArticle = exports.updateArticle = exports.createArticle = exports.getArticle = exports.listArticles = void 0;
const knowledge_service_1 = require("./knowledge.service");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const service = new knowledge_service_1.KnowledgeService();
const articleSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    slug: zod_1.z.string().optional(),
    body: zod_1.z.any(),
    category: zod_1.z.string().min(1),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.nativeEnum(client_1.ArticleStatus).optional(),
    isSponsored: zod_1.z.boolean().optional(),
    sponsorName: zod_1.z.string().optional(),
    featuredImage: zod_1.z.string().optional(),
    scheduledFor: zod_1.z.string().optional().transform(s => s ? new Date(s) : undefined),
});
const listArticles = async (req, res) => {
    try {
        const { category, status, tag, search, page = '1', limit = '12' } = req.query;
        const user = req.user;
        const adminView = user && ['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE'].includes(user.role);
        const result = await service.listArticles({ category: category, status: status, tag: tag, search: search, adminView }, { page: parseInt(page), limit: parseInt(limit) });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.listArticles = listArticles;
const getArticle = async (req, res) => {
    try {
        const article = await service.getArticle(req.params.slug);
        res.json({ success: true, data: article });
    }
    catch (err) {
        res.status(err.message === 'Article not found' ? 404 : 500).json({ success: false, error: err.message });
    }
};
exports.getArticle = getArticle;
const createArticle = async (req, res) => {
    try {
        const authorId = req.user.id;
        const data = articleSchema.parse(req.body);
        const article = await service.createArticle(authorId, data);
        res.status(201).json({ success: true, data: article });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            res.status(400).json({ success: false, error: err.errors });
            return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.createArticle = createArticle;
const updateArticle = async (req, res) => {
    try {
        const article = await service.updateArticle(req.params.id, req.body);
        res.json({ success: true, data: article });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.updateArticle = updateArticle;
const deleteArticle = async (req, res) => {
    try {
        await service.deleteArticle(req.params.id);
        res.json({ success: true, message: 'Article archived' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.deleteArticle = deleteArticle;
const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, error: 'Email required' });
            return;
        }
        await service.subscribe(email);
        res.status(201).json({ success: true, message: 'Subscribed successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.subscribe = subscribe;
const unsubscribe = async (req, res) => {
    try {
        await service.unsubscribe(req.params.token);
        res.json({ success: true, message: 'Unsubscribed successfully' });
    }
    catch (err) {
        res.status(err.message.includes('Invalid') ? 404 : 500).json({ success: false, error: err.message });
    }
};
exports.unsubscribe = unsubscribe;
const sendDigest = async (req, res) => {
    try {
        const result = await service.sendWeeklyDigest();
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.sendDigest = sendDigest;
//# sourceMappingURL=knowledge.controller.js.map