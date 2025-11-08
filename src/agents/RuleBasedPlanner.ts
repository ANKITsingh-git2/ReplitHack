export class RuleBasedPlanner {
  private tools: Record<string, any>;

  constructor(tools: Record<string, any>) {
    this.tools = tools;
  }

  createPlan(goal: string): { steps: Array<{ id: string; type: string; input: any }> } {
    const goalLower = goal.toLowerCase();
    const steps: Array<{ id: string; type: string; input: any }> = [];

    // Extract destination - works for ANY city worldwide
    let destination: string | null = null;
    
    // Try multiple patterns to extract destination
    const patterns = [
      /(?:trip|travel|go|visit|fly)\s+to\s+([a-zA-Z][\w\s\-]+?)(?:\s+(?:next|for|in|on|this|trip|travel|vacation|flight|hotel|,)|$)/i,
      /(?:in|at)\s+([a-zA-Z][\w\s\-]+?)(?:\s+(?:next|for|in|on|this|trip|travel|vacation|flight|hotel|,)|$)/i,
      /(?:^|\s)([A-Z][a-zA-Z\s\-]+?)\s+(?:trip|tour|vacation)/i,
    ];
    
    for (const pattern of patterns) {
      const match = goal.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        
        // Remove common noise words at the start
        const noiseWords = ['plan', 'a', 'an', 'the', 'my', 'our', 'for'];
        const words = extracted.split(' ');
        while (words.length > 0 && noiseWords.includes(words[0].toLowerCase())) {
          words.shift();
        }
        
        if (words.length > 0) {
          destination = words.join(' ');
          break;
        }
      }
    }
    
    // Capitalize destination properly
    if (destination) {
      destination = destination.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    } else {
      destination = "Paris"; // Default fallback
    }

    // Extract dates/timeframe
    const nextMonthMatch = goal.match(/next\s+month/i);
    const dateMatch = goal.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const daysMatch = goal.match(/(\d+)\s+(?:day|night|days|nights)/i);
    const nights = daysMatch ? parseInt(daysMatch[1]) : 2;

    // Travel planning logic
    if (goalLower.includes('trip') || goalLower.includes('travel') || goalLower.includes('vacation') || goalLower.includes('goa')) {
      // Search for flights
      if (this.tools['search_flights']) {
        steps.push({
          id: "1",
          type: "search_flights",
          input: {
            destination: destination || "Goa",
            dates: nextMonthMatch ? { from: "next_month", to: "next_month" } : (dateMatch ? { from: dateMatch[0], to: dateMatch[0] } : {})
          }
        });
      }

      // Search for hotels
      if (this.tools['search_hotels']) {
        steps.push({
          id: String(steps.length + 1),
          type: "search_hotels",
          input: {
            destination: destination || "Goa",
            nights: nights
          }
        });
      }

      // Check weather
      if (this.tools['check_weather']) {
        steps.push({
          id: String(steps.length + 1),
          type: "check_weather",
          input: {
            destination: destination || "Goa",
            days: 5
          }
        });
      }

      // Find nearby attractions
      if (this.tools['find_attractions']) {
        steps.push({
          id: String(steps.length + 1),
          type: "find_attractions",
          input: {
            destination: destination || "Goa",
            type: "all"
          }
        });
      }

      // Respond with results - let the frontend format the actual data
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've completed your comprehensive travel planning for ${destination || "Goa"}. I found the cheapest flights with booking links, best hotel rates, current weather conditions, and popular attractions nearby. Check the detailed results below!`
        }
      });
    } else if (goalLower.includes('flight')) {
      // Just flights
      if (this.tools['search_flights']) {
        steps.push({
          id: "1",
          type: "search_flights",
          input: {
            destination: destination || "Goa",
            dates: {}
          }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've found flight options for ${destination || "your destination"}.`
        }
      });
    } else if (goalLower.includes('hotel')) {
      // Just hotels
      if (this.tools['search_hotels']) {
        steps.push({
          id: "1",
          type: "search_hotels",
          input: {
            destination: destination || "Goa",
            nights: nights
          }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've found hotel options for ${destination || "your destination"}.`
        }
      });
    } else if (goalLower.includes('career') || goalLower.includes('job') || goalLower.includes('salary')) {
      // Career guidance
      if (this.tools['career_guidance']) {
        const careerMatch = goal.match(/(?:as|for|become|be)\s+([a-z\s]+)/i);
        const career = careerMatch ? careerMatch[1] : goalLower.includes('engineer') ? 'software engineer' : 'career';
        steps.push({
          id: "1",
          type: "career_guidance",
          input: { career: career.trim(), query: goal }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've prepared career guidance information for you.`
        }
      });
    } else if (goalLower.includes('explain') || goalLower.includes('learn') || goalLower.includes('study')) {
      // Study/explain
      const topicMatch = goal.match(/(?:explain|learn|study|about)\s+([a-z\s]+)/i);
      const topic = topicMatch ? topicMatch[1] : 'the topic';
      if (this.tools['explain_topic']) {
        steps.push({
          id: "1",
          type: "explain_topic",
          input: { topic: topic.trim() }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've prepared an explanation for you.`
        }
      });
    } else if (goalLower.includes('quiz') || goalLower.includes('test')) {
      // Quiz
      const topicMatch = goal.match(/(?:quiz|test)\s+(?:on|about)?\s*([a-z\s]+)/i);
      const topic = topicMatch ? topicMatch[1] : 'general knowledge';
      const numMatch = goal.match(/(\d+)\s*(?:questions?|qs?)/i);
      const numQuestions = numMatch ? parseInt(numMatch[1]) : 5;
      if (this.tools['create_quiz']) {
        steps.push({
          id: "1",
          type: "create_quiz",
          input: { topic: topic.trim(), numQuestions }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've created a quiz for you.`
        }
      });
    } else if (goalLower.includes('schedule') || goalLower.includes('plan') && goalLower.includes('study')) {
      // Study schedule
      const topicMatch = goal.match(/(?:schedule|plan)\s+(?:study\s+)?(?:for\s+)?([a-z\s]+)/i);
      const topic = topicMatch ? topicMatch[1] : 'studies';
      const durationMatch = goal.match(/(\d+)\s*(?:hour|hr|h)/i);
      const duration = durationMatch ? `${durationMatch[1]} hours` : '1 hour';
      if (this.tools['schedule_study']) {
        steps.push({
          id: "1",
          type: "schedule_study",
          input: { topic: topic.trim(), duration }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've created a study schedule for you.`
        }
      });
    } else if (goalLower.includes('automate') || goalLower.includes('task')) {
      // Task automation
      if (this.tools['automate_task']) {
        steps.push({
          id: "1",
          type: "automate_task",
          input: { task: goal, context: {} }
        });
      }
      steps.push({
        id: String(steps.length + 1),
        type: "respond",
        input: {
          text: `I've analyzed your task and created an automation plan.`
        }
      });
    } else {
      // Generic response
      steps.push({
        id: "1",
        type: "respond",
        input: {
          text: `I understand you want to: ${goal}. Let me help you with that.`
        }
      });
    }

    return { steps };
  }

}

