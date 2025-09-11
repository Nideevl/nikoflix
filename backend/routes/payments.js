import express from "express";
import pkg from "pg";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASS),
  port: process.env.DB_PORT,
});

// ✅ Record a payment (mock for now)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { subscription_id, amount, payment_method, transaction_id } = req.body;
    const userId = req.user.user_id;

    const result = await pool.query(
      `INSERT INTO payments (subscription_id, user_id, amount, payment_method, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, 'success')
       RETURNING *`,
      [subscription_id, userId, amount, payment_method, transaction_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Admin: get all payments
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM payments ORDER BY payment_date DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
