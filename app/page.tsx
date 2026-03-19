import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import ChatInput from "@/components/chatInput"
import { SidebarToggle } from "@/components/sidebar-toggle"
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
    <div className="[--header-height:calc(--spacing(16))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader user={user} />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col border-t border-border/40 gap-4 p-4">
              <div className="bg-[#18181B] min-h-[100vh] flex-1 rounded-xl md:min-h-min flex flex-col relative">
                <div className="absolute top-4 left-4">
                  <SidebarToggle />
                </div>
                <div className="flex-1 flex items-center justify-center -mt-36">
                  <ChatInput />
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}