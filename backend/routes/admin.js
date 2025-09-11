import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// ADMIN: get all requests
router.get("/requests", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requests ORDER BY requested_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADMIN: mark request as fulfilled/unfulfilled
router.put("/requests/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      "UPDATE requests SET status=$1, fulfilled_at=NOW() WHERE request_id=$2 RETURNING *",
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Request not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADMIN: add a new movie
router.post("/movies", async (req, res) => {
  try {
    const { title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium } = req.body;
    const result = await pool.query(
      `INSERT INTO movies (title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADMIN: add a new series
router.post("/series", async (req, res) => {
  try {
    const { title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium } = req.body;
    const result = await pool.query(
      `INSERT INTO series (title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADMIN: add an episode to a series
router.post("/series/:id/episodes", async (req, res) => {
  try {
    const { episode_number, release_date, hash_code } = req.body;
    const result = await pool.query(
      `INSERT INTO episodes (series_id, episode_number, release_date, hash_code)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, episode_number, release_date, hash_code]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
    