"use client"

import { useRouter } from "next/navigation"
import { Command, LogOut, BadgeCheck, CreditCard, Bell, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

interface SiteHeaderProps {
  user: {
    name: string
    email: string
    avatar: string
  } | null
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/auth/signout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const initials = user ? getInitials(user.name || user.email.split("@")[0] || "U") : ""

  return (
    <header className="bg-[#171717] sticky top-0 z-50 flex w-full items-center">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="group inline-flex items-center gap-3 rounded-md px-2 py-1 transition-colors"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/5">
              <Command className="size-5" />
            </div>
            <div className="grid text-left leading-tight">
              <span className="truncate text-lg font-semibold tracking-tight">
                Build in Base
              </span>
              <span className="truncate text-sm text-muted-foreground">
                Workspace
              </span>
            </div>
          </a>
        </div>

        {user ? (
          /* ── Logged-in: token limit + user avatar dropdown ── */
          <div className="flex items-center gap-2">
            {/* Token limit badge */}
            <div className="flex items-center gap-2 rounded-full border border-border/40 bg-zinc-900 px-4 py-1.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800">
              <div className="flex size-5 items-center justify-center rounded-full border-2 border-white/80">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                  <path d="M5 19L19 5" />
                </svg>
              </div>
              <span>4.93</span>
            </div>

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="h-10 w-10 cursor-pointer border-0 ring-2 ring-transparent transition-all hover:ring-white/20">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback
                      className="bg-pink-500 text-transparent"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                        backgroundSize: '4px 4px'
                      }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-pink-500 rounded-lg text-xs text-transparent" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: '4px 4px' }}>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Sparkles className="mr-2 size-4" />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck className="mr-2 size-4" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 size-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="mr-2 size-4" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* ── Logged-out: navigation buttons ── */
          <div className="flex items-center gap-1">
            <Button variant="ghost">
              About
            </Button>
            <Button variant="ghost">
              Features
            </Button>
            <Button variant="ghost">
              Pricing
            </Button>
            <Button variant="ghost">
              Sign In
            </Button>
            <Link href="/login">
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                Get started for free
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

