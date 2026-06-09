import { GoogleGenerativeAI } from '@google/generative-ai';

// Read the developer API key from an environment variable to prevent committing it to GitHub.
// For local dev, put EXPO_PUBLIC_GEMINI_API_KEY=your_key in a .env file.
// For production builds, add it as a secret/env variable in EAS.
export const DEVELOPER_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

/**
 * Parses a schedule image using Google's Gemini API.
 * 
 * @param {string} base64Data The base64-encoded image data.
 * @param {string} mimeType The mime type of the image (e.g. 'image/jpeg').
 * @param {string} apiKey The user's Gemini API Key.
 * @returns {Promise<object>} The parsed schedule object.
 */
export async function parseScheduleImage(base64Data, mimeType, apiKey) {
  const activeKey = apiKey || DEVELOPER_API_KEY;
  if (!activeKey) {
    throw new Error("Gemini API key is required. Please set it in Settings or configure the developer key.");
  }

  const genAI = new GoogleGenerativeAI(activeKey);
  // Using gemini-2.5-flash which is fast, lightweight, and supports image input
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } // Force JSON output
  });

  const prompt = `
    Analyze this class schedule image and extract all classes into structured JSON.
    
    Structure the response exactly as follows:
    {
      "Monday": [
        { "id": "mon-1", "code": "ITS122P", "start": "7:00AM", "end": "10:30AM", "room": "BM12", "building": "MPO320" }
      ],
      "Tuesday": [],
      "Wednesday": [],
      "Thursday": [],
      "Friday": [],
      "Saturday": [],
      "Sunday": []
    }

    Rules:
    1. The JSON keys MUST be exactly: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday". If a day has no classes, keep its array empty [].
    2. Consolidate consecutive slots for the same class on the same day into a single block (e.g., if a class is listed twice from 7:00-8:30 and 8:30-10:00, merge them into 7:00AM-10:00AM).
    3. Ensure times are formatted exactly with AM/PM e.g., "8:00AM", "1:30PM".
    4. Set unique ids for each class (e.g., "mon-1", "mon-2", "tue-1", etc.).
    5. If room or building is not listed or unclear, set them to "TBA".
    6. Return ONLY the JSON object. Do not include markdown code block syntax.
  `;

  const response = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType || "image/jpeg"
      }
    }
  ]);

  const text = response.response.text();
  console.log("Raw response from Gemini:", text);
  
  // Parse and validate the response
  const parsed = JSON.parse(text.trim());
  return parsed;
}
