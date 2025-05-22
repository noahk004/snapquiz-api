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

const PORT = process.env.PORT;

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // Allow only your frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow these HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
    credentials: true, // Allow cookies/auth headers
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, userRouter);
app.use("/api/tests", requireAuth, testRouter);
app.use("/api/attempts", requireAuth, attemptRouter);

initializeDatabase().then(() => {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
});
