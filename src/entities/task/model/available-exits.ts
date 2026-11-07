import { parseStageExits, type Stage, type StageExit, type Task } from '@/shared/api/index.ts'

export function availableExits(
  stage: Stage | undefined,
  userId: string,
  task: Pick<Task, 'assignee_id' | 'author_id'>,
): StageExit[] {
  if (!stage) {
    return []
  }
  return parseStageExits(stage.exits).filter((exit) =>
    exit.actor === 'assignee' ? userId === task.assignee_id : userId === task.author_id,
  )
}
