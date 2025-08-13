module.exports = {
    ensureAuth: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error', 'Please log in first to view your blogs');
        res.redirect('/login');
    }
};
