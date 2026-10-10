// The shape of an agentic-processes `process.json`, as far as the hooks read it.

export type StepView = { name?: string; operationIds?: string[]; mockData?: Record<string, Record<string, unknown>> }
export type Step = {
  id?: string; number?: number | string; name?: string; status?: string; approvalRequired?: boolean; approved?: boolean; view?: StepView
  stepDefinition?: { output?: { description?: string; artifacts?: string[] } }
}
export type AgenticProcess = { status?: string; steps?: Step[]; currentState?: { activeStep?: { id?: string } }; metadata?: { lastUpdated?: string } }
