import express from "express";
import {
    createTierRequest,
    getUserTierRequests,
    getAllTierRequests,
    approveTierRequest,
    rejectTierRequest,
    setUserTier
} from "../controllers/tier-request.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";

const tierRequestRouter = express.Router();

// User routes
tierRequestRouter.post("/create", authMiddleware, createTierRequest);
tierRequestRouter.get("/my-requests", authMiddleware, getUserTierRequests);

// Admin routes
tierRequestRouter.get("/admin/all", authMiddleware, adminMiddleware, getAllTierRequests);
tierRequestRouter.post("/admin/approve/:requestId", authMiddleware, adminMiddleware, approveTierRequest);
tierRequestRouter.post("/admin/reject/:requestId", authMiddleware, adminMiddleware, rejectTierRequest);
tierRequestRouter.post("/admin/set-tier", authMiddleware, adminMiddleware, setUserTier);

export default tierRequestRouter;

