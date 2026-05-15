import OpenAI from "openai";

function parseMaybeJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function createOpenAIClient(requiredFor) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(`OPENAI_API_KEY is required to run the ${requiredFor}.`);
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function callJson(client, prompt) {
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return only valid JSON. Be precise, evidence-based, and do not invent facts that are not present in the provided CV or job description."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const parsed = parseMaybeJson(completion.choices[0]?.message?.content || "");
  if (!parsed) {
    throw new Error("The AI response was not valid JSON.");
  }

  return parsed;
}
