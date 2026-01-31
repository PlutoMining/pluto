"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
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
            <SidebarTrigger className="-ml-1 text-[#CBCCCC] hover:bg-[#161B1F] hover:text-white" />
            <Separator orientation="vertical" className="mx-2 h-4 bg-sidebar-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-heading text-sm tracking-[0.07px] text-white">
                    {title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#CBCCCC] hover:bg-[#161B1F] hover:text-white"
              aria-label="Help"
            >
              <Icon name="help" size={20} />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#CBCCCC] hover:bg-[#161B1F] hover:text-white"
              aria-label="Notifications"
            >
              <Icon name="notifications" size={20} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
