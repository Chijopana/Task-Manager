import * as React from "react"
import { cn } from "./utils"

export const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40",
        className
      )}
      {...props}
    />
  )
})
Input.displayName = "Input"
