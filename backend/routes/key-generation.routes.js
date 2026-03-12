import express from "express";
import { authMiddleware as authenticate } from "../middlewares/auth.middleware.js";
import {
    createKeyGenerationRequest,
    getMyRequests,
    getAllRequests,
    approveRequest,
    rejectRequest
} from "../controllers/key-generation.controller.js";

const keyGenerationRouter = express.Router();

// User routes
keyGenerationRouter.post("/create", authenticate, createKeyGenerationRequest);
keyGenerationRouter.get("/my-requests", authenticate, getMyRequests);

// Admin routes
keyGenerationRouter.get("/admin/all", authenticate, getAllRequests);
keyGenerationRouter.post("/admin/:id/approve", authenticate, approveRequest);
keyGenerationRouter.post("/admin/:id/reject", authenticate, rejectRequest);

export default keyGenerationRouter;
