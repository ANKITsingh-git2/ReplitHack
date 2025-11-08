// Enhanced Agentverse UI with all hackathon features
const API_BASE = window.location.origin;

let currentUser = null;
let currentAgent = null;
let agents = [];
let wsConnection = null;
let currentTab = 'chat';
let analytics = null;
let templates = [];
let scenarios = [];

// Auth state
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

// API calls
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    render();
    return null;
  }

  return response.json();
}

// Auth
async function login(email, password) {
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result && result.token) {
    setToken(result.token);
    currentUser = result.user;
    await loadAgents();
    render();
    return true;
  }
  return false;
}

async function register(email, password) {
  const result = await apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result && result.token) {
    setToken(result.token);
    currentUser = result.user;
    await loadAgents();
    render();
    return true;
  }
  return false;
}

// Agents
async function loadAgents() {
  const result = await apiCall('/api/agents');
  if (result) {
    agents = result.agents || [];
    if (agents.length > 0 && !currentAgent) {
      currentAgent = agents[0].id;
    }
  }
}

async function createAgent(name, type = 'travel_planner') {
  const result = await apiCall('/api/agents', {
    method: 'POST',
    body: JSON.stringify({ name, type, config: {} }),
  });

  if (result) {
    await loadAgents();
    currentAgent = result.id;
    render();
  }
}

// Goals
async function submitGoal(text, simulate = false) {
  if (!currentAgent) {
    alert('Please select or create an agent first');
    return;
  }

  addMessage('user', text);
  
  const result = await apiCall(`/api/agents/${currentAgent}/goal`, {
    method: 'POST',
    body: JSON.stringify({ text, simulate }),
  });

  if (result) {
    addMessage('agent', formatGoalResult(result));
    updateTimeline(result);
    await loadAgents();
  }
}

