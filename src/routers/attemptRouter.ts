import express from "express";
import { AttemptModel } from "../models/attempt";
import { AuthRequest, UserPayload } from "../types";

const attemptRouter = express.Router();

// Get all attempts for a test
attemptRouter.get("/all-test-attempts/:id", async (req: AuthRequest, res) => {
  const testId = parseInt(req.params.id);
  const user = req.user! as UserPayload;
  const userId = user.id;

  if (isNaN(testId)) {
    res.status(400).json({ success: false, message: "Invalid test ID" });
    return;
  }

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const [attempts, testMeta] = await Promise.all([
      AttemptModel.getTestAttempts(testId, userId),
      AttemptModel.getTestMeta(testId),
    ]);

    res.status(200).json({
      success: true,
      test: {
        id: testMeta.id,
        title: testMeta.title,
        questionCount: Number(testMeta.question_count),
      },
      attempts: attempts.map((attempt) => ({
        id: attempt.id.toString(),
        date: attempt.created_at,
        score: attempt.score,
        completed: true,
      })),
    });
  } catch (error) {
    console.error("Error fetching test attempts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

attemptRouter.get("/attempts/:id", async (req: AuthRequest, res) => {
  const attemptId = parseInt(req.params.id);

  if (isNaN(attemptId)) {
    res.status(400).json({ success: false, message: "Invalid attempt ID" });
    return;
  }

  try {
    const attemptData = await AttemptModel.getAttempt(attemptId);

    if (!attemptData || attemptData.questions.length === 0) {
      res.status(404).json({ success: false, message: "Attempt not found" });
      return;
    }

    res.status(200).json(attemptData);
  } catch (error) {
    console.error("Error fetching attempt:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

attemptRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { testId, answers } = req.body;
    const user = req.user! as UserPayload;
    const userId = user.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!testId || typeof answers !== "object") {
      res.status(400).json({ success: false, message: "Invalid input" });
      return;
    }

    const result = await AttemptModel.createAttempt(testId, userId, answers);

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: "Failed to record attempt",
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      attemptId: result.attemptId,
      score: result.score,
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default attemptRouter;
