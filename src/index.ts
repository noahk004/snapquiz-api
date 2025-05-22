import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import path from "path";
dotenv.config();

import { initializeDatabase } from "./startup";

import authRouter from "./routers/authRouter";
import userRouter from "./routers/userRouter";
import testRouter from "./routers/testRouter";
import attemptRouter from "./routers/attemptRouter";

import { requireAuth } from "./middleware/requireAuth";

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const app = express();

// SSL certificate configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "../ssl/private.key")),
  cert: fs.readFileSync(path.join(__dirname, "../ssl/certificate.crt")),
};

app.use(
  cors({
    origin: "https://snapquiz.xyz",
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

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

initializeDatabase().then(() => {
  // Create HTTPS server
  const httpsServer = https.createServer(sslOptions, app);

  // Start HTTPS server
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
  });

  // Start HTTP server for redirects
  app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT} (redirecting to HTTPS)`);
  });
});
