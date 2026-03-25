"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Frame,
  LifeBuoy,
  Map,
  Badge,
  Send,
  Settings2,
  SquareTerminal,
  Command,
  Home,
} from "lucide-react"

import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Badge,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: Badge,
    },
    {
      name: "Travel",
      url: "#",
      icon: Badge,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const navMainWithActive = data.navMain.map((item) => ({
    ...item,
    isActive: item.url === pathname || (item.url === "/" && pathname === "/"),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex h-(--header-height) shrink-0 items-center border-b border-[#2E2F2F] px-4 block">
        <a
          href="/"
          className="group inline-flex w-full items-center gap-2 transition-colors"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/5">
            <Command className="size-5" />
          </div>
          <div className="grid text-left leading-tight group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap">
            <span className="truncate text-base font-semibold tracking-tight">
              Build in Base
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Workspace
            </span>
          </div>
        </a>
      </SidebarHeader>
      <SidebarContent className="pt-3 group-data-[collapsible=icon]:pt-2">
        <NavMain items={navMainWithActive} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}

