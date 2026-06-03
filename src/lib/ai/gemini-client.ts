import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

export function createGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

/**
 * Extract valid JSON from AI response text.
 * Handles markdown fences, leading/trailing text, and truncated responses.
 */
function cleanJson(text: string): string {
  // Strip markdown code fences anywhere in the text
  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // Find the outermost JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned;
}

/**
 * Send a PDF (base64) + text prompt to Gemini and get JSON back.
 */
export async function geminiPdfToJson(
  base64: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const model = createGeminiModel();

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: `${systemPrompt}\n\n${userPrompt}` },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  const cleaned = cleanJson(text);

  // Validate it's parseable JSON
  try {
    JSON.parse(cleaned);
  } catch {
    console.error("Gemini JSON parse failed. Raw (first 500 chars):", text.slice(0, 500));
    throw new Error("AI 응답 JSON 파싱 실패 — 다시 시도해주세요");
  }

  return cleaned;
}
