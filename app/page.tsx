import { auth, currentUser } from "@clerk/nextjs/server";

import { AppSidebar } from "@/components/app-sidebar";
import ChatInput from "@/components/chatInput";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { toAppUser } from "@/lib/auth";

export default async function Page() {
  const { userId } = await auth();
  const clerkUser = userId ? await currentUser() : null;
  const user = toAppUser(clerkUser);

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
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
