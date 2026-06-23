import express from "express";
import {
    createScannerLead,
    getAllScannerLeads,
    toggleScannerLeadContacted,
    deleteScannerLead,
} from "../controllers/scanner-lead.controller.js";
import authMiddleware, { adminMiddleware } from "../middlewares/auth.middleware.js";

const scannerLeadRouter = express.Router();

// Public route — create lead from wallet scanner
scannerLeadRouter.post("/", createScannerLead);

// Admin only routes
scannerLeadRouter.get("/", authMiddleware, adminMiddleware, getAllScannerLeads);
scannerLeadRouter.patch("/:id/toggle-contacted", authMiddleware, adminMiddleware, toggleScannerLeadContacted);
scannerLeadRouter.delete("/:id", authMiddleware, adminMiddleware, deleteScannerLead);

export default scannerLeadRouter;
