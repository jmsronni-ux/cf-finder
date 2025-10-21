import express from "express";
import {
    createRegistrationRequest,
    getAllRegistrationRequests,
    getRegistrationRequest,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    deleteRegistrationRequest,
    checkRegistrationStatus
} from "../controllers/registration-request.controller.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";

const registrationRequestRouter = express.Router();

// Public routes
registrationRequestRouter.post("/", createRegistrationRequest);
registrationRequestRouter.get("/check-status", checkRegistrationStatus);

// Admin only routes
registrationRequestRouter.get("/", protect, adminOnly, getAllRegistrationRequests);
registrationRequestRouter.get("/:id", protect, adminOnly, getRegistrationRequest);
registrationRequestRouter.post("/:id/approve", protect, adminOnly, approveRegistrationRequest);
registrationRequestRouter.post("/:id/reject", protect, adminOnly, rejectRegistrationRequest);
registrationRequestRouter.delete("/:id", protect, adminOnly, deleteRegistrationRequest);

export default registrationRequestRouter;

