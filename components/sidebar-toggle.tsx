"use client"

import { SidebarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      className="h-9 w-9"
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
    >
      <SidebarIcon className="size-5" />
    </Button>
  )
}
