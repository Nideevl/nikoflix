// index.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

import authRoutes from "./routes/auth.js";   
import moviesRoutes from "./routes/movies.js";
import seriesRoutes from "./routes/series.js"; 
import requestsRoutes from "./routes/requests.js";
import socialRoutes from "./routes/social.js";
import trendingRoutes from "./routes/trending.js";
import adminRoutes from "./routes/admin.js";
import { verifyToken, isAdmin } from "./middleware/auth.js";
import subscriptionsRoutes from "./routes/subscriptions.js";
import paymentsRoutes from "./routes/payments.js";
import cloudinaryRoutes from "./routes/cloudinary.js"

dotenv.config();
const { Pool } = pkg;

const app = express();

// ✅ Proper CORS config (frontend at 3000)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Routes
app.use("/api", socialRoutes);
app.use("/api/admin", verifyToken, isAdmin, adminRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trending", trendingRoutes);
app.use("/api/movies", moviesRoutes);
app.use("/api/series", seriesRoutes); 
app.use("/api/cloudinary", cloudinaryRoutes)
app.use("/api/requests", requestsRoutes);

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASS:", process.env.DB_PASS ? `Loaded ✅` : "Missing ❌");

// Test route
app.get("/", (req, res) => {
  res.send("API running ✅");
});

// Example movies route with DB
app.get("/api/movies/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM movies LIMIT 10");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Start server
app.listen(5000, () => console.log("Server running on port 5000"));