function formatGoalResult(result) {
  if (result.error) {
    return `❌ Error: ${result.error}`;
  }

  let message = '';
  let flights = null;
  let hotels = null;
  let weather = null;
  let places = null;
  let finalResponse = null;

  // Extract actual data from trace results
  let careerGuidance = null;
  let explanation = null;
  let quiz = null;
  let schedule = null;
  let automation = null;
  let webContent = null;

  if (result.trace) {
    result.trace.forEach((t, i) => {
      const step = result.plan?.steps?.[i];
      if (!step) return;

      if (step.type === 'search_flights' && t.res?.flights) {
        flights = t.res.flights;
      } else if (step.type === 'search_hotels' && t.res?.hotels) {
        hotels = t.res.hotels;
      } else if (step.type === 'check_weather' && t.res?.forecast) {
        weather = t.res;
      } else if (step.type === 'find_attractions' && t.res?.places) {
        places = t.res;
      } else if (step.type === 'career_guidance' && t.res?.guidance) {
        careerGuidance = t.res;
      } else if (step.type === 'explain_topic' && t.res?.explanation) {
        explanation = t.res;
      } else if (step.type === 'create_quiz' && t.res?.quiz) {
        quiz = t.res;
      } else if (step.type === 'schedule_study' && t.res?.schedule) {
        schedule = t.res;
      } else if (step.type === 'automate_task' && t.res?.automation) {
        automation = t.res;
      } else if ((step.type === 'web_scraper' || step.type === 'web_scraping') && t.res?.content) {
        webContent = t.res;
      } else if (step.type === 'respond' && t.res?.text) {
        finalResponse = t.res.text;
      }
    });
  }

  // Build natural language response based on agent type
  if (careerGuidance) {
    message += `🎯 **Career Guidance for ${careerGuidance.career || 'Your Career'}**\n\n`;
    const g = careerGuidance.guidance;
    message += `**💼 Career Path:**\n${g.careerPath}\n\n`;
    message += `**💰 Salary Range:** ${g.salaryRange}\n\n`;
    message += `**🛠️ Key Skills Required:**\n`;
    g.skills.forEach((skill, idx) => {
      message += `${idx + 1}. ${skill}\n`;
    });
    message += `\n**🏢 Top Companies:** ${g.topCompanies.join(', ')}\n\n`;
    message += `**📜 Recommended Certifications:**\n`;
    g.certifications.forEach((cert, idx) => {
      message += `${idx + 1}. ${cert}\n`;
    });
    message += `\n**💡 Tips for Success:**\n`;
    g.tips.forEach((tip, idx) => {
      message += `${idx + 1}. ${tip}\n`;
    });
  } else if (explanation) {
    message += `📚 **Explanation: ${explanation.topic}**\n\n`;
    message += `${explanation.explanation}\n\n`;
    message += `**🔑 Key Concepts:**\n`;
    explanation.keyConcepts.forEach((concept, idx) => {
      message += `${idx + 1}. ${concept}\n`;
    });
    message += `\n**💻 Examples:**\n`;
    explanation.examples.forEach((ex, idx) => {
      message += `${idx + 1}. ${ex}\n`;
    });
    message += `\n**📖 Study Tips:**\n`;
    explanation.studyTips.forEach((tip, idx) => {
      message += `${idx + 1}. ${tip}\n`;
    });
  } else if (quiz) {
    message += `📝 **Quiz: ${quiz.topic}**\n\n`;
    message += `Total Questions: ${quiz.quiz.totalQuestions}\n`;
    message += `Estimated Time: ${quiz.quiz.estimatedTime}\n\n`;
    quiz.quiz.questions.forEach((q, idx) => {
      message += `**Question ${idx + 1}:** ${q.question}\n`;
      q.options.forEach((opt, optIdx) => {
        const marker = optIdx === q.correctAnswer ? '✅' : '  ';
        message += `${marker} ${String.fromCharCode(65 + optIdx)}. ${opt}\n`;
      });
      message += `\n`;
    });
    message += `💡 Review the correct answers (marked with ✅) to reinforce your learning!`;
  } else if (schedule) {
    message += `📅 **Study Schedule: ${schedule.topic}**\n\n`;
    message += `Start Date: ${schedule.schedule.startDate}\n`;
    message += `Duration per session: ${schedule.schedule.duration}\n`;
    message += `Total Sessions: ${schedule.schedule.totalSessions}\n\n`;
    message += `**📋 Schedule:**\n\n`;
    schedule.schedule.sessions.forEach((session, idx) => {
      message += `${session.day} - ${session.time}\n`;
      message += `   📚 ${session.activity}\n`;
      message += `   Topic: ${session.topic}\n\n`;
    });
    message += `**⏰ Reminders:**\n`;
    schedule.schedule.reminders.forEach((reminder, idx) => {
      message += `${idx + 1}. ${reminder}\n`;
    });
  } else if (automation) {
    message += `🤖 **Task Automation Plan**\n\n`;
    message += `**Task:** ${automation.task}\n\n`;
    message += `**Type:** ${automation.automation.type}\n`;
    message += `**Estimated Time:** ${automation.automation.time}\n\n`;
    message += `**Reasoning:** ${automation.automation.reasoning}\n\n`;
    message += `**Automation Steps:**\n`;
    automation.automation.steps.forEach((step, idx) => {
      message += `${idx + 1}. ${step}\n`;
    });
    message += `\n${automation.result}`;
  } else if (webContent) {
    message += `🌐 **Web Content Retrieved**\n\n`;
    message += `**URL:** ${webContent.url || 'N/A'}\n\n`;
    message += `**Content Preview:**\n${webContent.content?.substring(0, 500) || 'No content extracted'}...\n\n`;
    if (webContent.content && webContent.content.length > 500) {
      message += `\n(Content truncated. Full content available in memory.)`;
    }
  } else if (flights || hotels || weather || places) {
    message += `✈️ **Your Travel Plan is Ready!**\n\n`;
    
    if (flights && flights.length > 0) {
      message += `**🛫 Flight Options:**\n\n`;
      flights.forEach((flight, idx) => {
        message += `${idx + 1}. **${flight.airline || 'Flight'}** - ${flight.id}\n`;
        message += `   🛫 ${flight.from} → ${flight.to}\n`;
        message += `   📅 Date: ${flight.depart}\n`;
        if (flight.departTime && flight.arriveTime) {
          message += `   ⏰ Time: ${flight.departTime} - ${flight.arriveTime} (${flight.duration || 'N/A'})\n`;
        }
        message += `   💺 Class: ${flight.class || 'Economy'}\n`;
        message += `   💰 Price: ₹${(flight.priceINR || flight.price).toLocaleString()}\n`;
        if (flight.bookingUrl) {
          message += `   🔗 [Book Now](${flight.bookingUrl})\n`;
        }
        if (flight.seats) {
          message += `   ${flight.seats === 'Available' ? '✅' : '⚠️'} ${flight.seats}\n`;
        }
        message += `\n`;
      });
    }

    if (hotels && hotels.length > 0) {
      message += `**🏨 Hotel Options:**\n\n`;
      hotels.forEach((hotel, idx) => {
        const pricePerNightINR = hotel.pricePerNightINR || hotel.pricePerNight;
        const totalPriceINR = hotel.totalPriceINR || hotel.totalPrice || (pricePerNightINR * hotel.nights);
        message += `${idx + 1}. **${hotel.name}** ${hotel.rating ? `⭐ ${hotel.rating}` : ''}\n`;
        message += `   📍 ${hotel.location || hotel.destination}\n`;
        message += `   🌙 ${hotel.nights} night${hotel.nights > 1 ? 's' : ''}\n`;
        if (hotel.amenities && hotel.amenities.length > 0) {
          message += `   ✨ ${hotel.amenities.join(', ')}\n`;
        }
        message += `   💰 ₹${pricePerNightINR.toLocaleString()}/night → Total: ₹${totalPriceINR.toLocaleString()}\n`;
        if (hotel.bookingUrl) {
          message += `   🔗 [Book Now](${hotel.bookingUrl})\n`;
        }
        if (hotel.availability) {
          message += `   ${hotel.availability === 'Available' ? '✅' : '⚠️'} ${hotel.availability}\n`;
        }
        message += `\n`;
      });
    }

    if (weather && weather.forecast && weather.forecast.length > 0) {
      message += `**🌤️ Weather Forecast for ${weather.location || weather.destination}:**\n\n`;
      if (weather.current) {
        message += `📍 Current: ${weather.current.temp}°C, ${weather.current.condition}\n`;
        message += `   Feels like: ${weather.current.feelsLike}°C | Humidity: ${weather.current.humidity}%\n\n`;
      }
      message += `**5-Day Forecast:**\n`;
      weather.forecast.forEach((day, idx) => {
        const dayEmoji = day.condition.toLowerCase().includes('rain') ? '🌧️' : 
                        day.condition.toLowerCase().includes('cloud') ? '☁️' : 
                        day.condition.toLowerCase().includes('sun') ? '☀️' : '🌤️';
        message += `${dayEmoji} **${day.date}** - ${day.condition}\n`;
        message += `   🌡️ High: ${day.tempMax || day.high}°C | Low: ${day.tempMin || day.low}°C\n`;
        if (day.humidity) {
          message += `   💧 Humidity: ${day.humidity}%\n`;
        }
        message += `\n`;
      });
    }

    if (places && places.places && places.places.length > 0) {
      message += `**📍 Places to Visit in ${places.destination}:**\n\n`;
      places.places.forEach((place, idx) => {
        const categoryEmoji = place.category === 'beach' ? '🏖️' : 
                             place.category === 'historical' ? '🏛️' : 
                             place.category === 'nature' ? '🌳' : 
                             place.category === 'religious' ? '🛕' : '📍';
        message += `${idx + 1}. ${categoryEmoji} **${place.name}**\n`;
        if (place.rating) {
          message += `   ⭐ Rating: ${place.rating}/5\n`;
        }
        if (place.description) {
          message += `   📝 ${place.description}\n`;
        }
        if (place.distance) {
          message += `   📏 ${place.distance}\n`;
        }
        message += `\n`;
      });
    }

    // Calculate total trip cost
    if (flights && hotels) {
      const cheapestFlight = Math.min(...flights.map(f => f.price));
      const cheapestHotel = Math.min(...hotels.map(h => h.totalPrice || (h.pricePerNight * h.nights)));
      const totalCost = cheapestFlight + cheapestHotel;
      message += `💰 **Estimated Total Trip Cost:** ₹${totalCost.toLocaleString()}\n`;
      message += `   (Based on cheapest flight + hotel combination)\n\n`;
    }

    message += `✅ **Summary:** I found ${flights?.length || 0} flight(s), ${hotels?.length || 0} hotel(s)`;
    if (weather) message += `, weather forecast`;
    if (places) message += `, and ${places.places?.length || 0} attractions`;
    message += ` for you.\n\n`;
    message += `💡 **Next Steps:** Would you like me to:\n`;
    message += `   • Help you choose the best option?\n`;
    message += `   • Find more options?\n`;
    message += `   • Modify your search criteria?`;
  } else if (finalResponse) {
    message = finalResponse;
  } else {
    // Fallback to showing what was done
    message = `✅ I've completed your request!\n\n`;
    if (result.plan?.steps) {
      result.plan.steps.forEach((step, i) => {
        const trace = result.trace?.[i];
        if (trace?.res?.error) {
          message += `❌ ${step.type} failed: ${trace.res.error}\n`;
        } else if (trace?.res?.ok) {
          message += `✅ ${step.type} completed\n`;
        }
      });
    }
  }

  return message;
}

