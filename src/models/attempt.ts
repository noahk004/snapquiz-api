import db from "../db";

export interface AnswerSelections {
  [key: number]: number[];
}

interface TestAttempt {
  id: number;
  created_at: string;
  score: number;
}

export class AttemptModel {
  // This function handles test attempts. Pass in a map of questions to user answers and
  // add the question answers to the database accordingly.
  static async createAttempt(
    testId: number,
    userId: number,
    answers: AnswerSelections
  ) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Insert test attempt and get attempt ID
      const attemptRes = await client.query(
        `INSERT INTO test_attempts (test_id, user_id, score) VALUES ($1, $2, 0.00) RETURNING id`,
        [testId, userId]
      );
      const attemptId = attemptRes.rows[0].id;

      let totalScore = 0;
      let totalQuestions = 0;

      for (const [questionIdStr, selectedOptions] of Object.entries(answers)) {
        const questionId = parseInt(questionIdStr);
        totalQuestions++;

        // 2. Insert each selected option
        for (const optionId of selectedOptions) {
          await client.query(
            `INSERT INTO test_answers (attempt_id, question_id, selected_option_id) VALUES ($1, $2, $3)`,
            [attemptId, questionId, optionId]
          );
        }

        // 3. Get correct options and question type
        const correctOptionRes = await client.query(
          `SELECT o.id, q.mcq_type
                   FROM options o
                   JOIN questions q ON q.id = o.question_id
                   WHERE o.question_id = $1 AND o.is_correct = true`,
          [questionId]
        );
        const correctOptions = correctOptionRes.rows.map((row) => row.id);
        const mcqType = correctOptionRes.rows[0]?.mcq_type || "single";

        // 4. Score the question
        const selectedSet = new Set(selectedOptions);
        const correctSet = new Set(correctOptions);

        if (mcqType === "single") {
          const isCorrect =
            selectedOptions.length === 1 && correctSet.has(selectedOptions[0]);
          if (isCorrect) totalScore += 1;
        } else if (mcqType === "multiple") {
          const selectedCorrect = selectedOptions.filter((id: number) =>
            correctSet.has(id)
          ).length;
          const selectedIncorrect = selectedOptions.filter(
            (id: number) => !correctSet.has(id)
          ).length;

          const score = Math.max(
            selectedCorrect / correctSet.size -
              selectedIncorrect / (selectedOptions.length || 1),
            0
          );
          totalScore += score;
        }
      }

      // 5. Update score in test_attempts
      const normalizedScore = parseFloat(
        ((totalScore / totalQuestions) * 100).toFixed(2)
      );

      await client.query(`UPDATE test_attempts SET score = $1 WHERE id = $2`, [
        normalizedScore,
        attemptId,
      ]);

      await client.query("COMMIT");
      return { success: true, attemptId, score: normalizedScore };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error recording attempt:", err);
      return { success: false, error: err };
    } finally {
      client.release();
    }
  }

  // Get a test attempt
  static async getAttempt(attemptId: number) {
    const result = await db.query(
      `
      WITH
        selected AS (
          SELECT
            ta.attempt_id,
            ta.question_id,
            ta.selected_option_id
          FROM test_answers ta
          WHERE ta.attempt_id = $1
        ),
        correct AS (
          SELECT
            o.question_id,
            array_agg(o.id) AS correct_option_ids
          FROM options o
          WHERE o.is_correct = true
          GROUP BY o.question_id
        ),
        selected_per_question AS (
          SELECT
            question_id,
            array_agg(selected_option_id) AS selected_option_ids
          FROM selected
          GROUP BY question_id
        ),
        question_scores AS (
          SELECT
            q.id AS question_id,
            q.mcq_type,
            COALESCE(spq.selected_option_ids, '{}') AS selected_option_ids,
            c.correct_option_ids,
            CASE
              WHEN q.mcq_type = 'single' THEN
                CASE
                  WHEN array_length(spq.selected_option_ids, 1) = 1
                      AND spq.selected_option_ids[1] = ANY(c.correct_option_ids)
                  THEN 1
                  ELSE 0
                END
              WHEN q.mcq_type = 'multiple' THEN
                GREATEST(
                  (
                    SELECT COUNT(*) FROM unnest(spq.selected_option_ids) s
                    WHERE s = ANY(c.correct_option_ids)
                  )::decimal / GREATEST(array_length(c.correct_option_ids, 1), 1)
                  -
                  (
                    SELECT COUNT(*) FROM unnest(spq.selected_option_ids) s
                    WHERE s <> ALL(c.correct_option_ids)
                  )::decimal / GREATEST(array_length(spq.selected_option_ids, 1), 1),
                  0
                )
            END AS score
          FROM questions q
          LEFT JOIN selected_per_question spq ON spq.question_id = q.id
          LEFT JOIN correct c ON c.question_id = q.id
        )
        SELECT
          q.id AS question_id,
          q.question_text,
          q.mcq_type,
          q.explanation_text,
          o.id AS option_id,
          o.option_text,
          o.is_correct,
          COALESCE(s.selected_option_id, NULL) IS NOT NULL AS is_selected,
          qs.score
        FROM questions q
        JOIN options o ON o.question_id = q.id
        JOIN test_attempts a ON a.test_id = q.test_id
        LEFT JOIN selected s ON s.question_id = q.id AND s.selected_option_id = o.id AND s.attempt_id = a.id
        LEFT JOIN question_scores qs ON qs.question_id = q.id
        WHERE a.id = $1
        ORDER BY q.id, o.id;
    `,
      [attemptId]
    );

    const testMetaData = await db.query(
      `SELECT t.id, t.title, a.score, a.created_at FROM tests t JOIN test_attempts a ON t.id = a.test_id WHERE a.id = $1`,
      [attemptId]
    );

    console.log(testMetaData.rows[0]);

    const questionsMap = new Map();

    for (const row of result.rows) {
      const qid = row.question_id;

      if (!questionsMap.has(qid)) {
        questionsMap.set(qid, {
          questionId: qid,
          text: row.question_text,
          type: row.mcq_type,
          explanation: row.explanation_text,
          score: parseFloat(row.score), // might be repeated in every row, but same per question
          options: [],
        });
      }

      questionsMap.get(qid).options.push({
        id: row.option_id,
        text: row.option_text,
        isCorrect: row.is_correct,
        isSelected: row.is_selected,
      });
    }

    return {
      success: true,
      ...testMetaData.rows[0],
      questions: Array.from(questionsMap.values()),
    };
  }

  // Get all attempts for a specific test and user
  static async getTestAttempts(
    testId: number,
    userId: number
  ): Promise<TestAttempt[]> {
    const result = await db.query(
      `SELECT id, created_at, score 
       FROM test_attempts 
       WHERE test_id = $1 AND user_id = $2 
       ORDER BY created_at DESC`,
      [testId, userId]
    );

    return result.rows as TestAttempt[];
  }

  // Get test metadata (id, title, question count)
  static async getTestMeta(testId: number) {
    const result = await db.query(
      `SELECT t.id, t.title, COUNT(q.id) AS question_count
       FROM tests t
       LEFT JOIN questions q ON q.test_id = t.id
       WHERE t.id = $1
       GROUP BY t.id, t.title`,
      [testId]
    );
    return result.rows[0];
  }
}
