import aj from "../config/arcjet.js";

const arcjetMiddleware = async (req, res, next) => {
    try {
        const decision = aj.protect(req, {requested: 1});

        if (decision.isDenied) {
            if (decision.reason.rateLimit) {
                throw new ApiError(429, "Too Many Requests");
            }
            if (decision.reason.bot) {
                throw new ApiError(403, "Forbidden");
            }
            if (decision.reason.shield) {
                throw new ApiError(403, "Forbidden");
            }
        }

        next();
    } catch (error) {
        console.log('error in arcjet middleware', error);
        next(error);
    }
    aj.protect(req, res, next);
};

export default arcjetMiddleware;
