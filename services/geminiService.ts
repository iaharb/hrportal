
/**
 * Local AI Integration:
 * Replaces Google Gemini with a local Ollama instance.
 * Endpoint: http://localhost:11434/api/generate
 */

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const TEXT_MODEL = 'llama3';

const ADMIN_SYSTEM_INSTRUCTION = `You are an expert HR Operations Admin Assistant. Your primary mission is to ensure data integrity, record accuracy, and compliance within the HR portal. Always prioritize GDPR and data privacy. Before suggesting any data modification, verify if an audit trail is required. If data is ambiguous, ask clarifying questions rather than guessing. You communicate professionally and concisely.`;

async function callOllama(prompt: string, options: { system?: string; json?: boolean } = {}) {
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEXT_MODEL,
        prompt: options.system ? `${options.system}\n\n${prompt}` : prompt,
        stream: false,
        format: options.json ? 'json' : undefined
      })
    });

    if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Local AI Sync Error:", error);
    return null;
  }
}

export const getKuwaitizationInsights = async (employeeData: string) => {
  const prompt = `
    Analyze the following employee data in the context of Kuwait's nationalization (Kuwaitization) policy.
    The goal is to increase Kuwaiti national participation in the private sector.
    
    Data:
    ${employeeData}
    
    Return a JSON object with:
    1. "summary": A string summary of current standing.
    2. "recommendations": An array of improvement strings.
    3. "complianceStatus": "Compliant", "Warning", or "Non-Compliant".
  `;

  const result = await callOllama(prompt, { json: true });
  
  if (!result) {
    return {
      summary: "Local AI (Ollama) is currently unreachable. Ensure 'ollama run llama3' is configured.",
      recommendations: ["Start local Ollama server."],
      complianceStatus: "Warning"
    };
  }

  try {
    return JSON.parse(result);
  } catch (e) {
    console.error("JSON Parse Error from Ollama:", e);
    return {
      summary: "Registry intelligence encountered a parsing error.",
      recommendations: ["Check model output formatting."],
      complianceStatus: "Warning"
    };
  }
};

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
      Identify any logical inconsistencies.`;
      break;
    case 'SLACK_DRAFT':
      prompt = `Draft a short, professional Slack message to notify the ${payload.team} team that their ${payload.subject} have been updated.`;
      break;
    default:
      prompt = `Assist with this HR Operations request: ${payload.customPrompt}`;
  }

  const result = await callOllama(prompt, { system: ADMIN_SYSTEM_INSTRUCTION });
  return result || "Local AI services are currently processing or offline.";
};
