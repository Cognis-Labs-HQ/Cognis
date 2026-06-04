export interface CommandContext {
  args: string[]
  apiBaseUrl: string
  getApiToken: () => Promise<string>
}

export interface CommandExecutionOptions {
  apiBaseUrl: string
  getApiToken: () => Promise<string>
}

export type CommandHandler = (ctx: CommandContext) => Promise<unknown>
export type CommandRenderer = (payload: unknown) => string

export interface CommandSpec {
  name: string
  usage: string
  description: string
  section: string
  handler: CommandHandler
  render?: CommandRenderer
}

export interface RegisterCommandOptions {
  usage?: string
  description?: string
  section?: string
  render?: CommandRenderer
}
