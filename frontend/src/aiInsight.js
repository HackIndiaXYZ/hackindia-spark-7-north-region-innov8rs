import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function fallbackInsight(result) {
  if (!result) return "";

  return result.prediction === 1
    ? "The model has flagged a higher-risk pattern based on the provided inputs. This does not confirm PCOD/PCOS, but it may be useful to consult a healthcare professional."
    : "The model has not flagged a major risk pattern from the current inputs. Continue monitoring symptoms and consult a professional if concerns persist.";
}

function buildPrompt({ result, form }) {
  return `
You are writing a short explanation for a women's health awareness app.

Important rules:
- Do NOT diagnose PCOD or PCOS.
- Do NOT provide medicine or treatment advice.
- Explain the model output in simple, calm, supportive language.
- Keep it short and user-friendly.

Model output:
Prediction label: ${result.label}
Probability: ${result.percentage}%
Threshold: ${result.threshold}
Risk flag: ${result.prediction === 1 ? "Risk flagged" : "No major risk flag"}

User inputs:
Age: ${form["Age (yrs)"]}
Cycle length: ${form["Cycle length(days)"]}
Weight gain: ${form["Weight gain(Y/N)"] ? "Yes" : "No"}
Excess hair growth: ${form["hair growth(Y/N)"] ? "Yes" : "No"}
Skin darkening: ${form["Skin darkening (Y/N)"] ? "Yes" : "No"}
Acne/Pimples: ${form["Pimples(Y/N)"] ? "Yes" : "No"}
Fast food: ${form["Fast food (Y/N)"] ? "Yes" : "No"}
Regular exercise: ${form["Reg.Exercise(Y/N)"] ? "Yes" : "No"}

Write 3 sentences:
1. Explain what the result means.
2. Mention the most relevant visible lifestyle/symptom signals.
3. Encourage professional consultation if symptoms continue.
`;
}

export async function generateAIInsight({ result, form }) {
  if (!ai) return fallbackInsight(result);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPrompt({ result, form }),
    });

    return response.text || fallbackInsight(result);
  } catch (error) {
    console.error("Gemini failed:", error);
    return fallbackInsight(result);
  }
}