import { Response, NextFunction } from "express";
import { AuthRequest } from "../types"
import { verifyJwt } from "../utils/jwt"; // adjust path as needed

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return
  }

  try {
    const decoded = verifyJwt(token);
    req.user = decoded; // attach user info to request object
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
