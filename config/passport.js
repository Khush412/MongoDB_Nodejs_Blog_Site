const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

module.exports = function (passport) {
    // ===== Local Strategy =====
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return done(null, false, { message: 'Email not registered' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Password incorrect' });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

    // ===== Serialize user =====
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // ===== Deserialize user =====
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // ===== Google Strategy =====
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // Mark verified if not already
                if (!user.emailVerified) {
                    user.emailVerified = true;
                    await user.save();
                }
                return done(null, user);
            }

            user = await User.create({
                name: profile.displayName,
                email: profile.emails?.[0]?.value || '',
                googleId: profile.id,
                profilePic: profile.photos?.[0]?.value || '/images/default-user.png',
                password: null,
                emailVerified: true // ✅ Social accounts auto-verified
            });

            return done(null, user);
        } catch (err) {
            console.error(err);
            done(err, null);
        }
    }));

    // ===== Twitter Strategy =====
    passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/twitter/callback`,
        includeEmail: true
    }, async (token, tokenSecret, profile, done) => {
        try {
            let user = await User.findOne({ twitterId: profile.id });

            if (user) {
                if (!user.emailVerified) {
                    user.emailVerified = true;
                    await user.save();
                }
                return done(null, user);
            }

            user = await User.create({
                name: profile.displayName,
                email: profile.emails?.[0]?.value || '',
                twitterId: profile.id,
                profilePic: profile.photos?.[0]?.value || '/images/default-user.png',
                password: null,
                emailVerified: true
            });

            return done(null, user);
        } catch (err) {
            console.error(err);
            done(err, null);
        }
    }));

    // ===== GitHub Strategy =====
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/github/callback`,
        scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ githubId: profile.id });

            if (user) {
                if (!user.emailVerified) {
                    user.emailVerified = true;
                    await user.save();
                }
                return done(null, user);
            }

            const email = profile.emails?.[0]?.value || '';

            user = await User.create({
                name: profile.displayName || profile.username,
                email,
                githubId: profile.id,
                profilePic: profile.photos?.[0]?.value || '/images/default-user.png',
                password: null,
                emailVerified: true
            });

            return done(null, user);
        } catch (err) {
            console.error(err);
            done(err, null);
        }
    }));
};
