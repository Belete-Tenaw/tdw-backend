/**
 * Middleware to check if the user has one of the required roles.
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['ADMIN', 'EMPLOYER'])
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Permission denied',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

module.exports = {
    authorize,
    Roles: {
        ADMIN: 'ADMIN',
        SEEKER: 'JOB_SEEKER',
        EMPLOYER: 'EMPLOYER',
        AGENCY: 'AGENCY'
    }
};
