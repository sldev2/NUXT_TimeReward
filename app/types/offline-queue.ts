export type CommandType =
  | 'START_ACTIVITY'
  | 'STOP_ACTIVITY'
  | 'AUTO_PAUSE_ACTIVITY'

export interface QueuedCommand {
  id: string
  type: CommandType
  payload: Record<string, unknown>
  queuedAt: number
  retryCount: number
}
