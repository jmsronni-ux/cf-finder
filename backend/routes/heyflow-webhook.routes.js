import express from "express";
import { handleHeyflowWebhook } from "../controllers/heyflow-webhook.controller.js";

const heyflowWebhookRouter = express.Router();

// Heyflow form submission webhook (no auth — called by Heyflow servers)
heyflowWebhookRouter.post("/", handleHeyflowWebhook);

export default heyflowWebhookRouter;
