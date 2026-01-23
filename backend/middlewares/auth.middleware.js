import { ApiError } from "./error.middleware.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import User from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token) {
            console.log('No token provided for:', req.path);
            throw new ApiError(401, "Unauthorized - No token provided");
        }

        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not defined');
            throw new ApiError(500, "Server configuration error");
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            console.log('User not found for token:', decoded.userId);
            throw new ApiError(401, "Unauthorized - User not found");
        }
        req.user = user;

        next();
    } catch (error) {
        console.log('Auth error for:', req.path, error.message);
        res.status(401).json({ success: false, message: "Unauthorized", error: error.message });
    }
};

export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized - Please authenticate first");
        }

        if (!req.user.isAdmin && !req.user.isSubAdmin) {
            throw new ApiError(403, "Forbidden - Admin access required");
        }

        next();
    } catch (error) {
        const statusCode = error.statusCode || 403;
        res.status(statusCode).json({
            success: false,
            message: error.message || "Forbidden - Admin access required"
        });
    }
};

export default authMiddleware;      