import type { Register } from 'claude-code'
import { findAgenticProcessDir, hasAgenticProcessInstance } from '../infra/agentic-process-repository/agentic-process-repository'
import { PROCESS_TOOLS, TOOL_PREFIX, ensureProcessTools, runTool } from '../infra/process-manager/tools'
import { bindSession } from '../infra/process-manager/bind-session'
import { moveCommands, slash } from '../infra/process-manager/move'
import type { FileSystem, ManagerPorts } from '../infra/ports/ports'

// The process tools: the agent changes process files with them, not with shell commands. The tools are listed when
// the user starts or resumes a process (`/process-new`, `/process-continue`) or when a session already has one.

const SKILLS = ['process-new', 'process-continue']
const COMMANDS = SKILLS.flatMap(name => [name, `agentic-processes:${name}`])

const filesOf = ($: any): FileSystem => ({
  home: async () => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')), // Windows has no HOME in every shell
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})
const portsOf = ($: any): ManagerPorts => ({
  files: filesOf($),
  write: (path, text) => $.fs.write(path, text),
  move: async (from, to) => {
    // The mods file API cannot move a folder: run the platform's own command. Windows sets OS=Windows_NT in every shell.
    const windows = (await $.env.get('OS')) === 'Windows_NT'
    for (const argv of moveCommands(windows, from, to)) {
      const run = await $.process.run(argv)
      if (run.exitCode !== 0) throw new Error(`${argv[0]} failed: ${(run.stderr || run.stdout).trim()}`)
    }
  },
  now: () => new Date().toISOString(),
  uuid: () => crypto.randomUUID(),
  pluginRoot: slash($.plugin.root),
  cwd: () => $.session.cwd(),
  sessionId: () => $.session.id(),
})
const registerOf = ($: any) => (spec: Parameters<typeof $.tool.register>[0]) => $.tool.register(spec)

export const register: Register = on => {
  // A session that already has a process lists the tools at once.
  on('session.start', async ($, e, next) => {
    if (hasAgenticProcessInstance(await findAgenticProcessDir(filesOf($), await $.session.id()))) {
      await ensureProcessTools(registerOf($), await $.session.id())
    }
    return next(e)
  })

  // The user starts or resumes a process.
  on('command.run', { command: COMMANDS }, async ($, e, next) => {
    await ensureProcessTools(registerOf($), await $.session.id())
    return next(e)
  })

  on('tool.call', { tool: PROCESS_TOOLS.map(t => `${TOOL_PREFIX}${t.name}`) }, async ($, e) => {
    const name = e.tool.slice(TOOL_PREFIX.length)
    const args = e as any // the arguments of an MCP tool call sit on e itself
    const ports = portsOf($)
    const result = await runTool(ports, name, args)
    if (name === 'create_process' && result.status === 'ok') await bindSession(ports, args.processDir)
    const isError = result.status === 'error'
    return { result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError }, ...(isError ? { isError: true } : {}) } as never
  })
}
