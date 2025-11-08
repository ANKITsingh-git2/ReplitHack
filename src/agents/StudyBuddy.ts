import { Agent } from "./Agent";

export class StudyBuddy extends Agent {
  // Study buddy helps with learning, quizzes, and scheduling
  async explainTopic(topic: string) {
    return this.handleGoal({
      text: `Explain the topic: ${topic}`,
      meta: { type: 'explain' }
    });
  }

  async createQuiz(topic: string, numQuestions: number = 5) {
    return this.handleGoal({
      text: `Create a quiz on ${topic} with ${numQuestions} questions`,
      meta: { type: 'quiz', numQuestions }
    });
  }

  async scheduleStudy(topic: string, duration: string) {
    return this.handleGoal({
      text: `Schedule a ${duration} study session for ${topic}`,
      meta: { type: 'schedule', duration }
    });
  }
}

