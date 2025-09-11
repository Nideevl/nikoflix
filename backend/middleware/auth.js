import jwt from "jsonwebtoken";

// ✅ Verify that user is logged in
export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

 const token = authHeader.split(" ")[1];
 console.log("Received token:", token);
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded user info (user_id, role) to request
    next();
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: "Token is not valid" });
  }
}

// ✅ Check if user is admin
export function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}
