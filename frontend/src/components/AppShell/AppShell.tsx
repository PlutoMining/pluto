"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import {
  IconHeaderHelp,
  IconHeaderNotifications,
  IconHeaderSupport,
} from "@/components/icons/FigmaIcons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { AppSidebar } from "./AppSidebar";
import { getPageTitle } from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const title = getPageTitle(pathname);

  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar-width-icon": "52px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header
          className={cn(
            "flex h-[60px] shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar px-4",
            "transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[60px]"
          )}
        >
          <div className="flex flex-1 items-center gap-2">
            <SidebarTrigger className="-ml-1 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <Separator orientation="vertical" className="mx-2 h-4 bg-sidebar-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-heading text-sm tracking-[0.07px] text-sidebar-accent-foreground">
                    {title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1">
            <a
              href="https://discord.com/channels/1441408195405807648/1461369790672273468"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Support"
              title="Support"
            >
              <IconHeaderSupport className="h-5 w-5" />
            </a>
            <a
              href="https://discord.com/channels/1441408195405807648/1452965862863536138"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Help"
              title="Help"
            >
              <IconHeaderHelp className="h-5 w-5" />
            </a>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <IconHeaderNotifications className="h-5 w-5" />
            </button>

            <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <SheetContent side="right" className="w-[360px] p-0">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle className="font-heading text-sm tracking-[0.07px]">Notifications</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <p className="font-body text-sm text-muted-foreground">No notifications yet.</p>
                  <p className="mt-2 font-body text-xs text-muted-foreground">You&apos;re all caught up.</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
