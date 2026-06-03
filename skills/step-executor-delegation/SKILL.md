---
name: step-executor-delegation
description: Execute a process step by delegating to the step-executor subagent. Use when a process step needs to be executed. Provide the process directory and step ID as arguments. Optionally pass user corrections as a third argument for re-execution.
context: fork
agent: agentic-processes:step-executor
arguments: [process-dir, step-id, corrections]
user-invocable: false
---

Execute the step identified below.

## Process Metadata
- Process directory: $process-dir
- Step ID: $step-id

## Instructions

1. Read `process.json` from the process directory
2. Locate your step by matching the step ID against `steps[].id`
3. Read your `stepDefinition` from that step entry — this is your SOLE source of execution instructions
4. Read `memory.json` from the process directory for context from prior steps
5. Read process `parameters` from `process.json` for process-level context
6. Execute according to the stepDefinition's guidance, substeps, and flow
7. Update process state via the `process-state-update` skill

If the stepDefinition is empty, use the step name and process parameters to determine what to do.

## User Corrections
$corrections

If corrections are provided above, this is a re-execution after the user reviewed deliverables. Read the step's current state from process.json and memory.json to understand what was done previously, then apply the corrections. Do not redo the entire step — only address the corrections.
