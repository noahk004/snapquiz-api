import { Router } from "express";
import { AuthModel } from "../models/auth";
import { UserModel } from "../models/user";

const authRouter = Router();

// Login route
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const token = await AuthModel.login(username, password);
  if (!token) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain:
      process.env.ENVIRONMENT === "production" ? "api.snapquiz.xyz" : "localhost",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });

  res.json({ message: "Logged in", token: token });
});

// Logout route
authRouter.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

// Create a new user
authRouter.post("/register", async (req, res) => {
  const { username, email, first, last, password } = req.body;

  if (!username || !email || !first || !last || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const newUser = await UserModel.create(
    username,
    email,
    first,
    last,
    password
  );
  res.status(201).json(newUser);
});

export default authRouter;
