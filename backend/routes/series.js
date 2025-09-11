// series.js

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

// GET all series
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM series ORDER BY series_id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET one series with episodes
router.get("/:id", async (req, res) => {
  try {
    const seriesResult = await pool.query("SELECT * FROM series WHERE series_id=$1", [req.params.id]);
    if (seriesResult.rows.length === 0) return res.status(404).json({ error: "Series not found" });

    const episodesResult = await pool.query("SELECT * FROM episodes WHERE series_id=$1 ORDER BY episode_number", [req.params.id]);

    res.json({
      ...seriesResult.rows[0],
      episodes: episodesResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// CREATE a series
router.post("/", async (req, res) => {
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

// ADD an episode to a series
router.post("/:id/episodes", async (req, res) => {
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

// UPDATE a series
router.put("/:id", async (req, res) => {
  try {
    const { title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium } = req.body;
    const result = await pool.query(
      `UPDATE series 
       SET title=$1, description=$2, release_year=$3, language=$4, is_animated=$5, poster_url=$6, wide_poster_url=$7, is_premium=$8 
       WHERE series_id=$9 RETURNING *`,
      [title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Series not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE a series (episodes will cascade delete because of FK)
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM series WHERE series_id=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Series not found" });
    res.json({ message: "Series deleted", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
