export class KnowledgeProvider {
  constructor({ name = 'unconfigured', version = '0.0.0' } = {}) { this.name = name; this.version = version; }
  async extract() { throw new Error('KNOWLEDGE_PROVIDER_NOT_CONFIGURED'); }
}

export function createCandidatePublisher(provider) {
  return {
    async draft(input) {
      if (!provider || typeof provider.extract !== 'function') throw new Error('INVALID_KNOWLEDGE_PROVIDER');
      const result = await provider.extract(input);
      return { ...result, publisher: { kind: 'ai-candidate', version: provider.version, confidence: result.confidence ?? 0 } };
    }
  };
}
