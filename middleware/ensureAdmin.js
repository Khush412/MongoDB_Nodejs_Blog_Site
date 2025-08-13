const User = require('../models/User');

module.exports = function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash('error', 'You are not authorized to view this page');
    res.redirect('/');
};
