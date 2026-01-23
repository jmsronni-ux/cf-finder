import express from "express";
import {
    createRegistrationRequest,
    getAllRegistrationRequests,
    getRegistrationRequest,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    deleteRegistrationRequest,
    checkRegistrationStatus,
    updateRegistrationRequestAssignment
} from "../controllers/registration-request.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";

const registrationRequestRouter = express.Router();

// Public routes
registrationRequestRouter.post("/", createRegistrationRequest);
registrationRequestRouter.get("/check-status", checkRegistrationStatus);

// Admin only routes
registrationRequestRouter.get("/", authMiddleware, adminMiddleware, getAllRegistrationRequests);
registrationRequestRouter.get("/:id", authMiddleware, adminMiddleware, getRegistrationRequest);
registrationRequestRouter.post("/:id/approve", authMiddleware, adminMiddleware, approveRegistrationRequest);
registrationRequestRouter.post("/:id/reject", authMiddleware, adminMiddleware, rejectRegistrationRequest);
registrationRequestRouter.put("/:id", authMiddleware, adminMiddleware, updateRegistrationRequestAssignment);
registrationRequestRouter.delete("/:id", authMiddleware, adminMiddleware, deleteRegistrationRequest);

export default registrationRequestRouter;

