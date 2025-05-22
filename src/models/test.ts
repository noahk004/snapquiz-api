import db from "../db";

export interface GeneratedTest {
  title: string;
  questions: GeneratedQuestion[];
}

export interface GeneratedQuestion {
  question_text: string;
  options: GeneratedOption[];
  explanation: string;
}

export interface GeneratedOption {
  option_text: string;
  is_correct: boolean;
}

export class TestModel {
  static async getTestQuestions(testId: number) {
    const result = await db.query(
      `
      SELECT
        questions.id AS question_id,
        options.id AS option_id,
        options.option_text,
        questions.question_text,
        questions.mcq_type,
        questions.explanation_text
      FROM tests
      JOIN questions
        ON tests.id = questions.test_id
      JOIN options
        ON questions.id = options.question_id
      WHERE tests.id = $1; 
    `,
      [testId]
    );

    const testMetaData = (
      await db.query("SELECT * FROM tests WHERE id = $1", [testId])
    ).rows[0];

    const questionsMap = new Map();

    for (const row of result.rows) {
      const questionId = row.question_id;

      if (!questionsMap.has(questionId)) {
        questionsMap.set(questionId, {
          question_id: questionId,
          text: row.question_text,
          mcq_type: row.mcq_type,
          explanation: row.explanation_text,
          options: [],
        });
      }

      questionsMap.get(questionId).options.push({
        option_id: row.option_id,
        text: row.option_text,
      });
    }
    return {
      ...testMetaData,
      questions: Array.from(questionsMap.values()),
    };
  }

  // Get all tests
  static async fetch(userId: Number) {
    const result = await db.query(`
      SELECT
        tests.id,
        tests.title,
        COUNT(questions.id) AS num_questions,
        tests.generated_at
      FROM tests
      JOIN questions
        ON questions.test_id = tests.id
      WHERE tests.user_id = $1
      GROUP BY tests.id;
    `, [userId]);
    return result;
  }

  // Generates a test object using generative AI
  static async generateTest(data: GeneratedTest, userId: number) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Insert test
      const testResult = await client.query(
        `INSERT INTO tests (title, user_id) VALUES ($1, $2) RETURNING id`,
        [data.title, userId]
      );
      const testId = testResult.rows[0].id;

      for (const question of data.questions) {
        // Determine mcq_type
        const correctCount = question.options.filter(
          (opt: GeneratedOption) => opt.is_correct
        ).length;
        const mcqType = correctCount > 1 ? "multiple" : "single";

        // Insert question
        const questionResult = await client.query(
          `INSERT INTO questions (test_id, question_text, mcq_type, explanation_text)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [testId, question.question_text, mcqType, question.explanation]
        );
        const questionId = questionResult.rows[0].id;

        // Insert options
        for (const option of question.options) {
          await client.query(
            `INSERT INTO options (question_id, option_text, is_correct)
             VALUES ($1, $2, $3)`,
            [questionId, option.option_text, option.is_correct]
          );
        }
      }

      await client.query("COMMIT");
      return testId;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error creating test from JSON:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  // Delete a test by its ID
  static async deleteTest(testId: number) {
    const result = await db.query("DELETE FROM tests WHERE id = $1", [testId]);
  }
}
