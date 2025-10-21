import mongoose from "mongoose";
import RegistrationRequest from "../models/registration-request.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { ApiError } from "../middlewares/error.middleware.js";

// Create a new registration request
export const createRegistrationRequest = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validate required fields
        if (!name || !email || !password || !phone) {
            return next(new ApiError(400, "All fields are required"));
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new ApiError(400, "User with this email already exists"));
        }

        // Check if registration request already exists
        const existingRequest = await RegistrationRequest.findOne({ email });
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return next(new ApiError(400, "Registration request already submitted and pending approval"));
            } else if (existingRequest.status === 'approved') {
                return next(new ApiError(400, "Registration request was already approved. Please login."));
            } else if (existingRequest.status === 'rejected') {
                // Allow resubmission if previously rejected
                await RegistrationRequest.findByIdAndDelete(existingRequest._id);
            }
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create registration request
        const registrationRequest = await RegistrationRequest.create({
            name,
            email,
            password: hashedPassword,
            phone,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: "Registration request submitted successfully. Please wait for admin approval.",
            data: {
                id: registrationRequest._id,
                email: registrationRequest.email,
                status: registrationRequest.status
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get all registration requests (Admin only)
export const getAllRegistrationRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        
        const filter = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const requests = await RegistrationRequest.find(filter)
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 });

        // Remove password from response
        const sanitizedRequests = requests.map(req => {
            const reqObj = req.toObject();
            delete reqObj.password;
            return reqObj;
        });

        res.status(200).json({
            success: true,
            data: sanitizedRequests,
            count: sanitizedRequests.length
        });
    } catch (error) {
        next(error);
    }
};

// Get a single registration request (Admin only)
export const getRegistrationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;

        const request = await RegistrationRequest.findById(id)
            .populate('reviewedBy', 'name email');

        if (!request) {
            return next(new ApiError(404, "Registration request not found"));
        }

        const sanitizedRequest = request.toObject();
        delete sanitizedRequest.password;

        res.status(200).json({
            success: true,
            data: sanitizedRequest
        });
    } catch (error) {
        next(error);
    }
};

// Approve a registration request (Admin only)
export const approveRegistrationRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const adminId = req.userId; // From auth middleware

        const request = await RegistrationRequest.findById(id).session(session);

        if (!request) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(404, "Registration request not found"));
        }

        if (request.status !== 'pending') {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(400, `Registration request has already been ${request.status}`));
        }

        // Check if user already exists (double check)
        const existingUser = await User.findOne({ email: request.email }).session(session);
        if (existingUser) {
            await session.abortTransaction();
            session.endSession();
            return next(new ApiError(400, "User with this email already exists"));
        }

        // Create the user
        const newUser = await User.create([{
            name: request.name,
            email: request.email,
            password: request.password, // Already hashed
            phone: request.phone
        }], { session });

        // Update registration request status
        request.status = 'approved';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        await request.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Registration request approved and user created successfully",
            data: {
                userId: newUser[0]._id,
                email: newUser[0].email
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// Reject a registration request (Admin only)
export const rejectRegistrationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.userId; // From auth middleware

        const request = await RegistrationRequest.findById(id);

        if (!request) {
            return next(new ApiError(404, "Registration request not found"));
        }

        if (request.status !== 'pending') {
            return next(new ApiError(400, `Registration request has already been ${request.status}`));
        }

        request.status = 'rejected';
        request.rejectionReason = reason || 'No reason provided';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        await request.save();

        res.status(200).json({
            success: true,
            message: "Registration request rejected successfully",
            data: {
                requestId: request._id,
                status: request.status,
                rejectionReason: request.rejectionReason
            }
        });
    } catch (error) {
        next(error);
    }
};

// Delete a registration request (Admin only)
export const deleteRegistrationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;

        const request = await RegistrationRequest.findByIdAndDelete(id);

        if (!request) {
            return next(new ApiError(404, "Registration request not found"));
        }

        res.status(200).json({
            success: true,
            message: "Registration request deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

// Check registration status by email (Public)
export const checkRegistrationStatus = async (req, res, next) => {
    try {
        const { email } = req.query;

        if (!email) {
            return next(new ApiError(400, "Email is required"));
        }

        const request = await RegistrationRequest.findOne({ email });

        if (!request) {
            return res.status(200).json({
                success: true,
                data: {
                    exists: false,
                    status: null
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                exists: true,
                status: request.status,
                createdAt: request.createdAt,
                reviewedAt: request.reviewedAt,
                rejectionReason: request.status === 'rejected' ? request.rejectionReason : undefined
            }
        });
    } catch (error) {
        next(error);
    }
};

