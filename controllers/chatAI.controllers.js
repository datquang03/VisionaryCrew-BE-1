// controllers/chatController.js
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const askChatGPT = async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Missing question in request body" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: question }],
      max_tokens: 150,
    });

    const answer = response.choices[0].message.content;

    // Optional: Lưu log nếu muốn
    // saveChatLog(question, answer);

    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
