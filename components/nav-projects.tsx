"use client"

import { MoreHorizontal } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@clerk/nextjs"
import type { ProjectDto } from "@/lib/data"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { InlineDisclosureMenu } from "@/components/ui/menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  FavouriteIcon,
  PencilEdit02Icon,
  Share01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"

export function NavProjects() {
  const pathname = usePathname()
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      if (!isSignedIn) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch("/api/projects", { cache: "no-store" })
        const payload = await res.json()

        if (!res.ok) {
          throw new Error(payload?.message || "Failed to fetch projects")
        }

        setProjects(payload.projects || [])
      } catch (error) {
        console.error("Error fetching projects:", error)
      }
      setIsLoading(false)
    }

    fetchProjects()
  }, [isSignedIn])

  const handleDeleteProject = async (projectId: string) => {
    const prevProjects = [...projects]
    setProjects((current) => current.filter((project) => project.id !== projectId))

    if (pathname === `/project/${projectId}`) {
      router.push("/")
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || "Failed to delete project")
      }

      router.refresh()
    } catch (error) {
      console.error("Error deleting project:", error)
      setProjects(prevProjects)
    }
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <span className="text-muted-foreground text-xs">Loading...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton>
              <span className="text-muted-foreground text-xs">No projects yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          projects.map((project) => {
            const isActive = pathname === `/project/${project.id}`
            return (
              <SidebarMenuItem key={project.id} className="relative group/project">
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  // UPDATED: Both hover and open states now use the exact same background color
                  className="transition-colors group-hover/project:bg-sidebar-accent group-has-[[data-state=open]]/project:bg-sidebar-accent"
                >
                  <a href={`/project/${project.id}`} className="flex items-center gap-2 pr-10">
                    <Image src="/react.svg" alt="React" width={16} height={16} className="w-5 h-5 object-contain brightness-0 invert opacity-70" />
                    <span className="truncate">{project.title}</span>
                  </a>
                </SidebarMenuButton>

                <InlineDisclosureMenu
                  onDelete={() => handleDeleteProject(project.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-[100] opacity-0 group-hover/project:opacity-100 focus-within:opacity-100 group-has-[[data-state=open]]/project:opacity-100 transition-opacity"
                  contentClassName="w-[180px]"
                  trigger={
                    <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-200 transition-all transform active:scale-95">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  }
                  menuItems={[
                    { icon: <HugeiconsIcon icon={ViewIcon} size={16} />, label: "View Project" },
                    { icon: <HugeiconsIcon icon={PencilEdit02Icon} size={16} />, label: "Edit" },
                    { icon: <HugeiconsIcon icon={Copy01Icon} size={16} />, label: "Duplicate" },
                    { icon: <HugeiconsIcon icon={FavouriteIcon} size={16} />, label: "Favourite" },
                    { icon: <HugeiconsIcon icon={Share01Icon} size={16} />, label: "Share" },
                  ]}
                />
              </SidebarMenuItem>
            )
          })
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
