import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import pkg from "pg";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const { Pool } = pkg;
const router = express.Router();

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASS),
  port: process.env.DB_PORT,
});

// Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Nodemailer transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// Utility: Generate JWT
function generateToken(user) {
  return jwt.sign(
    { user_id: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

//
// REGISTER (with email verification)
//
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Insert user as unverified
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, created_at, verified) 
       VALUES ($1,$2,$3,'user',NOW(), false) 
       RETURNING user_id, username, email, role, verified`,
      [username, email, hashed]
    );

    const user = result.rows[0];

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1,$2,$3)",
      [user.user_id, verifyToken, new Date(Date.now() + 24 * 60 * 60 * 1000)]
    );

    const verifyLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verifyToken}`;
    console.log("link-",verifyLink);

    // Send verification email
    await transporter.sendMail({
      from: `"NIKOFLIX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `<p>Hello ${username},</p>
             <p>Please verify your account by clicking the link below:</p>
             <a href="${verifyLink}">Verify Email</a>`,
    });

    res.json({ message: "Registration successful. Please check your email to verify account." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//
// VERIFY EMAIL
//
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    const result = await pool.query(
      "SELECT * FROM email_verifications WHERE token=$1 AND expires_at > NOW()",
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const entry = result.rows[0];

    await pool.query("UPDATE users SET verified=true WHERE user_id=$1", [entry.user_id]);
    await pool.query("DELETE FROM email_verifications WHERE id=$1", [entry.id]);

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//
// LOGIN (requires verified email)
//
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    if (!user.verified) {
      return res.status(400).json({ error: "Please verify your email before logging in." });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        error: "This account uses Google login. Please log in with Google.",
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//
// GOOGLE LOGIN (auto-verified)
//
router.post("/google", async (req, res) => {
  try {
    const { id_token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    let result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    let user;
    if (result.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, verified) 
         VALUES ($1,$2,NULL,'user',NOW(), true) RETURNING *`,
        [name, email]
      );
      user = insert.rows[0];
    } else {
      user = result.rows[0];
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Google login failed");
  }
});

//
// FORGOT PASSWORD (send reset link)
//
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({
        error: "This account uses Google login. Please sign in with Google instead.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      "INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES ($1,$2,$3)",
      [user.user_id, resetToken, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"NIKOFLIX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      html: `<p>Hello,</p>
             <p>You requested to reset your password. Click the link below:</p>
             <a href="${resetLink}">Reset Password</a>
             <p>If you didn’t request this, ignore this email.</p>`,
    });

    res.json({ message: "Password reset link sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//
// RESET PASSWORD
//
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const result = await pool.query(
      "SELECT * FROM password_resets WHERE reset_token=$1 AND expires_at > NOW()",
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const entry = result.rows[0];

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE users SET password_hash=$1 WHERE user_id=$2", [
      hashed,
      entry.user_id,
    ]);
    await pool.query("DELETE FROM password_resets WHERE id=$1", [entry.id]);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

//
// LOGOUT
//
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully. Please delete token on client side." });
});

export default router;
