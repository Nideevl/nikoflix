// social.js

import express from "express";
import pkg from "pg";
import { verifyToken } from "../middleware/auth.js";

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

//
// 👍 LIKES
// GET likes count for a movie/series
router.get("/likes", async (req, res) => {
  try {
    const { movie_id, series_id } = req.query;
    let result;

    if (movie_id) {
      result = await pool.query("SELECT COUNT(*) FROM likes WHERE movie_id=$1", [movie_id]);
    } else if (series_id) {
      result = await pool.query("SELECT COUNT(*) FROM likes WHERE series_id=$1", [series_id]);
    } else {
      return res.status(400).json({ error: "movie_id or series_id required" });
    }

    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADD like
router.post("/likes", verifyToken, async (req, res) => {
  try {
    const { user_id, movie_id, series_id } = req.body;
    const result = await pool.query(
      "INSERT INTO likes (user_id, movie_id, series_id) VALUES ($1,$2,$3) RETURNING *",
      [user_id, movie_id || null, series_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// REMOVE like
router.delete("/likes/:id",verifyToken, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM likes WHERE like_id=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Like not found" });
    res.json({ message: "Like removed", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// 💬 COMMENTS
// GET comments for a movie/series/episode
router.get("/comments", async (req, res) => {
  try {
    const { movie_id, series_id, episode_id } = req.query;

    const result = await pool.query(
      `SELECT c.*, u.username 
       FROM comments c 
       JOIN users u ON c.user_id = u.user_id
       WHERE ($1::int IS NULL OR c.movie_id=$1)
         AND ($2::int IS NULL OR c.series_id=$2)
         AND ($3::int IS NULL OR c.episode_id=$3)
       ORDER BY c.created_at DESC`,
      [movie_id || null, series_id || null, episode_id || null]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADD comment
router.post("/comments", verifyToken, async (req, res) => {
  try {
    const { user_id, movie_id, series_id, episode_id, comment_text, parent_comment_id } = req.body;
    const result = await pool.query(
      `INSERT INTO comments (user_id, movie_id, series_id, episode_id, comment_text, parent_comment_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, movie_id || null, series_id || null, episode_id || null, comment_text, parent_comment_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE comment
router.delete("/comments/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM comments WHERE comment_id=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Comment not found" });
    res.json({ message: "Comment deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
