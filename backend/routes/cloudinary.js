import express from "express"
import cloudinary from "cloudinary"
import pkg from "pg"

const { Pool } = pkg
const router = express.Router()

// Create database pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
})

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Helper function to parse content IDs (remove m_ or s_ prefix)
const parseContentId = (formattedId) => {
  if (!formattedId) return null;
  
  if (formattedId.startsWith('m_')) {
    return formattedId.substring(2); // Remove 'm_' prefix for movies
  } else if (formattedId.startsWith('s_')) {
    return formattedId.substring(2); // Remove 's_' prefix for series
  }
  return formattedId; // Return as-is if no prefix
};

// Correct public_id extraction function
const getPublicIdFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    const uploadIndex = pathParts.indexOf('upload');
    
    if (uploadIndex !== -1) {
      const afterUpload = pathParts.slice(uploadIndex + 1);
      
      if (afterUpload[0] && afterUpload[0].startsWith('v')) {
        const publicIdParts = afterUpload.slice(1);
        const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, "");
        return publicId;
      } else {
        const publicId = afterUpload.join('/').replace(/\.[^/.]+$/, "");
        return publicId;
      }
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart.replace(/\.[^/.]+$/, "");
  } catch (err) {
    console.error("Error extracting public_id:", err);
    return null;
  }
};

// SINGLE ROUTE: Delete image from Cloudinary AND update PostgreSQL database
router.delete("/delete-image", async (req, res) => {
  try {
    console.log("=== DELETE IMAGE REQUEST ===");
    console.log("Request body:", req.body);
    
    const { image_url, content_type, content_id } = req.body;

    console.log("📸 Image URL:", image_url);
    console.log("📺 Content Type:", content_type);
    console.log("🆔 Content ID:", content_id);
    
    if (!image_url) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Step 1: Extract public_id and delete from Cloudinary
    const fullPublicId = getPublicIdFromUrl(image_url);
    console.log("🎯 Corrected Full Public ID:", fullPublicId);

    if (!fullPublicId) {
      return res.status(400).json({ error: "Could not extract public_id from URL" });
    }

    // Delete from Cloudinary
    console.log("🗑️ Attempting to delete from Cloudinary...");
    const cloudinaryResult = await cloudinary.v2.uploader.destroy(fullPublicId);
    
    console.log("📋 Cloudinary response:", cloudinaryResult);
    
    if (cloudinaryResult.result !== "ok") {
      console.log("❌ Cloudinary deletion failed");
      return res.status(500).json({ 
        error: "Failed to delete image from Cloudinary",
        details: cloudinaryResult 
      });
    }

    console.log("✅ Image deleted from Cloudinary successfully");

    // Step 2: Update PostgreSQL database
    let dbUpdateResult = null;
    
    if (content_type && content_id) {
      // Parse the content ID (remove m_ or s_ prefix)
      const parsedContentId = parseContentId(content_id);
      console.log("🔧 Parsed Content ID:", parsedContentId);
      
      if (!parsedContentId) {
        return res.status(400).json({ error: "Invalid content ID format" });
      }

      console.log("💾 Updating specific content in database...");
      
      if (!['series', 'movies'].includes(content_type)) {
        return res.status(400).json({ 
          error: "content_type must be 'series' or 'movies'" 
        });
      }

      const table = content_type === 'series' ? 'series' : 'movies';
      const idField = content_type === 'series' ? 'series_id' : 'movie_id';
      
      console.log(`📊 Executing SQL: UPDATE ${table} SET ... WHERE ${idField} = $2`, [image_url, parsedContentId]);
      
      const updateResult = await pool.query(
        `UPDATE ${table} 
         SET poster_url = CASE WHEN poster_url = $1 THEN '' ELSE poster_url END,
             wide_poster_url = CASE WHEN wide_poster_url = $1 THEN '' ELSE wide_poster_url END
         WHERE ${idField} = $2
         RETURNING ${idField} as id, title, poster_url, wide_poster_url`,
        [image_url, parsedContentId]
      );

      console.log("📈 Update result row count:", updateResult.rows.length);
      
      if (updateResult.rows.length > 0) {
        dbUpdateResult = {
          table: table,
          record: updateResult.rows[0]
        };
        console.log("✅ Specific content updated in database:", updateResult.rows[0]);
      } else {
        console.log("⚠️ Content not found in database, but Cloudinary deletion succeeded");
        
        // Let's check if the content exists but the image URL doesn't match
        const checkResult = await pool.query(
          `SELECT ${idField}, title, poster_url, wide_poster_url FROM ${table} WHERE ${idField} = $1`,
          [parsedContentId]
        );
        
        if (checkResult.rows.length > 0) {
          console.log("🔍 Content exists but image URL doesn't match:", checkResult.rows[0]);
        } else {
          console.log("❌ Content ID not found in database");
        }
      }
    } else {
      // If no content_type/content_id provided, search both tables
      console.log("🔍 Searching for image in database...");
      
      // Search in series table
      const seriesResult = await pool.query(
        `SELECT series_id, title, poster_url, wide_poster_url FROM series WHERE poster_url = $1 OR wide_poster_url = $1`,
        [image_url]
      );
      
      if (seriesResult.rows.length > 0) {
        const series = seriesResult.rows[0];
        console.log("📺 Found in series table:", series);
        
        const updateResult = await pool.query(
          `UPDATE series 
           SET poster_url = CASE WHEN poster_url = $1 THEN '' ELSE poster_url END,
               wide_poster_url = CASE WHEN wide_poster_url = $1 THEN '' ELSE wide_poster_url END
           WHERE series_id = $2
           RETURNING series_id as id, title, poster_url, wide_poster_url`,
          [image_url, series.series_id]
        );
        
        dbUpdateResult = {
          table: 'series',
          record: updateResult.rows[0]
        };
        console.log("✅ Series table updated");
      } else {
        // Search in movies table
        const moviesResult = await pool.query(
          `SELECT movie_id, title, poster_url, wide_poster_url FROM movies WHERE poster_url = $1 OR wide_poster_url = $1`,
          [image_url]
        );
        
        if (moviesResult.rows.length > 0) {
          const movie = moviesResult.rows[0];
          console.log("🎬 Found in movies table:", movie);
          
          const updateResult = await pool.query(
            `UPDATE movies 
             SET poster_url = CASE WHEN poster_url = $1 THEN '' ELSE poster_url END,
                 wide_poster_url = CASE WHEN wide_poster_url = $1 THEN '' ELSE wide_poster_url END
             WHERE movie_id = $2
             RETURNING movie_id as id, title, poster_url, wide_poster_url`,
            [image_url, movie.movie_id]
          );
          
          dbUpdateResult = {
            table: 'movies',
            record: updateResult.rows[0]
          };
          console.log("✅ Movies table updated");
        } else {
          console.log("⚠️ Image URL not found in any database table");
        }
      }
    }

    // Prepare response
    const response = {
      message: "Image deleted from Cloudinary successfully",
      cloudinary_result: cloudinaryResult
    };

    if (dbUpdateResult) {
      response.database_update = dbUpdateResult;
      response.message += " and database updated successfully";
    } else {
      response.message += " (image not found in database)";
    }

    console.log("✅ Operation completed successfully");
    res.json(response);
    
  } catch (err) {
    console.error("💥 Server error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: err.message 
    });
  }
});

export default router;