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
            throw new ApiError(401, "Unauthorized");
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            throw new ApiError(401, "Unauthorized");
        }
        req.user = user;

        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Unauthorized", error: error.message });
    }
};

export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized - Please authenticate first");
        }
        
        if (!req.user.isAdmin) {
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