// Read the developer OpenRouter API key from an environment variable.
// For local dev, put EXPO_PUBLIC_OPENROUTER_API_KEY=your_key in a .env file.
export const DEVELOPER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";

/**
 * Parses a schedule image using OpenRouter's free vision model.
 * 
 * @param {string} base64Data The base64-encoded image data.
 * @param {string} mimeType The mime type of the image (e.g. 'image/jpeg').
 * @param {string} apiKey The user's OpenRouter API Key (optional).
 * @returns {Promise<object>} The parsed schedule object.
 */
export async function parseScheduleImage(base64Data, mimeType, apiKey) {
  const activeKey = apiKey || DEVELOPER_API_KEY;
  if (!activeKey) {
    throw new Error("OpenRouter API key is required. Please set EXPO_PUBLIC_OPENROUTER_API_KEY in your .env file.");
  }

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
    6. Return ONLY the JSON object.
  `;

  // Format mime type and base64 for image URL
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64Data}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${activeKey}`,
      "HTTP-Referer": "https://github.com/FrosOfficial/Kackoo",
      "X-Title": "Kackoo"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const text = result.choices[0].message.content;
  console.log("Raw response from OpenRouter:", text);
  
  // Parse and validate the response
  const parsed = JSON.parse(text.trim());
  return parsed;
}
