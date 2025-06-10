// Role-based access control middleware
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userRole = req.user.role;

            // Convert single role to array for consistency
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (!roles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.'
                });
            }

            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization failed',
                error: error.message
            });
        }
    };
};

// Specific role middlewares for common use cases
const adminOnly = roleMiddleware(['admin']);
const organizerOnly = roleMiddleware(['admin', 'organizer']);
const exhibitorOnly = roleMiddleware(['admin', 'organizer', 'exhibitor']);
const attendeeOnly = roleMiddleware(['admin', 'organizer', 'exhibitor', 'attendee']);

// Check if user is admin or organizer
const isAdminOrOrganizer = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'organizer') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or organizer role required.'
    });
};

// Check if user is exhibitor or higher
const isExhibitorOrHigher = (req, res, next) => {
    const allowedRoles = ['admin', 'organizer', 'exhibitor'];
    if (allowedRoles.includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Exhibitor role or higher required.'
    });
};

module.exports = {
    roleMiddleware,
    adminOnly,
    organizerOnly,
    exhibitorOnly,
    attendeeOnly,
    isAdminOrOrganizer,
    isExhibitorOrHigher
}; 