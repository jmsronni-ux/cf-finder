import express from "express";
import {
    createTierRequest,
    getUserTierRequests,
    getAllTierRequests,
    approveTierRequest,
    rejectTierRequest,
    setUserTier
} from "../controllers/tier-request.controller.js";
import { authMiddleware as authenticate } from "../middlewares/auth.middleware.js";

const tierRequestRouter = express.Router();

// User routes
tierRequestRouter.post("/create", authenticate, createTierRequest);
tierRequestRouter.get("/my-requests", authenticate, getUserTierRequests);

// Admin routes
tierRequestRouter.get("/admin/all", authenticate, getAllTierRequests);
tierRequestRouter.post("/admin/approve/:requestId", authenticate, approveTierRequest);
tierRequestRouter.post("/admin/reject/:requestId", authenticate, rejectTierRequest);
tierRequestRouter.post("/admin/set-tier", authenticate, setUserTier);

export default tierRequestRouter;

