const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined');
}

// Simple in-memory cache for user deactivation/tier status (60s TTL)
// Key: userId, Value: { data, expiry }
const statusCache = new Map();
const CACHE_TTL = 60 * 1000; 

module.exports = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Security Audit Improvement: Check real-time user status in DB
        // Optimized with in-memory caching to prevent DB bottlenecks
        const cached = statusCache.get(decoded.id);
        const now = Date.now();

        if (cached && cached.expiry > now) {
            req.user = { ...decoded, ...cached.data };
        } else {
            let user;
            const selectFields = { isActive: true, tier: true, subscriptionExpiry: true };
            
            if (decoded.role === 'JOB_SEEKER') {
                user = await prisma.jobSeeker.findUnique({ where: { id: decoded.id }, select: selectFields });
            } else if (decoded.role === 'EMPLOYER' || decoded.role === 'AGENCY') {
                user = await prisma.employer.findUnique({ where: { id: decoded.id }, select: selectFields });
            }

            if (user) {
                // Update Cache
                statusCache.set(decoded.id, { data: user, expiry: now + CACHE_TTL });
                
                if (!user.isActive) {
                    return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
                }
                // Attach latest status to request
                req.user = { ...decoded, ...user };
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