// UI State
const state = {
  view: getToken() ? 'main' : 'login',
  messages: [],
  timeline: [],
  error: null,
};

// Rendering
function addMessage(sender, text) {
  state.messages.push({ sender, text, timestamp: Date.now() });
  render();
  scrollMessages();
}

function updateTimeline(result) {
  state.timeline.unshift({
    goalId: result.goalId,
    status: result.status,
    plan: result.plan,
    trace: result.trace,
    timestamp: Date.now(),
  });
  render();
}

function scrollMessages() {
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

function render() {
  const root = document.getElementById('root');
  if (!root) return;

  if (!getToken()) {
    root.innerHTML = renderLogin();
    return;
  }

  root.innerHTML = renderMain();
  attachEventListeners();
}

function renderLogin() {
  return `
    <div class="container">
      <div class="auth-section">
        <h2>Agentverse</h2>
        <div id="auth-error"></div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="login-email" placeholder="admin@agentverse.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-password" placeholder="admin123" />
        </div>
        <button class="btn btn-primary" onclick="handleLogin()" style="width: 100%; margin-bottom: 10px;">Login</button>
        <button class="btn btn-secondary" onclick="showRegister()" style="width: 100%;">Register</button>
      </div>
    </div>
  `;
}

function renderMain() {
  return `
    <div class="container">
      <div class="header">
        <h1>🤖 Agentverse - Autonomous AI Agents</h1>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span>Logged in as: <strong>${currentUser?.email || 'User'}</strong></span>
            ${currentAgent ? `<span style="margin-left: 20px;">Agent: <strong>${agents.find(a => a.id === currentAgent)?.name || currentAgent}</strong></span>` : ''}
          </div>
          <button class="btn btn-secondary" onclick="handleLogout()">Logout</button>
        </div>
      </div>

      <div class="nav-tabs">
        <button class="nav-tab ${currentTab === 'chat' ? 'active' : ''}" onclick="switchTab('chat')">💬 Chat</button>
        <button class="nav-tab ${currentTab === 'marketplace' ? 'active' : ''}" onclick="switchTab('marketplace')">🛒 Marketplace</button>
        <button class="nav-tab ${currentTab === 'demo' ? 'active' : ''}" onclick="switchTab('demo')">🎬 Demo</button>
        <button class="nav-tab ${currentTab === 'analytics' ? 'active' : ''}" onclick="switchTab('analytics')">📊 Analytics</button>
      </div>

      ${renderTabContent()}
    </div>
  `;
}

function renderTabContent() {
  if (currentTab === 'marketplace') {
    return renderMarketplace();
  } else if (currentTab === 'demo') {
    return renderDemo();
  } else if (currentTab === 'analytics') {
    return renderAnalytics();
  } else {
    return renderChat();
  }
}

function renderMarketplace() {
  return `
    <div class="card">
      <h3>Agent Templates</h3>
      <p style="color: #666; margin-bottom: 20px;">Choose a template to create a new agent instantly</p>
      <div class="template-grid">
        ${templates.map(template => `
          <div class="template-card" onclick="createAgentFromTemplate('${template.id}')">
            <div class="icon">${template.icon}</div>
            <h4>${template.name}</h4>
            <p style="color: #666; font-size: 14px; margin: 10px 0;">${template.description}</p>
            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="event.stopPropagation(); createAgentFromTemplate('${template.id}')">Create Agent</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDemo() {
  return `
    <div class="card">
      <h3>Demo Scenarios</h3>
      <p style="color: #666; margin-bottom: 20px;">Try these pre-configured scenarios to see Agentverse in action</p>
      ${scenarios.map(scenario => `
        <div class="demo-scenario" onclick="runDemoScenario('${scenario.id}')">
          <h4>${scenario.name}</h4>
          <p style="color: #666; margin: 5px 0;">${scenario.description}</p>
          <button class="btn btn-primary" style="margin-top: 10px;" onclick="event.stopPropagation(); runDemoScenario('${scenario.id}')">Run Demo</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAnalytics() {
  if (!analytics) {
    return `<div class="loading"><div class="spinner"></div><p>Loading analytics...</p></div>`;
  }
  return `
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Total Agents</h4>
        <div class="value">${analytics.totalAgents || 0}</div>
      </div>
      <div class="stat-card">
        <h4>Total Goals</h4>
        <div class="value">${analytics.totalGoals || 0}</div>
      </div>
      <div class="stat-card">
        <h4>Success Rate</h4>
        <div class="value">${analytics.successRate || 0}%</div>
      </div>
      <div class="stat-card">
        <h4>Completed</h4>
        <div class="value">${analytics.completedGoals || 0}</div>
      </div>
    </div>
    <div class="card">
      <h3>Agent Performance</h3>
      ${analytics.agentStats && analytics.agentStats.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 10px; text-align: left;">Agent</th>
              <th style="padding: 10px; text-align: left;">Goals</th>
              <th style="padding: 10px; text-align: left;">Completed</th>
              <th style="padding: 10px; text-align: left;">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.agentStats.map(stat => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">${stat.agentName}</td>
                <td style="padding: 10px;">${stat.totalGoals}</td>
                <td style="padding: 10px;">${stat.completed}</td>
                <td style="padding: 10px;">
                  <span style="background: ${stat.successRate > 80 ? '#d1fae5' : stat.successRate > 50 ? '#fef3c7' : '#fee2e2'}; 
                    color: ${stat.successRate > 80 ? '#065f46' : stat.successRate > 50 ? '#92400e' : '#991b1b'}; 
                    padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${stat.successRate}%
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color: #666;">No agent statistics yet. Create agents and submit goals to see analytics.</p>'}
    </div>
  `;
}

function renderChat() {
  return `

      <div class="main-content">
        <div class="sidebar">
          <h3>Agents</h3>
          <button class="btn btn-primary" onclick="showCreateAgent()" style="width: 100%; margin-bottom: 15px;">+ New Agent</button>
          <ul class="agent-list" id="agent-list">
            ${agents.map(agent => `
              <li class="${agent.id === currentAgent ? 'active' : ''}" onclick="selectAgent('${agent.id}')">
                ${agent.name} (${agent.type})
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
            ${state.messages.map(msg => `
              <div class="message ${msg.sender}">
                <strong>${msg.sender === 'user' ? 'You' : 'Agent'}:</strong>
                <pre style="white-space: pre-wrap; margin-top: 5px;">${msg.text}</pre>
              </div>
            `).join('')}
          </div>
          <div class="chat-input">
            <input type="text" id="goal-input" placeholder="Enter your goal (e.g., 'Plan a trip to Goa for next month')" />
            <button class="btn btn-primary" onclick="handleSubmitGoal()">Send</button>
            <button class="btn btn-secondary" onclick="handleSubmitGoal(true)">Simulate</button>
          </div>
        </div>

        <div class="timeline">
          <h3>Timeline</h3>
          ${state.timeline.length === 0 ? '<p style="color: #999;">No goals yet</p>' : ''}
          ${state.timeline.map(item => `
            <div class="timeline-item">
              <h4>Goal ${item.goalId?.substring(0, 8)}</h4>
              <span class="status-badge status-${item.status}">${item.status}</span>
              <div class="plan-steps">
                ${item.plan?.steps?.map((step, i) => {
                  const trace = item.trace?.[i];
                  const stepStatus = trace?.res?.error ? 'failed' : (trace ? 'completed' : 'pending');
                  return `<div class="plan-step ${stepStatus}">${step.type}</div>`;
                }).join('') || ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
  `;
}

// Event handlers
window.handleLogin = async function() {
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;
  
  if (!email || !password) {
    showError('Please enter email and password');
    return;
  }

  const success = await login(email, password);
  if (!success) {
    showError('Login failed. Try: admin@agentverse.com / admin123');
  }
};

window.showRegister = function() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="container">
      <div class="auth-section">
        <h2>Register</h2>
        <div id="auth-error"></div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="register-email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="register-password" />
        </div>
        <button class="btn btn-primary" onclick="handleRegister()" style="width: 100%; margin-bottom: 10px;">Register</button>
        <button class="btn btn-secondary" onclick="render()" style="width: 100%;">Back to Login</button>
      </div>
    </div>
  `;
};

window.handleRegister = async function() {
  const email = document.getElementById('register-email')?.value;
  const password = document.getElementById('register-password')?.value;
  
  if (!email || !password) {
    showError('Please enter email and password');
    return;
  }

  const success = await register(email, password);
  if (!success) {
    showError('Registration failed');
  }
};

window.handleLogout = function() {
  clearToken();
  currentUser = null;
  currentAgent = null;
  agents = [];
  state.messages = [];
  state.timeline = [];
  render();
};

window.selectAgent = function(agentId) {
  currentAgent = agentId;
  state.messages = [];
  render();
};

window.showCreateAgent = async function() {
  const name = prompt('Enter agent name:');
  if (name) {
    await createAgent(name);
  }
};

window.handleSubmitGoal = function(simulate = false) {
  const input = document.getElementById('goal-input');
  const text = input?.value?.trim();
  if (text) {
    submitGoal(text, simulate);
    input.value = '';
  }
};

function attachEventListeners() {
  const input = document.getElementById('goal-input');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSubmitGoal();
      }
    });
  }
}

function showError(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.innerHTML = `<div class="error">${message}</div>`;
  }
}

// New features
async function loadAnalytics() {
  const result = await apiCall('/api/analytics');
  if (result) {
    analytics = result;
  }
}

async function loadTemplates() {
  const result = await apiCall('/api/marketplace/templates');
  if (result) {
    templates = result.templates || [];
  }
}

async function loadScenarios() {
  const result = await apiCall('/api/demo/scenarios');
  if (result) {
    scenarios = result.scenarios || [];
  }
}

window.createAgentFromTemplate = async function(templateId) {
  const result = await apiCall(`/api/marketplace/templates/${templateId}/create`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (result) {
    await loadAgents();
    currentAgent = result.agent.id;
    currentTab = 'chat';
    render();
  }
};

window.runDemoScenario = async function(scenarioId) {
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario || !currentAgent) {
    alert('Please select an agent first');
    return;
  }
  currentTab = 'chat';
  render();
  await submitGoal(scenario.goal, false);
};

window.switchTab = function(tab) {
  currentTab = tab;
  if (tab === 'analytics') {
    loadAnalytics();
  } else if (tab === 'marketplace') {
    loadTemplates();
  } else if (tab === 'demo') {
    loadScenarios();
  }
  render();
};

// Initialize
async function init() {
  const token = getToken();
  if (token) {
    const userResult = await apiCall('/api/user/profile');
    if (userResult) {
      currentUser = userResult;
      await loadAgents();
      await loadTemplates();
      await loadScenarios();
    } else {
      clearToken();
    }
  }
  render();
}

init();

