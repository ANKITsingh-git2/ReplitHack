import OpenAI from "openai";
import axios from "axios";

export class LLMService {
  private openai?: OpenAI;
  private geminiApiKey?: string;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  async generatePlan(goal: string, tools: string, memoryContext?: string): Promise<any> {
    const prompt = `You are a planner AI that creates a sequence of steps to achieve a user's goal.
Based on the user's goal, create a plan using the available tools.
The final step should almost always be 'respond' to present the result to the user.

${memoryContext ? `Previous context:\n${memoryContext}\n\n` : ""}
Goal: "${goal}"

Available tools:
${tools}
- respond: Respond to the user with a final answer when the goal is complete or if no other tools are suitable. Input: { text: string }

Respond with a JSON object containing a 'steps' array. Each step should have an 'id', 'type', and 'input'.

Example:
Goal: "I want to book a trip to Goa for next month"
{
  "steps": [
    { "id": "1", "type": "search_flights", "input": { "destination": "Goa" } },
    { "id": "2", "type": "search_hotels", "input": { "destination": "Goa", "nights": 3 } },
    { "id": "3", "type": "respond", "input": { "text": "Here are your travel options..." } }
  ]
}`;

    // Try OpenAI first, fallback to Gemini
    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content || "";
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
      } catch (error) {
        console.error("OpenAI error:", error);
      }
    }

    // Fallback to Gemini
    if (this.geminiApiKey) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
          { contents: [{ parts: [{ text: prompt }] }] }
        );

        const jsonResponse = response.data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonResponse);
      } catch (error) {
        console.error("Gemini error:", error);
      }
    }

    // Ultimate fallback - return null to trigger rule-based planner
    return null;
  }

  async parseNaturalLanguage(text: string, schema: any): Promise<any> {
    const prompt = `Parse the following user input and extract structured data according to this schema:
${JSON.stringify(schema, null, 2)}

User input: "${text}"

Return only valid JSON matching the schema.`;

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error("OpenAI parsing error:", error);
      }
    }

    return {};
  }
}

