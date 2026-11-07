export type StageActor = 'assignee' | 'author'

export type StageExit = {
  to: string
  actor: StageActor
  comment_required: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseStageExits(value: unknown): StageExit[] {
  if (!Array.isArray(value)) {
    return []
  }

  const exits: StageExit[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const { to, actor, comment_required: commentRequired } = item
    if (typeof to !== 'string' || (actor !== 'assignee' && actor !== 'author')) {
      continue
    }
    if (typeof commentRequired !== 'boolean') {
      continue
    }
    exits.push({ to, actor, comment_required: commentRequired })
  }
  return exits
}
