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

import { requireAuth } from "./middleware/requireAuth";

const PORT = process.env.PORT || 8000;

const app = express();

// Configure CORS based on environment
const allowedOrigins =
  process.env.ENVIRONMENT === "production"
    ? ["https://snapquiz.xyz", "https://www.snapquiz.xyz"] // Production domains
    : ["http://localhost:3000"]; // Development

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, userRouter);
app.use("/api/tests", requireAuth, testRouter);
app.use("/api/attempts", requireAuth, attemptRouter);

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
