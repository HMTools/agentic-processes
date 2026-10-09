// What the infra functions need from the mods API. The mod builds these from `$`, because
// a mod cannot pass `$` into a function from another file.

export type FileSystem = {
  home(): Promise<string | undefined>
  list(path: string): Promise<{ name: string; kind: string }[]>
  exists(path: string): Promise<boolean>
  read(path: string): Promise<string>
}

export type ListAgents = () => Promise<{ type: string; status: string }[]>
