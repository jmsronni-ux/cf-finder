import express from "express";
import { signUp, signIn, signOut, impersonateUser } from "../controllers/auth.controller.js";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware.js";

const authRouter = express.Router();

authRouter.post("/sign-up", signUp);

authRouter.post("/sign-in", signIn);

authRouter.post("/sign-out", signOut);

authRouter.post("/impersonate/:userId", authMiddleware, adminMiddleware, impersonateUser);


export default authRouter;