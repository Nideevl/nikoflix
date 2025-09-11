import express from "express";
import pkg from "pg";
import { verifyToken } from "../middleware/auth.js";

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASS),
  port: process.env.DB_PORT,
});

// ✅ Start subscription
router.post("/", verifyToken, async (req, res) => {
  try {
    const { plan, end_date, payment_method } = req.body;
    const userId = req.user.user_id;

    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, start_date, end_date, status, payment_method)
       VALUES ($1, NOW(), $2, 'active', $3)
       RETURNING *`,
      [userId, end_date, payment_method]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Get subscription status
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY start_date DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: "none" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Cancel subscription
router.put("/cancel", verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `UPDATE subscriptions SET status='cancelled', end_date=NOW()
       WHERE user_id=$1 AND status='active'
       RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
