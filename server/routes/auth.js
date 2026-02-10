const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return done(null, false, { message: 'User not found' });
        }

        const isMatch = await user.correctPassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, acceptTerms, referralCode } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (!acceptTerms) {
            return res.status(400).json({
                success: false,
                message: 'Please accept terms and conditions'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        const user = new User({
            name,
            email,
            password,
            coins: 100
        });

        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                user.referredBy = referrer._id;
                referrer.coins += 50;
                referrer.referralCount += 1;
                await referrer.save();
            }
        }

        await user.save();

        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Auto login failed'
                });
            }

            res.json({
                success: true,
                message: 'Account created successfully',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    coins: user.coins,
                    role: user.role
                }
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({
                success: false,
                message: info.message
            });
        }

        req.login(user, (err) => {
            if (err) {
                return next(err);
            }

            User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    coins: user.coins,
                    role: user.role
                }
            });
        });
    })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout error'
            });
        }
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// Check auth
router.get('/check', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                coins: req.user.coins,
                role: req.user.role
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
