/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - STATE MANAGEMENT
 * ============================================================================
 */

class Store {
  constructor() {
    this.state = {
      user: null,
      profile: null,
      isLoading: true,
      activeTest: null,
      activeAttempt: null,
      activeAnswers: {}, // questionId -> { selected_option_id, is_marked_for_review }
      activeQuestionIndex: 0,
      visitedQuestions: new Set(),
      timerRemainingSeconds: 0,
    };
    this.subscribers = new Map();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...partialState };

    // Notify subscribers for changed keys
    Object.keys(partialState).forEach((key) => {
      if (this.subscribers.has(key)) {
        this.subscribers.get(key).forEach((cb) => cb(this.state[key], prevState[key]));
      }
    });

    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach((cb) => cb(this.state, prevState));
    }
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      if (this.subscribers.has(key)) {
        this.subscribers.get(key).delete(callback);
      }
    };
  }

  isAdmin() {
    return this.state.profile && this.state.profile.role === 'admin';
  }

  isStudent() {
    return this.state.profile && this.state.profile.role === 'student';
  }

  isAuthenticated() {
    return !!this.state.user && !!this.state.profile;
  }

  resetExamState() {
    this.setState({
      activeTest: null,
      activeAttempt: null,
      activeAnswers: {},
      activeQuestionIndex: 0,
      visitedQuestions: new Set(),
      timerRemainingSeconds: 0,
    });
  }
}

export const store = new Store();
