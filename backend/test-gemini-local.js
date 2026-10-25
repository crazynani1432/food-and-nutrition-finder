require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key found in .env");
  process.exit(1);
}

const aiClient = new GoogleGenAI({ apiKey });

async function run() {
  console.log("Checking Gemini connection with key:", apiKey.substring(0, 6) + "...");
  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Respond with exactly "Gemini API Key is valid and working!"',
    });
    console.log("Status: SUCCESS!");
    console.log("Model Response:", response.text.trim());
    process.exit(0);
  } catch (err) {
    console.error("API call failed:", err.message);
    process.exit(1);
  }
}

run();
