const User = require('../models/User');

module.exports = async function (req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.user._id);
    if (user && user.emailVerified) {
      return next();
    } else {
      req.flash('info', 'Please verify your email to access this page.');
      return res.redirect('/verify-email');
    }
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
};
