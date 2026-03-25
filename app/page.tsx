import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import ChatInput from "@/components/chatInput"
import { ProjectsSection } from "@/components/projects-section"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const user = authUser
    ? {
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
      email: authUser.email || "",
      avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || "",
    }
    : null

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader user={user} />
          <div className="bg-[#151414] flex flex-1 flex-col border-[#2E2F2F] border-border/40 gap-4 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="bg-[#151414] min-h-[85vh] md:min-h-[100vh] rounded-xl flex flex-col relative shrink-0">
              <div className="flex-1 flex items-center justify-center mt-0 md:-mt-36">
                <ChatInput />
              </div>
            </div>
            {/* Scrollable Projects Section */}
            <ProjectsSection />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}