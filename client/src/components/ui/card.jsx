import { cn } from "./utils"

export const Card = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}
