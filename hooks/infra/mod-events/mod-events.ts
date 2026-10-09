export const isMainAgentAnswer = (e: { agentId?: string; reason?: string }) => !e.agentId && e.reason === 'answer'
export const isPromptFromPlugin = (e: { origin?: { kind?: string } }) => e.origin?.kind === 'plugin'
