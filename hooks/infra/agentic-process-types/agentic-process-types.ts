// The shape of an agentic-processes `process.json`, as far as the hooks read it.

export type StepView = { name?: string; operationIds?: string[]; mockData?: Record<string, Record<string, unknown>> }
export type Step = { id?: string; number?: number | string; name?: string; status?: string; approvalRequired?: boolean; view?: StepView }
export type AgenticProcess = { status?: string; steps?: Step[] }
