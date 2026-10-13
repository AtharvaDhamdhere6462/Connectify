import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "connectify_secure_jwt_secret_key_2024_auth_engine";

// Helper to generate JWT token (persistent session until manual logout)
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            username: user.username,
            name: user.name
        },
        JWT_SECRET
    );
};

// Helper to extract token from header, query, or body
const extractToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        return req.headers.authorization.split(" ")[1];
    }
    return req.query?.token || req.body?.token;
};

// Helper to find user from token (supports both JWT and legacy DB token)
const findUserByToken = async (token) => {
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        if (decoded && decoded.username) {
            const user = await User.findOne({ username: decoded.username });
            if (user) return user;
        }
    } catch {
        // Fallback for legacy hex tokens or malformed JWT check against DB
    }

    return await User.findOne({ token: token });
};

const logout = async (req, res) => {
    const token = extractToken(req);
    if (token) {
        try {
            await User.findOneAndUpdate({ token: token }, { $unset: { token: 1 } });
        } catch (e) {
            // Non-blocking logout error
        }
    }
    return res.status(httpStatus.OK).json({ message: "Logged out successfully" });
};

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username and password are required."
        });
    }

    const cleanUsername = username.trim().toLowerCase();

    try {
        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "No user found with this username."
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid username or password."
            });
        }

        const token = generateToken(user);
        user.token = token;
        await user.save();

        return res.status(httpStatus.OK).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username
            },
            message: "Login successful!"
        });
    } catch (e) {
        console.error("Login error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "An unexpected error occurred during login. Please try again."
        });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !name.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Full name is required."
        });
    }

    if (!username || !username.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username is required."
        });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username must be at least 3 characters long."
        });
    }

    if (!password || password.length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Password must be at least 6 characters long."
        });
    }

    try {
        const existingUser = await User.findOne({ username: cleanUsername });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                message: "Username is already taken. Please choose another."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            username: cleanUsername,
            password: hashedPassword
        });

        const token = generateToken(newUser);
        newUser.token = token;
        await newUser.save();

        return res.status(httpStatus.CREATED).json({
            message: "Account created successfully!",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                username: newUser.username
            }
        });
    } catch (e) {
        console.error("Register error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "An unexpected error occurred during registration. Please try again."
        });
    }
};

const getProfile = async (req, res) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: "Authentication token required."
        });
    }

    try {
        const user = await findUserByToken(token);
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Session expired or invalid token."
            });
        }

        return res.status(httpStatus.OK).json({
            user: {
                id: user._id,
                name: user.name,
                username: user.username
            }
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching user profile."
        });
    }
};

const getUserHistory = async (req, res) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: "Authentication token required."
        });
    }

    try {
        const user = await findUserByToken(token);
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid session. Please login again."
            });
        }

        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        console.error("Get history error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Failed to retrieve meeting history."
        });
    }
};

const addToHistory = async (req, res) => {
    const token = extractToken(req);
    const { meeting_code } = req.body;

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: "Authentication token required."
        });
    }

    if (!meeting_code) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Meeting code is required."
        });
    }

    try {
        const user = await findUserByToken(token);
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid session."
            });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
            date: new Date()
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            message: "Meeting added to history successfully."
        });
    } catch (e) {
        console.error("Add to history error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Failed to log meeting activity."
        });
    }
};

export { login, register, getProfile, getUserHistory, addToHistory, logout };