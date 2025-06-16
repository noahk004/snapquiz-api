import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

import { initializeDatabase } from "./startup";

import authRouter from "./routers/authRouter";
import userRouter from "./routers/userRouter";
import testRouter from "./routers/testRouter";
import attemptRouter from "./routers/attemptRouter";
import stropRouter from "./routers/stropRouter";

import { requireAuth } from "./middleware/requireAuth";

const PORT = process.env.PORT || 8000;

const app = express();

// Configure CORS based on environment
const allowedOrigins =
  process.env.ENVIRONMENT === "production"
    ? /^https:\/\/(www\.)?snapquiz\.xyz$/ // Production domains
    : "http://localhost:3000"; // Development

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/strop/api", stropRouter);

app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, userRouter);
app.use("/api/tests", requireAuth, testRouter);
app.use("/api/attempts", requireAuth, attemptRouter);

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
