const dateTime = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatWhen(iso: string): string {
  return dateTime.format(new Date(iso))
}
