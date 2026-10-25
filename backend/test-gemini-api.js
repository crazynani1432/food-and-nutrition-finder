require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testWithImage() {
  // Create a minimal valid 1x1 red JPEG
  // Using a base64 encoded tiny red JPEG
  const tinyJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFkiN0E3UGRSDkJLSEQ9Jjc4TkRFQUVIUnH/2gAMAwEAAhEDEQA/AJ6KKKwAooooA//Z';
  
  const imageBuffer = Buffer.from(tinyJpegBase64, 'base64');
  
  console.log('Test 1: Direct API call with text prompt...');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Say "API working" in exactly 2 words'
    });
    console.log('Result:', response.text);
  } catch (e) {
    console.log('Error:', e.status, e.message);
  }

  console.log('\nTest 2: API call with image + JSON mode...');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: tinyJpegBase64,
            mimeType: 'image/jpeg'
          }
        },
        'What do you see in this image? Return as JSON: {"description": "string"}'
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log('Result:', response.text);
  } catch (e) {
    console.log('Error:', e.status, e.message);
  }

  console.log('\nTest 3: Using analyzePlateImage function from gemini service...');
  try {
    const { analyzePlateImage } = require('./src/services/gemini');
    const result = await analyzePlateImage(imageBuffer, 'image/jpeg');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testWithImage();
