"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  label,
  error,
  disabled,
  className
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-primary border-transparent bg-white shadow-sm"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 text-primary")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-0.5">
            {options.length === 0 ? (
               <div className="px-3 py-4 text-sm text-muted-foreground text-center italic">No options available</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 pl-3 pr-9 text-sm outline-none transition-colors",
                    option.value === value 
                      ? "bg-primary/10 text-primary font-semibold" 
                      : "text-foreground hover:bg-muted/80"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && (
                    <span className="absolute inset-y-0 right-3 flex items-center">
                      <Check className="h-4 w-4 text-primary" />
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  )
}
