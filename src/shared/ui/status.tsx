import type { ReactNode } from 'react'

export function Loading() {
  return <p role="status">Загрузка…</p>
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="error" role="alert">
      {children}
    </p>
  )
}
