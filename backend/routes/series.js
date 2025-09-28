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

// Helper function to format series ID
const formatSeriesId = (id) => `s_${id}`

// Helper function to parse series ID
const parseSeriesId = (formattedId) => {
  if (formattedId.startsWith('s_')) {
    return formattedId.substring(2)
  }
  return formattedId
}

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

    // Format the IDs in the response
    const formattedRows = result.rows.map(row => ({
      ...row,
      id: row.id
    }));
    
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET one series by id
router.get("/:id", async (req, res) => {
  try {
    const parsedId = parseSeriesId(req.params.id);
    const seriesResult = await pool.query("SELECT * FROM series WHERE series_id=$1", [parsedId]);
    if (seriesResult.rows.length === 0) return res.status(404).json({ error: "Series not found" });

    const episodesResult = await pool.query(
      "SELECT episode_id, episode_number, release_date, status ,hash_code, duration FROM episodes WHERE series_id=$1 ORDER BY episode_number", 
      [parsedId]
    );

    // Format the IDs in the response
    const formattedEpisodes = episodesResult.rows.map(episode => ({
      ...episode,
      episode_id: episode.episode_id
    }))
    
    res.json({
      ...seriesResult.rows[0],
      series_id: formatSeriesId(seriesResult.rows[0].series_id),
      episodes: formattedEpisodes
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
    
    // Format the ID in the response
    const formattedRow = {
      ...result.rows[0],
      series_id: formatSeriesId(result.rows[0].series_id)
    }
    
    res.json(formattedRow);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADD an episode to a series (with upsert functionality)
router.post("/:id/episodes", async (req, res) => {
  try {
    const parsedId = parseSeriesId(req.params.id);
    const { episode_number, release_date, hash_code, status, duration } = req.body;
    
    // Use current date if release_date is not provided
    const finalReleaseDate = release_date || new Date().toISOString().split('T')[0];
    const finalStatus = status || 'Sub';
    
    // Check if episode already exists with same series_id, episode_number, and status
    const existingEpisode = await pool.query(
      `SELECT * FROM episodes WHERE series_id=$1 AND episode_number=$2 AND status=$3`,
      [parsedId, episode_number, finalStatus]
    );
    
    let result;
    if (existingEpisode.rows.length > 0) {
      // Update existing episode
      result = await pool.query(
        `UPDATE episodes 
        SET hash_code=$1, release_date=$2, duration=$3 
        WHERE series_id=$4 AND episode_number=$5 AND status=$6 
        RETURNING *`,
        [hash_code, finalReleaseDate, duration || null, parsedId, episode_number, finalStatus]
      );
    } else {
      // Insert new episode
      result = await pool.query(
        `INSERT INTO episodes (series_id, episode_number, release_date, hash_code, status, duration) 
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [parsedId, episode_number, finalReleaseDate, hash_code, finalStatus, duration || null]
      );
    }
    
    // Format the ID in the response
    const formattedRow = {
      ...result.rows[0],
      episode_id: result.rows[0].episode_id
    }
    
    res.json(formattedRow);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Bulk episode upload (with upsert functionality)
router.post("/:id/episodes/bulk", async (req, res) => {
  try {
    const parsedId = parseSeriesId(req.params.id);
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
        [parsedId, episode_number, finalStatus]
      );
      
      let result;
      if (existingEpisode.rows.length > 0) {
        // Update existing episode
        result = await pool.query(
          `UPDATE episodes 
          SET hash_code=$1, release_date=$2, duration=$3 
          WHERE series_id=$4 AND episode_number=$5 AND status=$6 
          RETURNING *`,
          [hash_code, finalReleaseDate, duration || null, parsedId, episode_number, finalStatus]
        );
      } else {
        // Insert new episode
        result = await pool.query(
          `INSERT INTO episodes (series_id, episode_number, release_date, hash_code, status, duration) 
          VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [parsedId, episode_number, finalReleaseDate, hash_code, finalStatus, duration || null]
        );
      }
      
      results.push({
        ...result.rows[0],
        episode_id: result.rows[0].episode_id
      });
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
    const parsedId = req.params.id;
    const result = await pool.query("DELETE FROM episodes WHERE episode_id=$1 RETURNING *", [parsedId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Episode not found" });
    
    // Format the ID in the response
    const formattedRow = {
      ...result.rows[0],
      episode_id: result.rows[0].episode_id
    }
    
    res.json({ message: "Episode deleted", deleted: formattedRow });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// UPDATE a series
router.put("/:id", async (req, res) => {
  try {
    const parsedId = parseSeriesId(req.params.id);
    const { title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium } = req.body;
    const result = await pool.query(
      `UPDATE series 
       SET title=$1, description=$2, release_year=$3, language=$4, is_animated=$5, poster_url=$6, wide_poster_url=$7, is_premium=$8 
       WHERE series_id=$9 RETURNING *`,
      [title, description, release_year, language, is_animated, poster_url, wide_poster_url, is_premium, parsedId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Series not found" });
    
    // Format the ID in the response
    const formattedRow = {
      ...result.rows[0],
      series_id: formatSeriesId(result.rows[0].series_id)
    }
    
    res.json(formattedRow);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE a series
router.delete("/:id", async (req, res) => {
  try {
    const parsedId = parseSeriesId(req.params.id);
    const result = await pool.query("DELETE FROM series WHERE series_id=$1 RETURNING *", [parsedId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Series not found" });
    
    // Format the ID in the response
    const formattedRow = {
      ...result.rows[0],
      series_id: formatSeriesId(result.rows[0].series_id)
    }
    
    res.json({ message: "Series deleted", deleted: formattedRow });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;