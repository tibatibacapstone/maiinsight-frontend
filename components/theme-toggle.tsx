"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: "icon" | "full"
  collapsed?: boolean
  className?: string
}

export function ThemeToggle({ variant = "icon", collapsed = false, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  if (variant === "full" && !collapsed) {
    return (
      <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-secondary", className)}>
        <button
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            theme === "light"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            theme === "dark"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </button>
        <button
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            theme === "system"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
        </button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-9 w-9 rounded-lg", className)}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 cursor-pointer">
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme === "light" && <span className="ml-auto text-xs text-primary font-medium">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 cursor-pointer">
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && <span className="ml-auto text-xs text-primary font-medium">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 cursor-pointer">
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === "system" && <span className="ml-auto text-xs text-primary font-medium">Active</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
