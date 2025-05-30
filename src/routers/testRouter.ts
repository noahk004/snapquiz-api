import express from "express";
import multer from "multer";

import { TestModel } from "../models/test";
import { convertBufferToEscapedText } from "../utils/file-processor";
import { callOpenAI } from "../utils/openai";
import { AuthRequest, UserPayload } from "../types";

const testRouter = express.Router();
const upload = multer();

testRouter.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: user not authenticated" });
      return;
    }

    const tests = await TestModel.fetch(req.user.id);
    res.json(tests.rows);
  } catch (error) {
    res.status(500).send("Failed to fetch tests.");
  }
});

testRouter.post(
  "/generate",
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized: user not authenticated" });
        return;
      }

      const file = req.file;
      const questionCount = Number(req.body.questionCount);

      if (!file) {
        res.status(400).send("No file uploaded.");
        return;
      }

      // Process file
      const escapedText = await convertBufferToEscapedText(
        file.buffer,
        file.originalname
      );

      // Generate test using AI
      const testDataString = await callOpenAI(escapedText, questionCount);

      const testData = JSON.parse(testDataString);

      console.log("testData:\n", testData);

      // Insert test into database
      const user = req.user! as UserPayload;
      const testId = await TestModel.generateTest(testData, user.id);

      res.status(201).json({ success: true, testId });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to process file." });
    }
  }
);

testRouter.delete("/:id", async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized: user not authenticated" });
    return;
  }

  const testId = Number(req.params.id);
  await TestModel.deleteTest(testId);
  res.send(`Successfully deleted test ${testId}`);
});

testRouter.get("/:id", async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized: user not authenticated" });
    return;
  }

  try {
    const testId = Number(req.params.id);
    const result = await TestModel.getTestQuestions(testId);

    res.json(result);
  } catch (error) {
    res.status(500).send("Failed to fetch test questions.");
  }
});

export default testRouter;
