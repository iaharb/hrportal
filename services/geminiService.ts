import { GoogleGenAI, Type } from "@google/genai";

/* Added comment above fix */
/* Fix: Initializing GoogleGenAI with API key from process.env.API_KEY directly as per mandatory guidelines and to resolve TypeScript 'ImportMeta' errors */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ADMIN_SYSTEM_INSTRUCTION = `You are an expert HR Operations Admin Assistant. Your primary mission is to ensure data integrity, record accuracy, and compliance within the HR portal. Always prioritize GDPR and data privacy. Before suggesting any data modification, verify if an audit trail is required. If data is ambiguous, ask clarifying questions rather than guessing. You communicate professionally and concisely.`;

export const getKuwaitizationInsights = async (employeeData: string) => {
  const prompt = `
    Analyze the following employee data in the context of Kuwait's nationalization (Kuwaitization) policy.
    The goal is to increase Kuwaiti national participation in the private sector.
    
    Data:
    ${employeeData}
    
    Provide a JSON response with:
    1. A summary of current standing.
    2. Recommendations for improvement (training, hiring, retention).
    3. Compliance risk assessment.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            complianceStatus: { type: Type.STRING, description: 'Must be Compliant, Warning, or Non-Compliant' }
          },
          required: ["summary", "recommendations", "complianceStatus"],
          propertyOrdering: ["summary", "recommendations", "complianceStatus"]
        }
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      summary: "Intelligence engine is currently offline or the API key is missing from your local .env file.",
      recommendations: ["Ensure API_KEY is provided in the Docker build args.", "Verify Supabase connectivity for data analysis."],
      complianceStatus: "Warning"
    };
  }
};

export const runAdminTask = async (taskType: string, payload: any) => {
  let prompt = "";
  
  switch (taskType) {
    case 'CONFLICT_RESOLUTION':
      prompt = `I have two conflicting records for Employee ID ${payload.id}. Source A shows: ${JSON.stringify(payload.sourceA)} Source B shows: ${JSON.stringify(payload.sourceB)}. Recommend truth based on policy.`;
      break;
    default:
      prompt = `Assist with this HR Operations request: ${payload.customPrompt}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: ADMIN_SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Admin Task Error:", error);
    return "The system assistant encountered an error while processing the compliance audit.";
  }
};