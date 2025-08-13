const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const sendEmail = require('../mailer');
const router = express.Router();

// Middleware to check verified for local logins
function checkVerified(req, res, next) {
    if (req.user && req.user.emailVerified) {
        return next();
    }
    req.session.userId = req.user._id;
    req.logout(function (err) {
        if (err) return next(err);
        req.flash('info', 'Please verify your email to continue.');
        res.redirect('/verify-email');
    });
}

// === SIGNUP ===
router.get('/signup', (req, res) => {
    res.render('signup', { title: 'Signup' });
});

router.post('/signup', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/signup');
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            req.flash('error', 'Email already registered');
            return res.redirect('/signup');
        }

        // Create new user with verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user = new User({
            name,
            email,
            password,
            emailVerified: false,
            verificationCode: code,
            verificationCodeExpires: Date.now() + 10 * 60 * 1000 // 10 mins
        });
        await user.save();

        // Send verification email
        await sendEmail(
            user.email,
            'Verify your email',
            `Your verification code is: ${code}`,
            `<p>Your verification code is: <strong>${code}</strong></p>`
        );

        req.session.userId = user._id;
        req.flash('success', 'Registered! Please verify your email.');
        res.redirect('/verify-email');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/signup');
    }
});

// === LOGIN (local) ===
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error', info.message || 'Invalid credentials');
            return res.redirect('/login');
        }
        if (!user.emailVerified) {
            req.session.userId = user._id;
            req.flash('info', 'Please verify your email to continue.');
            return res.redirect('/verify-email');
        }
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/');
        });
    })(req, res, next);
});

// === LOGOUT ===
router.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) console.error(err);
        req.flash('success', 'Logged out successfully');
        res.redirect('/login');
    });
});

// === SOCIAL LOGINS ===
// Google
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => {
        // emailVerified already true in passport config
        res.redirect('/');
    }
);

// Twitter
router.get('/auth/twitter', passport.authenticate('twitter'));
router.get('/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => {
        res.redirect('/');
    }
);

// GitHub
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => {
        res.redirect('/');
    }
);

// === VERIFY EMAIL PAGE ===
router.get('/verify-email', (req, res) => {
    if (!req.session.userId) {
        req.flash('error', 'Session expired. Please login again.');
        return res.redirect('/login');
    }
    res.render('verifyEmail', { title: 'Verify Email' });
});

// === HANDLE VERIFICATION CODE ===
router.post('/verify-email', async (req, res) => {
    const { code } = req.body;
    if (!req.session.userId) {
        req.flash('error', 'Session expired. Please login again.');
        return res.redirect('/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.flash('error', 'User not found. Please login again.');
            return res.redirect('/login');
        }
        if (user.verificationCode === code && user.verificationCodeExpires > Date.now()) {
            user.emailVerified = true;
            user.verificationCode = undefined;
            user.verificationCodeExpires = undefined;
            await user.save();

            req.session.userId = null;
            req.login(user, (err) => {
                if (err) {
                    console.error(err);
                    req.flash('error', 'Login error after verification.');
                    return res.redirect('/login');
                }
                req.flash('success', 'Email verified! You are now logged in.');
                return res.redirect('/');
            });
        } else {
            req.flash('error', 'Invalid or expired verification code.');
            res.redirect('/verify-email');
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong.');
        res.redirect('/verify-email');
    }
});

// === RESEND CODE ===
router.post('/resend-code', async (req, res) => {
    if (!req.session.userId) {
        req.flash('error', 'Session expired. Please login again.');
        return res.redirect('/login');
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.flash('error', 'User not found. Please login again.');
            return res.redirect('/login');
        }

        const COOLDOWN_MS = 2 * 60 * 1000;
        const expireMinus10Min = user.verificationCodeExpires
            ? user.verificationCodeExpires.getTime() - 10 * 60 * 1000
            : 0;

        if (expireMinus10Min + COOLDOWN_MS > Date.now()) {
            req.flash('error', 'Please wait before requesting a new code.');
            return res.redirect('/verify-email');
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = newCode;
        user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        await sendEmail(
            user.email,
            'Your new verification code',
            `Your new verification code is: ${newCode}`,
            `<p>Your new verification code is: <b>${newCode}</b></p>`
        );

        req.flash('success', 'New verification code sent to your email.');
        res.redirect('/verify-email');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to resend code. Please try again.');
        res.redirect('/verify-email');
    }
});

module.exports = router;
