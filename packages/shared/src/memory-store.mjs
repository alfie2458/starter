export function createMemoryStore() {
  return { tasks: [], knowledge: [], exams: [], studyPlans: [], automations: [], automationRuns: [], agents: [], quota: [], providerCalls: [], gamification: [], achievements: [], corrections: [], events: [], audit: [], notifications: [], calendar: [] };
}

export function collection(store, name) {
  if (!store[name]) throw new Error(`Unknown collection: ${name}`);
  return store[name];
}
