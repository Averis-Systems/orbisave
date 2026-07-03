import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#0a2540]/5 before:absolute before:inset-0 before:-translate-x-full before:animate-[orbisave-skeleton-wave_1.2s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent dark:bg-white/10 dark:before:via-white/10",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
