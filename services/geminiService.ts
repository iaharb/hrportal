
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client using the API key directly from environment variables as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      model: 'gemini-3-flash-preview',
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
          required: ["summary", "recommendations", "complianceStatus"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      summary: "Error generating AI insights. Please check API key configuration.",
      recommendations: ["Ensure your environment variables are set correctly."],
      complianceStatus: "Warning"
    };
  }
};
