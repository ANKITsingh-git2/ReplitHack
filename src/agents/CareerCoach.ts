import { Agent } from "./Agent";

export class CareerCoach extends Agent {
  // Career coach specializes in career guidance
  async provideGuidance(topic: string) {
    // This can be extended with career-specific logic
    return this.handleGoal({
      text: `Provide career guidance on: ${topic}`,
      meta: { type: 'career_guidance' }
    });
  }
}

