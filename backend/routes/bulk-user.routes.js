import express from "express";
import { createUsersFromJson, createUserFromJson } from "../controllers/bulk-user.controller.js";

const bulkUserRouter = express.Router();

// Create multiple users from JSON array
bulkUserRouter.post("/bulk-create", createUsersFromJson);

// Create single user from JSON
bulkUserRouter.post("/create", createUserFromJson);

export default bulkUserRouter;


