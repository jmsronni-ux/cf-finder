import express from "express";
import { createUsersFromJson, createUserFromJson } from "../controllers/bulk-user.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";

const bulkUserRouter = express.Router();

// Create multiple users from JSON array (Admin only)
bulkUserRouter.post("/bulk-create", authMiddleware, adminMiddleware, createUsersFromJson);

// Create single user from JSON (Admin only)
bulkUserRouter.post("/create", authMiddleware, adminMiddleware, createUserFromJson);

export default bulkUserRouter;


