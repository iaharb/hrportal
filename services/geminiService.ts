
import { GoogleGenAI, Type } from "@google/genai";

// Initialize using the mandated environment variable pattern
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
      summary: "Registry intelligence is currently processing or offline. Please verify API_KEY in deployment settings.",
      recommendations: ["Check Vercel project environment variables for API_KEY."],
      complianceStatus: "Warning"
    };
  }
};

/**
 * Handles specialized HR Ops tasks using the expert persona.
 */
export const runAdminTask = async (taskType: string, payload: any) => {
  let prompt = "";
  
  switch (taskType) {
    case 'CONFLICT_RESOLUTION':
      prompt = `I have two conflicting records for Employee ID ${payload.id}. 
      Source A shows: ${JSON.stringify(payload.sourceA)} 
      Source B shows: ${JSON.stringify(payload.sourceB)}
      Analyze the audit context and recommend the correct 'Source of Truth' based on Standard HR Data Policy.`;
      break;
    case 'BULK_VALIDATION':
      prompt = `Review these employee records: ${JSON.stringify(payload.records)}. 
      Identify any logical inconsistencies, such as termination dates occurring before hire dates, salary figures outside expected ranges, or overlapping leave periods.`;
      break;
    case 'SLACK_DRAFT':
      prompt = `Draft a short, professional Slack message to notify the ${payload.team} team that their ${payload.subject} have been updated. Include a placeholder for the FAQ link.`;
      break;
    case 'SQL_SCHEMA':
      prompt = `Write a SQL schema for an HR audit table that tracks: changed_field, old_value, new_value, updated_by, and timestamp.`;
      break;
    case 'VALIDATION_LOGIC':
      prompt = `Write a Python function to validate HR data imports. It should flag records with missing Mandatory Fields (Name, Civil ID, Nationality) and ensure Date Formats are consistent (YYYY-MM-DD).`;
      break;
    default:
      prompt = `Assist with this HR Operations request: ${payload.customPrompt}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
