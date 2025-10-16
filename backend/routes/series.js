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

// GET all series or search by query
router.get("/", async (req, res) => {
  try {
    const { q, is_animated } = req.query;
    let query = "SELECT series_id AS id, title, release_year, language, description, is_animated, poster_url, wide_poster_url FROM series";
    let params = [];
    let whereClauses = [];
    let paramCount = 0;

    if (q) {
      paramCount++;
      whereClauses.push(`LOWER(title) LIKE LOWER($${paramCount})`);
      params.push(`${q.toLowerCase()}%`);
    }

    if (is_animated !== undefined) {
      paramCount++;
      whereClauses.push(`is_animated = $${paramCount}`);
      params.push(is_animated === "true");
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY series_id DESC LIMIT 20";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET one series by id
router.get("/:id", async (req, res) => {
  try {
    const seriesResult = await pool.query("SELECT * FROM series WHERE series_id=$1", [req.params.id]);
    if (seriesResult.rows.length === 0) return res.status(404).json({ error: "Series not found" });

    const episodesResult = await pool.query(
      "SELECT episode_id, episode_number, release_date, status ,hash_code, duration FROM episodes WHERE series_id=$1 ORDER BY episode_number",
      [req.params.id]
    );

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

// ADD an episode to a series (with upsert functionality)
router.post("/:id/episodes", async (req, res) => {
  try {
    const { episode_number, release_date, hash_code, status, duration } = req.body;

    // Use current date if release_date is not provided
    const finalReleaseDate = release_date || new Date().toISOString().split('T')[0];
    const finalStatus = status || 'Sub';

    // Check if episode already exists with same series_id, episode_number, and status
    const existingEpisode = await pool.query(
      `SELECT * FROM episodes WHERE series_id=$1 AND episode_number=$2 AND status=$3`,
      [req.params.id, episode_number, finalStatus]
    );

    let result;
    if (existingEpisode.rows.length > 0) {
      // Update existing episode
      result = await pool.query(
        `UPDATE episodes 
        SET hash_code=$1, release_date=$2, duration=$3 
        WHERE series_id=$4 AND episode_number=$5 AND status=$6 
        RETURNING *`,
        [hash_code, finalReleaseDate, duration || null, req.params.id, episode_number, finalStatus]
      );
    } else {
      // Insert new episode
      result = await pool.query(
        `INSERT INTO episodes (series_id, episode_number, release_date, hash_code, status, duration) 
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.params.id, episode_number, finalReleaseDate, hash_code, finalStatus, duration || null]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Bulk episode upload (with upsert functionality)
router.post("/:id/episodes/bulk", async (req, res) => {
  try {
    const episodes = req.body.episodes;

    if (!Array.isArray(episodes)) {
      return res.status(400).json({ error: "Episodes must be an array" });
    }

    const results = [];

    for (const episode of episodes) {
      const { episode_number, release_date, hash_code, status, duration } = episode;

      // Use current date if release_date is not provided
      const finalReleaseDate = release_date || new Date().toISOString().split('T')[0];
      const finalStatus = status || 'Sub';

      // Check if episode already exists with same series_id, episode_number, and status
      const existingEpisode = await pool.query(
        `SELECT * FROM episodes WHERE series_id=$1 AND episode_number=$2 AND status=$3`,
        [req.params.id, episode_number, finalStatus]
      );

      let result;
      if (existingEpisode.rows.length > 0) {
        // Update existing episode
        result = await pool.query(
          `UPDATE episodes 
          SET hash_code=$1, release_date=$2, duration=$3 
          WHERE series_id=$4 AND episode_number=$5 AND status=$6 
          RETURNING *`,
          [hash_code, finalReleaseDate, duration || null, req.params.id, episode_number, finalStatus]
        );
      } else {
        // Insert new episode
        result = await pool.query(
          `INSERT INTO episodes (series_id, episode_number, release_date, hash_code, status, duration) 
          VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [req.params.id, episode_number, finalReleaseDate, hash_code, finalStatus, duration || null]
        );
      }

      results.push(result.rows[0]);
    }

    res.json({ message: `${episodes.length} episodes processed successfully`, episodes: results });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE an episode by id
router.delete("/ep/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM episodes WHERE episode_id=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Episode not found" });

    res.json({ message: "Episode deleted", deleted: result.rows[0] });
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

// DELETE a series
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