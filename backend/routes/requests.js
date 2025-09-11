    // requests.js

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

    // GET all requests
    router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM requests ORDER BY requested_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
    });

    // CREATE a new request
    router.post("/", async (req, res) => {
    try {
        const { user_id, title, type, language } = req.body;

        const result = await pool.query(
        `INSERT INTO requests (user_id, title, type, language, status) 
        VALUES ($1, $2, $3, $4, 'unfulfilled') RETURNING *`,
        [user_id, title, type, language]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
    });

    // UPDATE request status (fulfilled/unfulfilled)
    router.put("/:id", async (req, res) => {
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

    // DELETE a request
    router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM requests WHERE request_id=$1 RETURNING *", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Request not found" });
        res.json({ message: "Request deleted", deleted: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
    });

    export default router;
