"use client"

import { useRouter } from "next/navigation"
import { Command, LogOut, BadgeCheck, CreditCard, Bell, Sparkles, Zap } from "lucide-react"
import { RainbowButton } from "@/components/ui/rainbow-button"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
    <header className="bg-[#0A0A0A] sticky top-0 z-50 flex w-full items-center border-b border-[#2E2F2F]">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-2 pl-4 pr-2">
        <SidebarTrigger />
        {user ? (
          /* ── Logged-in: token limit + user avatar dropdown ── */
          <div className="flex items-center gap-4">
            {/* Rainbow upgrade button */}
            <RainbowButton variant="outline">
              Upgrade
            </RainbowButton>



            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center rounded-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="h-8 w-8 cursor-pointer rounded-lg border-0 ring-2 ring-transparent transition-all hover:ring-white/20">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback
                      className="bg-pink-500 rounded-lg text-transparent"
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
              <DropdownMenuContent className="w-56 rounded-lg bg-[#1C1B1B] border-[#2E2F2F] text-white" align="end" sideOffset={8}>
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
                <DropdownMenuSeparator className="bg-[#2E2F2F]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="focus:bg-[#1C1B1B] hover:bg-[#1C1B1B] focus:text-white cursor-pointer">
                    <Sparkles className="mr-2 size-4" />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-[#2E2F2F]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="focus:bg-[#1C1B1B] hover:bg-[#1C1B1B] focus:text-white cursor-pointer">
                    <BadgeCheck className="mr-2 size-4" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-[#1C1B1B] hover:bg-[#1C1B1B] focus:text-white cursor-pointer">
                    <CreditCard className="mr-2 size-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-[#1C1B1B] hover:bg-[#1C1B1B] focus:text-white cursor-pointer">
                    <Bell className="mr-2 size-4" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-[#2E2F2F]" />
                <DropdownMenuItem onClick={handleLogout} className="focus:bg-[#1C1B1B] hover:bg-[#1C1B1B] focus:text-white cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* ── Logged-out: navigation buttons ── */
          <div className="flex items-center gap-2 md:gap-1">
            <div className="hidden md:flex items-center gap-1">
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
            </div>
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

