// File used to define routes for Strop AI API routes.

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import { Request, Response } from "express";

const stropRouter = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit per file
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation
    const allowedTypes = [
      "application/pdf",
      // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      // 'text/csv',
      // 'text/plain',
      // 'text/html',
      // 'application/vnd.oasis.opendocument.text', // odt
      // 'application/rtf',
      // 'application/epub+zip',
      // 'application/json',
      // 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      "image/png",
      "image/jpeg",
      // 'image/gif',
      // 'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  },
});

// This route generates a problem set and answer key based on uploaded course materials.
// Request body (JSON):
//   - files: File[] (required) - Array of course materials (pdf, docx, pptx, png, jpg, jpeg)
//   - numProblems: number (required) - Number of problems to generate
//   - difficulty: "easy" | "medium" | "hard" | "mixed" (required)
//   - focusTopics: string (required) - Topics to focus on
//   - additionalInstructions?: string (optional) - Custom instructions for problem generation
// Response: application/x-latex - LaTeX file containing problem set and answer key
stropRouter.post(
  "/problem-set",
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("\n=== Starting Problem Set Generation ===");
      const files = req.files as Express.Multer.File[];
      console.log(
        "Request received with files:",
        files?.map((f: Express.Multer.File) => ({
          name: f.originalname,
          type: f.mimetype,
          size: f.size,
        }))
      );

      const { numProblems, difficulty, focusTopics, additionalInstructions } =
        req.body;

      console.log("Request parameters:", {
        numProblems,
        difficulty,
        focusTopics,
        hasAdditionalInstructions: !!additionalInstructions,
      });

      if (!files || files.length === 0) {
        res.status(400).json({
          error: "No files uploaded",
          message: "At least one file must be uploaded",
        });
        return;
      }

      if (!numProblems || !difficulty || !focusTopics) {
        res.status(400).json({
          error: "Missing required fields",
          message: "numProblems, difficulty, and focusTopics are required",
        });
        return;
      }

      // Process files and prepare for Claude
      console.log("\nProcessing files for Claude...");
      const fileContents = files.map((file) => {
        const base64 = file.buffer.toString("base64");
        if (file.mimetype !== "application/pdf") {
          throw new Error(
            `File type ${file.mimetype} not supported. Only PDF files are currently supported.`
          );
        }
        return {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        };
      });
      console.log(`Processed ${fileContents.length} files`);

      // Create the message for Claude
      console.log("\nSending request to Claude...");
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 20000,
        temperature: 0.3, // Lower temperature for more consistent output
        system: "You are an expert educator and LaTeX specialist. Analyze the provided course materials carefully, then generate a complete problem set and answer key. Think through your approach internally, but provide only the final LaTeX document in your response. Do not show your thinking process or analysis - only output the complete, compilable LaTeX code within <latex_document> tags.",
        messages: [
          {
            role: "user",
            content: [
              ...fileContents,
              {
                type: "text" as const,
                text: `You are an AI assistant tasked with generating a problem set and answer key based on uploaded course materials. Your goal is to create a LaTeX file containing a well-structured problem set and corresponding answer key that aligns with the provided course materials and specifications.

First, analyze the uploaded course materials files. Read through all uploaded files carefully and identify key concepts, formulas, and topics covered. Pay special attention to the following focus topics:

<focus_topics>
${focusTopics}
</focus_topics>

Now, generate a problem set based on the following specifications:

1. Number of problems: ${numProblems}
2. Difficulty level: ${difficulty}

When creating problems, ensure that:
- The problems are diverse and cover various aspects of the focus topics
- The difficulty level matches the specified difficulty (if "mixed", create a balance of easy, medium, and hard problems)
- Each problem is clearly stated and solvable using the information provided in the uploaded course materials
- The problems are original and not direct copies from the course materials

Consider the following additional instructions when generating the problems:

<additional_instructions>
${additionalInstructions}
</additional_instructions>

After generating the problems, create a comprehensive answer key that includes:
- Step-by-step solutions for each problem
- Explanations of the reasoning behind each step
- References to relevant concepts or formulas from the course materials

Format the problem set and answer key in LaTeX, following these guidelines:
1. Use appropriate LaTeX commands and environments for mathematical notation, equations, and formatting
2. Organize the problems and answers in a clear, numbered structure
3. Include a title page with the course name, problem set number, and date
4. Add page numbers and section headers as necessary

Your final output should be a complete LaTeX document containing:
1. Title page
2. Problem set
3. Answer key

Ensure that the LaTeX code is properly formatted and can be compiled without errors. Write your complete LaTeX document output within <latex_document> tags.`,
              },
            ],
          },
        ],
      });

      console.log("\nClaude response received");
      
      const content = msg.content[0];
      if (!content) {
        console.error("Empty response received");
        throw new Error("Empty response from Claude");
      }

      if (content.type !== "text") {
        console.error("Unexpected response type:", content.type);
        throw new Error(`Unexpected response type: ${content.type}`);
      }

      console.log("Response length:", content.text.length);

      // Extract LaTeX content
      const latexMatch = content.text.match(
        /<latex_document>([\s\S]*?)<\/latex_document>/
      );
      
      if (!latexMatch) {
        console.error("No LaTeX content found in response");
        console.log("Response preview:", content.text.substring(0, 500));
        throw new Error("Claude did not return properly formatted LaTeX content");
      }

      console.log("Found LaTeX content!");
      console.log("LaTeX content length:", latexMatch[1].length);

      // Return the LaTeX content
      res.setHeader("Content-Type", "application/x-latex");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="problem_set.tex"'
      );
      res.send(latexMatch[1]);
      console.log("\n=== Problem Set Generation Complete ===\n");
      return;

    } catch (error) {
      console.error("\n=== Error in Problem Set Generation ===");
      console.error("Error details:", error);
      res.status(500).json({
        error: "Request processing failed",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      console.log("\n=== Problem Set Generation Failed ===\n");
      return;
    }
  }
);

export default stropRouter;