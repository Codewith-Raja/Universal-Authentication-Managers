// Import necessary modules
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import auth from "./middleware/auth.js"; // Importing auth middleware
import nodemailer from "nodemailer"; // Added for OTP emails
import UserModel from "./models/User.js";
import PasswordModel from "./models/Password.js"; 
import axios from "axios"; // Import axios for API calls

dotenv.config(); // Load environment variables

console.log("Checking environment variables:");
console.log(`MONGO_URI: ${process.env.MONGO_URI ? "Loaded" : "Missing"}, JWT_SECRET: ${process.env.JWT_SECRET ? "Loaded" : "Missing"}, EMAIL_API_KEY: ${process.env.EMAIL_API_KEY ? "Loaded" : "Missing"}, EMAIL_USER: ${process.env.EMAIL_USER ? "Loaded" : "Missing"}`);

// Initialize Express App
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error("Database Connection Error:", err));

// Create Email Transporter for OTP Emails
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Store OTPs Temporarily (Use Redis for production)
const otpStore = {};

// Generate a Random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Example: 458123
}

// Function to Verify Email Existence (Abstract API)
async function verifyEmail(email) {
    try {
        const response = await axios.get("https://emailvalidation.abstractapi.com/v1/", {
            params: { api_key: process.env.EMAIL_API_KEY, email: email }
        });

        if (response.data.error) {
            console.error("Email verification API error:", response.data.error.message);
            return false;
        }

        return response.data.is_valid_format.value && response.data.deliverability === "DELIVERABLE";
    } catch (error) {
        console.error("Email verification API error:", error.response ? error.response.data : error.message);
        return false;
    }
}

// Step 1: Request OTP (Before Signup)
app.post("/request-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        // Verify Email
        const isEmailValid = await verifyEmail(email);
        if (!isEmailValid) {
            return res.status(400).json({ error: "Invalid or non-existent email." });
        }

        // Check if user already exists
        const userExists = await UserModel.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: "Email already registered." });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStore[email] = otp;

        // Send OTP via Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP for Signup",
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
        });

        res.json({ message: "OTP sent successfully!" });
    } catch (error) {
        console.error("OTP request error:", error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

// Step 2: Verify OTP and Signup
app.post("/signup", async (req, res) => {
    try {
        const { email, password, otp } = req.body;

        if (!email || !password || !otp) {
            return res.status(400).json({ error: "Email, password, and OTP are required." });
        }

        // Check if OTP is correct
        if (otpStore[email] !== parseInt(otp)) {
            return res.status(400).json({ error: "Invalid OTP. Please try again." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new UserModel({ email, password: hashedPassword });
        await newUser.save();

        // Remove OTP after successful signup
        delete otpStore[email];

        res.json({ message: "Signup successful!" });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});

// Login API
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required." });
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // 🔐 Check for 2FA
        if (user.twoFactorEnabled) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            otpStore[email] = otp;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Your 2FA Code",
                text: `Your 2FA login code is ${otp}. It is valid for 5 minutes.`,
            });

            return res.json({ twoFactor: true });
        }

        // No 2FA, send token directly
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ message: "Login successful!", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal Server Error." });
    }
});


app.post("/verify-2fa", async (req, res) => {
    const { email, otp } = req.body;

    if (!otpStore[email] || otpStore[email] !== otp) {
        return res.status(400).json({ error: "Invalid or expired 2FA code." });
    }

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found." });

    delete otpStore[email];

    const token = jwt.sign({ userId: user._id, email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "2FA verified", token });
});



app.get("/user-info", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.userId).select("-password"); 

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("User validation failed:", error);
        res.status(401).json({ error: "Invalid or expired token" });
    }
});

// Save Password API
app.post("/save-password", async (req, res) => {
    try {
        const { userId, website, username, password } = req.body;

        if (!userId || !website || !username || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newPassword = new PasswordModel({ userId, website, username, password });
        await newPassword.save();

        res.json({ message: "Password saved successfully!" });
    } catch (error) {
        console.error("Error saving password:", error);
        res.status(500).json({ error: "Server error while saving password" });
    }
});

// Delete Password API
app.delete("/delete-password/:id", async (req, res) => {
    try {
        const passwordId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(passwordId)) {
            return res.status(400).json({ error: "Invalid password ID format" });
        }

        const result = await PasswordModel.findByIdAndDelete(passwordId);

        if (!result) {
            return res.status(404).json({ error: "Password not found" });
        }

        res.json({ message: "Password deleted successfully" });
    } catch (error) {
        console.error("Server error while deleting password:", error);
        res.status(500).json({ error: "Server error while deleting password" });
    }
});

// Fetch Passwords API
app.get("/get-passwords/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const passwords = await PasswordModel.find({ userId });

        res.json(passwords || []);
    } catch (error) {
        console.error("Error fetching passwords:", error);
        res.status(500).json({ error: "Server error while fetching passwords" });
    }
});

// Save recovery email (e.g. for master key recovery)
app.post("/account/recovery", auth, async (req, res) => {
    const { recoveryEmail } = req.body;
    if (!recoveryEmail) return res.status(400).json({ error: "Recovery email required" });

    await UserModel.findByIdAndUpdate(req.user.userId, { recoveryEmail });
    res.json({ message: "Recovery email saved." });
});

// Enable 2FA
app.post("/account/enable-2fa", auth, async (req, res) => {
    await UserModel.findByIdAndUpdate(req.user.userId, { twoFactorEnabled: true });
    res.json({ message: "Two-factor authentication enabled." });
});

// Export all passwords
app.get("/account/export", auth, async (req, res) => {
    const passwords = await PasswordModel.find({ userId: req.user.userId });
    res.json(passwords);
});

// Delete account + all passwords
app.delete("/account/delete", auth, async (req, res) => {
    await PasswordModel.deleteMany({ userId: req.user.userId });
    await UserModel.findByIdAndDelete(req.user.userId);
    res.json({ message: "Account and data deleted." });
});

// Get 2FA Status
app.get("/user/2fa-status", auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.userId).select("twoFactorEnabled");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ twoFactorEnabled: user.twoFactorEnabled });
    } catch (error) {
        console.error("Error fetching 2FA status:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Toggle 2FA
app.post("/user/toggle-2fa", auth, async (req, res) => {
    try {
        const { enabled } = req.body;
        const user = await UserModel.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.twoFactorEnabled = enabled;
        await user.save();

        res.json({ message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
        console.error("Error toggling 2FA:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Test API Route
app.get("/api/status", (req, res) => {
    res.json({ message: "API is working fine!" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
