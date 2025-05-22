export async function callOpenAI(content: string, questionCount: number = 5) {
  if (questionCount < 3 || questionCount > 30) {
    throw new Error("Number of questions must be between 3 and 30");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      store: false,
      messages: [
        {
          role: "system",
          content: `You are an expert educator and test designer. I will give you a learning document, and you will create a test title and a set of multiple-choice questions based on its content. Whenever you are given any text, you are to generate ${questionCount} high-quality multiple-choice questions based on the key concepts and facts in the document.\n2. Each question should have:\n   - The question text\n   - Four answer choices\n   - One or more correct answers (indicate which are correct)\n   - A detailed explanation of the correct answer(s)\n3. Format your response as JSON with the following structure:\n\n{\n  "title": "string"\n  "questions": [\n    {\n      "question_text": "string",\n      "options": [\n        { "option_text": "string", "is_correct": true/false },\n        ...\n      ],\n      "explanation": "string"\n    },\n    ...\n  ]\n}`,
        },
        {
          role: "user",
          content: `Generate a test for the text delimited by three quotation marks:\n"""${content}\n"""`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `OpenAI API error: ${response.status} ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
