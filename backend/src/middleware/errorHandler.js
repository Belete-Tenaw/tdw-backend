/**
 * Centralized API Error Handling Middleware
 * Handles operational errors, Prisma database exceptions, and unexpected failures.
 */

class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    const isProd = process.env.NODE_ENV === 'production';

    // Handle Prisma Specific Errors
    if (err.code && err.code.startsWith('P')) {
        let msg = 'Database constraint violation';
        let code = 400;
        if (err.code === 'P2002') {
            msg = `Duplicate value entry for unique field: ${err.meta?.target || 'field'}`;
            code = 409;
        } else if (err.code === 'P2025') {
            msg = 'Requested record was not found';
            code = 404;
        }
        return res.status(code).json({
            status: 'fail',
            message: msg,
            errorCode: err.code
        });
    }

    // Handle JWT Verification Errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'fail',
            message: 'Invalid authentication token. Please log in again.'
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'fail',
            message: 'Your session has expired. Please log in again.'
        });
    }

    if (!isProd) {
        console.error('🔥 [API Error]', {
            path: req.originalUrl,
            method: req.method,
            error: err.message,
            stack: err.stack
        });
    }

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message || 'An unexpected internal server error occurred',
        ...(err.details && { details: err.details }),
        ...(!isProd && { stack: err.stack })
    });
};

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
module.exports.AppError = AppError;

