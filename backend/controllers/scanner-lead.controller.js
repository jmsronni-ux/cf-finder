import ScannerLead from "../models/scanner-lead.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { sendScannerLeadNotification } from "../services/telegram.service.js";

/**
 * Create a new scanner lead (public — no auth)
 */
export const createScannerLead = async (req, res, next) => {
    try {
        const { walletAddress, network, phone, telegram, whatsapp, threatIndex, severity, balance, currency, subid } = req.body;

        // Validate required fields
        if (!walletAddress || !network || !phone) {
            return next(new ApiError(400, "Wallet address, network, and phone number are required"));
        }

        // Basic phone validation (at least 6 digits)
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 6) {
            return next(new ApiError(400, "Please enter a valid phone number"));
        }

        // Check for duplicate lead (same phone + same wallet in last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingLead = await ScannerLead.findOne({
            phone: phone.trim(),
            walletAddress: walletAddress.trim(),
            createdAt: { $gte: twentyFourHoursAgo }
        });

        if (existingLead) {
            // Silently succeed — don't reveal duplicate detection to user
            return res.status(201).json({
                success: true,
                message: "Your request has been submitted to our recovery team.",
                data: {
                    id: existingLead._id,
                }
            });
        }

        // Create the lead
        const lead = await ScannerLead.create({
            walletAddress: walletAddress.trim(),
            network: network.trim(),
            phone: phone.trim(),
            telegram: telegram?.trim() || '',
            whatsapp: whatsapp?.trim() || '',
            threatIndex: threatIndex || 0,
            severity: severity || 'clear',
            balance: balance || 0,
            currency: currency || '',
            source: 'wallet_scanner',
            subid: subid || '',
        });

        // Trigger S2S Postback to Keitaro
        if (subid) {
            const trackerDomain = process.env.KEITARO_TRACKER_DOMAIN || 'https://tracker.your-keitaro-domain.com';
            const status = 'lead';
            
            // Fire and forget the GET request
            fetch(`${trackerDomain}/postback?subid=${subid}&status=${status}`, {
                method: 'GET'
            }).catch(err => console.error('Failed to ping Keitaro:', err));
        }

        // Send Telegram notification (fire and forget)
        sendScannerLeadNotification(lead).catch(err =>
            console.error('Failed to send scanner lead Telegram notification:', err)
        );

        res.status(201).json({
            success: true,
            message: "Your request has been submitted to our recovery team.",
            data: {
                id: lead._id,
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all scanner leads (admin only)
 */
export const getAllScannerLeads = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
        const search = (req.query.search || '').trim();
        const contacted = req.query.contacted; // 'true', 'false', or undefined

        const filter = {};

        if (contacted === 'true') {
            filter.contacted = true;
        } else if (contacted === 'false') {
            filter.contacted = false;
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { phone: searchRegex },
                { telegram: searchRegex },
                { whatsapp: searchRegex },
                { walletAddress: searchRegex },
            ];
        }

        const total = await ScannerLead.countDocuments(filter);
        const leads = await ScannerLead.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: leads,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle contacted status for a scanner lead (admin only)
 */
export const toggleScannerLeadContacted = async (req, res, next) => {
    try {
        const { id } = req.params;

        const lead = await ScannerLead.findById(id);
        if (!lead) {
            return next(new ApiError(404, "Scanner lead not found"));
        }

        lead.contacted = !lead.contacted;
        lead.contactedAt = lead.contacted ? new Date() : null;
        await lead.save();

        res.status(200).json({
            success: true,
            message: `Lead marked as ${lead.contacted ? 'contacted' : 'not contacted'}`,
            data: lead,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a scanner lead (admin only)
 */
export const deleteScannerLead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const lead = await ScannerLead.findByIdAndDelete(id);
        if (!lead) {
            return next(new ApiError(404, "Scanner lead not found"));
        }

        res.status(200).json({
            success: true,
            message: "Scanner lead deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};
