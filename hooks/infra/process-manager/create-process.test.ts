import { test, expect } from 'claude-code/testing'
import { createProcess } from './create-process'
import { world } from './fake-world'

const T = '/t/tpl'
const NEW = '/h/.claude/agentic-processes/active/new1'
const template = {
  name: 'Fix a bug', id: 'tid', category: 'dev',
  steps: [
    { name: 'Design', stepRef: 'ref1', stepRefName: 'design', approvalRequired: true, viewRef: 'view1' },
    { name: 'Build', stepRef: 'ref2', loopBackTo: 'x', maxIterations: 3 },
    { name: 'Orchestrator', stepRef: '' },
  ],
}
const files = () => ({
  [`${T}/template.json`]: template,
  [`${T}/design/design.json`]: { type: 'step', id: 'ref1', output: { description: 'the design' }, substeps: [{}, {}], memoryFileUsage: { writeTo: ['context.json'] }, ignored: 'x' },
  [`${T}/build/build.json`]: { type: 'step', id: 'ref2', guidance: { g: 1 }, workflow: 'w' },
  [`${T}/views/view1/view1.json`]: { type: 'view', id: 'view1', name: 'V', htmlFile: 'v.html', operationIds: ['approve'], mockData: {} },
  [`${T}/views/view1/v.html`]: '<b>hi</b>',
  '/plugin/framework-steps/improve/improve.json': { type: 'framework-step', id: 'fw1', metadata: { title: 'Improve' }, approvalRequired: false, output: { description: 'findings' } },
  '/plugin/framework-steps/notes/notes.json': { type: 'other' },
})
const create = (w: ReturnType<typeof world>, extra = {}) => createProcess(w.ports, { processDir: NEW, templatePath: `${T}/template.json`, ...extra })

test('creates the three files', async () => {
  const w = world(files())
  expect(await create(w, { params: { id: '7' }, projectPath: '/proj' })).toEqual({ status: 'ok', files_written: ['process.json', 'memory/_cross-references.json', 'log.json'] })
  const process = w.json(`${NEW}/process.json`)
  expect(process).toMatchObject({ type: 'process-instance', name: 'Fix a bug', status: 'running', parameters: { id: '7' } })
  expect(process.metadata).toMatchObject({ template: 'Fix a bug', templateId: 'tid', templateCategory: 'dev', projectPaths: ['/proj'], processPath: NEW })
  expect(w.json(`${NEW}/memory/_cross-references.json`).type).toBe('memory-cross-references')
  expect(w.json(`${NEW}/log.json`).executionMetrics).toEqual({ totalSteps: 4, stepsCompleted: 0, currentStep: process.steps[0].id })
})
test('each template step gets its definition from the step file, and unknown fields stay out', async () => {
  const w = world(files())
  await create(w)
  const [design, build, orchestrator] = w.json(`${NEW}/process.json`).steps
  expect(design).toMatchObject({ number: 0, name: 'Design', status: 'pending', stepRef: 'ref1', stepRefName: 'design', approvalRequired: true })
  expect(design.stepDefinition).toEqual({ output: { description: 'the design' }, substeps: [{}, {}], memoryFileUsage: { writeTo: ['context.json'] } })
  expect(build).toMatchObject({ loopBackTo: 'x', maxIterations: 3 })
  expect(build.stepDefinition).toEqual({ guidance: { g: 1 }, workflow: 'w' })
  expect(orchestrator.stepDefinition).toEqual({})
})
test('a view is embedded with its html', async () => {
  const w = world(files())
  await create(w)
  expect(w.json(`${NEW}/process.json`).steps[0].view).toEqual({ id: 'view1', name: 'V', htmlFile: 'v.html', operationIds: ['approve'], mockData: {}, html: '<b>hi</b>' })
})
test('framework steps go at the end, and only the ones of the right type', async () => {
  const w = world(files())
  await create(w)
  const steps = w.json(`${NEW}/process.json`).steps
  expect(steps.length).toBe(4)
  expect(steps[3]).toMatchObject({ number: 3, name: 'Improve', stepRef: 'fw1', stepRefName: 'improve', approvalRequired: false })
})
test('the active step is the first step, and the project path defaults to the session folder', async () => {
  const w = world(files())
  await create(w)
  const process = w.json(`${NEW}/process.json`)
  expect(process.currentState.activeStep).toMatchObject({ id: process.steps[0].id, name: 'Design', totalSubsteps: 2, actionSummary: 'Initializing process' })
  expect(process.metadata.projectPaths).toEqual(['/work'])
})
test('a name given wins over the template name', async () => {
  const w = world(files())
  await create(w, { name: 'My run' })
  expect(w.json(`${NEW}/process.json`).name).toBe('My run')
})
test('a sub-process: the parent is read from its file when no id and name are given', async () => {
  const w = world({ ...files(), '/parent/process.json': { id: 'pid', name: 'Parent' } })
  await create(w, { parentProcessPath: '/parent', returnToStep: 'ps2' })
  expect(w.json(`${NEW}/process.json`).subProcessState).toEqual({ parentProcess: { id: 'pid', name: 'Parent', processPath: '/parent', returnToStep: 'ps2' }, childProcesses: [] })
  expect(w.json(`${NEW}/log.json`).metadata.parentProcessPath).toBe('/parent')
})
test('errors: process exists, template missing, step id not found, view not found, html missing', async () => {
  const w = world({ ...files(), [`${NEW}/process.json`]: '{}' })
  await expect(create(w)).rejects.toThrow('Process already exists')
  await expect(createProcess(world(files()).ports, { processDir: NEW, templatePath: '/nope.json' })).rejects.toThrow('Template not found')
  const noStep = files(); delete (noStep as any)[`${T}/build/build.json`]
  await expect(create(world(noStep))).rejects.toThrow('Step definition UUID not found in template directory: ref2')
  const noView = files(); delete (noView as any)[`${T}/views/view1/view1.json`]
  await expect(create(world(noView))).rejects.toThrow("View UUID not found in template's views/ folder: view1")
  const noHtml = files(); delete (noHtml as any)[`${T}/views/view1/v.html`]
  await expect(create(world(noHtml))).rejects.toThrow('does not exist')
})
