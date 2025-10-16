import express from "express"
import pkg from "pg"

const { Pool } = pkg
const router = express.Router()

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
})

// GET all movies or search by query
router.get("/", async (req, res) => {
  try {
    const { q } = req.query
    const result = q
      ? await pool.query(
          "SELECT movie_id AS id, title, release_year, poster_url, wide_poster_url, language, description FROM movies WHERE LOWER(title) LIKE LOWER($1) ORDER BY movie_id DESC LIMIT 20",
          [`${q.toLowerCase()}%`]
        )
      : await pool.query("SELECT movie_id AS id, title, poster_url, wide_poster_url, release_year, language, description FROM movies ORDER BY movie_id DESC LIMIT 20")
    
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// GET one movie by id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM movies WHERE movie_id=$1", [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: "Movie not found" })
    
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// CREATE a movie (with duration field added)
router.post("/", async (req, res) => {
  try {
    const { title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium, duration } = req.body
    const result = await pool.query(
      `INSERT INTO movies (title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium, duration) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium, duration || null]
    )
    
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// UPDATE a movie (with duration field added)
router.put("/:id", async (req, res) => {
  try {
    const { title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium, duration } = req.body
    const result = await pool.query(
      `UPDATE movies SET title=$1, description=$2, release_year=$3, language=$4, poster_url=$5, wide_poster_url=$6, hash_code=$7, is_premium=$8, duration=$9 
       WHERE movie_id=$10 RETURNING *`,
      [title, description, release_year, language, poster_url, wide_poster_url, hash_code, is_premium, duration || null, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: "Movie not found" })
    
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

// DELETE a movie
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM movies WHERE movie_id=$1 RETURNING *", [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: "Movie not found" })
    
    res.json({ message: "Movie deleted", deleted: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

export default router