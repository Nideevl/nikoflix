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

// GET all trending content
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM trending 
       WHERE expires_at IS NULL OR expires_at > NOW()
       ORDER BY position ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ADD to trending
router.post("/", async (req, res) => {
  try {
    const { content_id, content_type, trending_type, position, video_url, expires_at } = req.body;

    const result = await pool.query(
      `INSERT INTO trending (content_id, content_type, trending_type, position, video_url, expires_at) 
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [content_id, content_type, trending_type, position, video_url, expires_at || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// UPDATE trending item
router.put("/:id", async (req, res) => {
  try {
    const { position, expires_at } = req.body;
    const result = await pool.query(
      "UPDATE trending SET position=$1, expires_at=$2 WHERE trending_id=$3 RETURNING *",
      [position, expires_at, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Trending item not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE from trending
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM trending WHERE trending_id=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Trending item not found" });
    res.json({ message: "Trending item removed", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
