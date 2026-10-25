const { GoogleGenAI } = require('@google/genai');

// Ensure client runs only if API Key is supplied
const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
} else {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not defined. AI analysis endpoints will run in demo/offline mode.');
}

/**
 * Helper to strip markdown formatting and parse JSON safely
 */
function cleanAndParseJSON(text) {
  if (!text) return null;
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate content with model fallback and fast retry logic
 */
async function generateWithFallback(contents, config = {}) {
  // Ultra-fast, high-accuracy vision models in optimal order of latency & capability
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest'
  ];
  const MAX_RETRIES = 2;
  let lastError = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Gemini Service] Running vision analysis on ${model} (attempt ${attempt}/${MAX_RETRIES})...`);
        const response = await aiClient.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1, // low temperature for consistent, accurate extraction
            ...config
          }
        });
        if (response && response.text) {
          console.log(`[Gemini Service] Model ${model} succeeded on attempt ${attempt}.`);
          return cleanAndParseJSON(response.text);
        }
      } catch (err) {
        const status = err.status || err.code;
        lastError = err;
        console.warn(`[Gemini Service] Model ${model} attempt ${attempt} notice: ${err.message}`);

        // Fast retry only on transient rate limit / overload
        if ([503, 429].includes(status) && attempt < MAX_RETRIES) {
          await sleep(500);
          continue;
        }

        // On any non-transient error, immediately try next model without waiting
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}

/**
 * Sends a plate food image to Gemini VLM to identify items, confidence, and visual weights.
 * 
 * @param {Buffer} imageBuffer - Client uploaded image buffer
 * @param {string} mimeType - Image file MIME type (e.g. image/jpeg, image/png)
 * @returns {Promise<object>} Parsed VLM analysis containing food items
 */
async function analyzePlateImage(imageBuffer, mimeType) {
  if (!aiClient) {
    throw new Error('Gemini AI client is uninitialized. Verify GEMINI_API_KEY environment variable.');
  }

  const prompt = `
    You are an expert nutritionist and computer vision system. 
    Analyze this food plate image. Identify every distinct food item visible on the plate.
    If no food item is found, return an empty array in "detected_items".
    For each item:
    1. Detect its name (use standard culinary terms like White Rice, Chapati, Dal Tadka, Paneer Butter Masala, Mixed Salad, etc.).
    2. Estimate its realistic portion weight in grams based on plate proportions.
    3. Output your estimation confidence score between 0.0 and 1.0.
    4. Estimate nutritional values PER 100g for this food item (calories in kcal, protein in grams, carbohydrates in grams, fat in grams, fiber in grams, sodium in milligrams).

    Return ONLY raw JSON matching this exact JSON schema:
    {
      "detected_items": [
        {
          "food_name": "string",
          "estimated_weight_grams": number,
          "confidence": number,
          "calories_per_100g": number,
          "protein_per_100g": number,
          "carbs_per_100g": number,
          "fat_per_100g": number,
          "fiber_per_100g": number,
          "sodium_per_100g": number
        }
      ]
    }
  `;

  try {
    const base64Data = imageBuffer.toString('base64');
    const contents = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/jpeg'
        }
      },
      prompt
    ];

    const parsed = await generateWithFallback(contents);

    // Normalize output structure
    if (Array.isArray(parsed)) {
      return { detected_items: parsed };
    }
    if (parsed && Array.isArray(parsed.detected_items)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.items)) {
      return { detected_items: parsed.items };
    }

    return { detected_items: [] };
  } catch (error) {
    console.error('Gemini Plate Analysis API Error:', error);
    throw new Error(`AI Plate Analysis failed: ${error.message}`);
  }
}

/**
 * OCR parses a cropped nutrition label image and converts details into structured JSON.
 * 
 * @param {Buffer} imageBuffer - OCR label image buffer
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<object>} Parsed nutritional layout mapping db columns
 */
async function parseNutritionLabel(imageBuffer, mimeType) {
  if (!aiClient) {
    throw new Error('Gemini AI client is uninitialized. Verify GEMINI_API_KEY environment variable.');
  }

  const prompt = `
    Analyze this cropped nutrition facts label. Extract the nutrient values per 100g or 100ml.
    If the values are given per serving, recalculate them to represent the amount per 100g/ml using the serving size.
    Ensure you capture:
    - Calories
    - Protein (grams)
    - Carbohydrates (grams)
    - Fat (grams)
    - Fiber (grams)
    - Sodium (milligrams)

    Return a raw JSON object matching this exact format (all numbers):
    {
      "caloriesPer100g": number,
      "proteinPer100g": number,
      "carbsPer100g": number,
      "fatPer100g": number,
      "fiberPer100g": number,
      "sodiumPer100g": number
    }
  `;

  try {
    const base64Data = imageBuffer.toString('base64');
    const contents = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/jpeg'
        }
      },
      prompt
    ];

    const parsed = await generateWithFallback(contents);
    return parsed;
  } catch (error) {
    console.error('Gemini Label OCR API Error:', error);
    throw new Error(`AI Label OCR failed: ${error.message}`);
  }
}

module.exports = {
  analyzePlateImage,
  parseNutritionLabel
};
