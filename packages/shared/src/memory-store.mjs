export function createMemoryStore() {
  return { tasks: [], knowledge: [], exams: [], studyPlans: [], automations: [], agents: [], quota: [], gamification: [], events: [], notifications: [], calendar: [] };
}

export function collection(store, name) {
  if (!store[name]) throw new Error(`Unknown collection: ${name}`);
  return store[name];
}
