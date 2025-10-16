import express from "express";
import pkg from "pg";
import cloudinary from "cloudinary";

const { Pool } = pkg;
const router = express.Router();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Helper function to extract public ID from Cloudinary URL
function extractPublicIdFromUrl(url) {
  try {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split('.')[0];
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
}

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
    // The database constraint will catch duplicates
    if (err.code === '23505') {
      return res.status(400).json({ error: "This content is already in trending" });
    }
    console.error(err);
    res.status(500).send("Server error");
  }
});

// UPDATE trending item
router.put("/:id", async (req, res) => {
  try {
    const { position, expires_at } = req.body;
    const result = await pool.query(
      "UPDATE trending SET position=$1, expires_at=$2, updated_at=NOW() WHERE trending_id=$3 RETURNING *",
      [position, expires_at, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Trending item not found" });
    res.json(result.rows[0]);
  } catch (err) {
    // The database constraint will catch duplicates if you try to change content_id/content_type
    if (err.code === '23505') {
      return res.status(400).json({ error: "This content is already in trending" });
    }
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE from trending (with Cloudinary deletion)
router.delete("/:id", async (req, res) => {
  try {
    // First get the trending item to get the video URL
    const getResult = await pool.query(
      "SELECT * FROM trending WHERE trending_id = $1",
      [req.params.id]
    );
    
    if (getResult.rows.length === 0) {
      return res.status(404).json({ error: "Trending item not found" });
    }
    
    const trendingItem = getResult.rows[0];
    
    // Delete from Cloudinary if video_url exists
    if (trendingItem.video_url) {
      try {
        const publicId = extractPublicIdFromUrl(trendingItem.video_url);
        if (publicId) {
          await cloudinary.v2.uploader.destroy(publicId, {
            resource_type: 'video'
          });
          console.log(`Deleted video from Cloudinary: ${publicId}`);
        }
      } catch (cloudinaryError) {
        console.warn('Cloudinary deletion failed, continuing with database deletion:', cloudinaryError);
      }
    }
    
    // Delete from database
    const deleteResult = await pool.query(
      "DELETE FROM trending WHERE trending_id=$1 RETURNING *", 
      [req.params.id]
    );
    
    res.json({ 
      message: "Trending item removed", 
      deleted: deleteResult.rows[0],
      cloudinaryDeleted: !!trendingItem.video_url
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;