export function createMemoryStore() {
  return { tasks: [], knowledge: [], exams: [], studyPlans: [], automations: [], automationRuns: [], agents: [], members: [], quota: [], providerCalls: [], eventQueue: [], deadLetters: [], gamification: [], achievements: [], corrections: [], events: [], audit: [], notifications: [], calendar: [] };
}

export function collection(store, name) {
  if (!store[name]) throw new Error(`Unknown collection: ${name}`);
  return store[name];
}
