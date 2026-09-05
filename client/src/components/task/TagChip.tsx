import { cn } from '../../lib/cn'

export function TagChip({
  tag,
  count,
  active = false,
  onClick,
}: {
  tag: string
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="opacity-60">#</span>
      {tag}
      {count !== undefined && <span className="ml-1 opacity-60 tabular-nums">{count}</span>}
    </>
  )

  const className = cn(
    'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors',
    active ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted',
    onClick && !active && 'hover:text-text',
  )

  if (!onClick) return <span className={className}>{content}</span>

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {content}
    </button>
  )
}
