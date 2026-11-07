import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean
}

export function Button({
  pending = false,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} disabled={disabled || pending} {...props}>
      {children}
    </button>
  )
}
