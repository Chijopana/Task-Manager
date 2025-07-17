import { cn } from "./utils"

export const Card = ({ className, ...props }) => {
  return (
    <div
      className={cn("rounded-lg border bg-white p-4 shadow-sm", className)}
      {...props}
    />
  )
}
