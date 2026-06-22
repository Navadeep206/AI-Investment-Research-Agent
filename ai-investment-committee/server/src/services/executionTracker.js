class ExecutionTracker {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Initializes a session tracking block with default PENDING statuses.
   */
  initializeSession(sessionId) {
    if (this.sessions.has(sessionId)) return;

    this.sessions.set(sessionId, {
      createdAt: Date.now(),
      agents: [
        { agentName: "Research Agent", status: "PENDING", startedAt: null, completedAt: null, durationMs: 0, summary: "" },
        { agentName: "Scoring Agent", status: "PENDING", startedAt: null, completedAt: null, durationMs: 0, summary: "" },
        { agentName: "Devil Advocate Agent", status: "PENDING", startedAt: null, completedAt: null, durationMs: 0, summary: "" },
        { agentName: "Committee Agent", status: "PENDING", startedAt: null, completedAt: null, durationMs: 0, summary: "" }
      ]
    });

    // Cleanup sessions older than 30 minutes to prevent memory leaks
    this.cleanupOldSessions();
  }

  /**
   * Sets agent status to RUNNING and records start time.
   */
  startAgent(sessionId, agentName) {
    if (!this.sessions.has(sessionId)) {
      this.initializeSession(sessionId);
    }
    const session = this.sessions.get(sessionId);
    const agent = session.agents.find(a => a.agentName === agentName);
    if (agent) {
      agent.status = "RUNNING";
      agent.startedAt = Date.now();
    }
  }

  /**
   * Sets agent status to COMPLETED and calculates exact duration.
   */
  completeAgent(sessionId, agentName, summary = "") {
    if (!this.sessions.has(sessionId)) return;
    const session = this.sessions.get(sessionId);
    const agent = session.agents.find(a => a.agentName === agentName);
    if (agent) {
      agent.status = "COMPLETED";
      agent.completedAt = Date.now();
      agent.durationMs = agent.startedAt ? (agent.completedAt - agent.startedAt) : 0;
      agent.summary = summary;
    }
  }

  /**
   * Sets agent status to FAILED and records error message.
   */
  failAgent(sessionId, agentName, errorMsg = "") {
    if (!this.sessions.has(sessionId)) return;
    const session = this.sessions.get(sessionId);
    const agent = session.agents.find(a => a.agentName === agentName);
    if (agent) {
      agent.status = "FAILED";
      agent.completedAt = Date.now();
      agent.durationMs = agent.startedAt ? (agent.completedAt - agent.startedAt) : 0;
      agent.summary = errorMsg || "Agent execution failed.";
    }
  }

  /**
   * Resolves raw session object and computes ticking durations in real-time.
   */
  getExecutionState(sessionId) {
    if (!this.sessions.has(sessionId)) {
      return {
        agents: [
          { agentName: "Research Agent", status: "PENDING", durationMs: 0, summary: "" },
          { agentName: "Scoring Agent", status: "PENDING", durationMs: 0, summary: "" },
          { agentName: "Devil Advocate Agent", status: "PENDING", durationMs: 0, summary: "" },
          { agentName: "Committee Agent", status: "PENDING", durationMs: 0, summary: "" }
        ]
      };
    }

    const session = this.sessions.get(sessionId);
    return {
      agents: session.agents.map(a => {
        let duration = a.durationMs;
        if (a.status === "RUNNING" && a.startedAt) {
          duration = Date.now() - a.startedAt;
        }
        return {
          agentName: a.agentName,
          status: a.status,
          durationMs: duration,
          summary: a.summary
        };
      })
    };
  }

  /**
   * Purges tracking blocks older than 30 minutes.
   */
  cleanupOldSessions() {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [key, val] of this.sessions.entries()) {
      if (val.createdAt < cutoff) {
        this.sessions.delete(key);
      }
    }
  }
}

export default new ExecutionTracker();
