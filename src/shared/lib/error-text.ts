const phrases: Record<string, string> = {
  stage_conflict: 'Стадия уже изменилась. Обновите карточку.',
  transition_forbidden: 'Этот переход сейчас недоступен.',
  comment_required: 'Нужен комментарий.',
  task_not_found: 'Задача не найдена.',
  'Invalid login credentials': 'Неверный email или пароль.',
}

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string') {
      return message
    }
  }
  return 'Неизвестная ошибка'
}

export function errorText(error: unknown): string {
  const message = messageOf(error)
  for (const [code, phrase] of Object.entries(phrases)) {
    if (message.includes(code)) {
      return phrase
    }
  }
  return message
}
