"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const analytics_controller_1 = require("./analytics.controller");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.get('/summary', analytics_controller_1.getSummary);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map