"use client";

import axios from "axios";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Icon } from "@/components/Icon";
import { PlutoLogo } from "@/components/icons/PlutoLogo/PlutoLogo";
import { PlutoMark } from "@/components/icons/PlutoLogo/PlutoMark";
import { LoadoutLogo } from "@/components/icons/LoadoutLogo";
import { DiscordLogo, GithubLogo } from "@/components/icons/FooterIcons";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { APP_NAV, SETTINGS_NAV } from "./nav";

export function AppSidebar() {
  const pathname = usePathname() ?? "/";
  const { state } = useSidebar();
  const [version, setVersion] = React.useState<string>("");

  React.useEffect(() => {
    const getVersion = async () => {
      try {
        const response = await axios.get("/api/app-version");
        setVersion(response.data.version);
      } catch {
        // ignore
      }
    };

    getVersion();
  }, []);

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        // hard match Figma: black bg + subtle border
        "border-sidebar-border bg-sidebar text-sidebar-foreground",
        "md:[&_[data-sidebar=sidebar-inner]]:border-sidebar-border md:[&_[data-sidebar=sidebar-inner]]:border-r"
      )}
    >
      <SidebarHeader className="px-4 py-3">
        <NextLink
          href="/"
          className={cn(
            "flex items-center gap-2",
            state === "collapsed" ? "justify-center" : "justify-start"
          )}
          aria-label="Home"
        >
          {state === "collapsed" ? (
            <PlutoMark color="#13FFEB" />
          ) : (
            <div className="flex items-end gap-2">
              <PlutoLogo color="#FFFFFF" />
              {version ? (
                <span className="mb-1 text-xs font-accent text-sidebar-foreground/70">v.{version}</span>
              ) : null}
            </div>
          )}
        </NextLink>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {APP_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    "relative h-8 rounded-[6px] px-3 py-1",
                    "font-heading text-[14px] uppercase tracking-[0.07px]",
                    active
                      ? "bg-[#161B1F] text-white before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-primary"
                      : "text-[#CBCCCC]"
                  )}
                >
                  <NextLink href={item.href}>
                    <span className="inline-flex size-5 items-center justify-center">
                      <Icon name={item.icon} size={20} className={cn(active ? "text-white" : "text-[#CBCCCC]")} />
                    </span>
                    <span>{item.label}</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={SETTINGS_NAV.match(pathname)}
              tooltip={SETTINGS_NAV.label}
              className={cn(
                "relative h-8 rounded-[6px] px-3 py-1",
                "font-heading text-[14px] uppercase tracking-[0.07px]",
                SETTINGS_NAV.match(pathname) ? "bg-[#161B1F] text-white" : "text-[#CBCCCC]"
              )}
            >
              <NextLink href={SETTINGS_NAV.href}>
                <span className="inline-flex size-5 items-center justify-center">
                  <Icon
                    name={SETTINGS_NAV.icon}
                    size={20}
                    className={cn(SETTINGS_NAV.match(pathname) ? "text-white" : "text-[#CBCCCC]")}
                  />
                </span>
                <span>{SETTINGS_NAV.label}</span>
              </NextLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className={cn("mt-3 px-2", state === "collapsed" ? "px-0" : null)}>
          <div className={cn("border-t border-sidebar-border pt-3", state === "collapsed" ? "mx-auto w-6" : null)} />

          {state === "collapsed" ? (
            <div className="mt-3 flex flex-col items-center gap-3">
              <GithubLogo url="https://github.com/PlutoMining/pluto" target="_blank" className="text-primary" />
              <DiscordLogo url="https://discord.gg/osmu" target="_blank" className="text-primary" />
              <LoadoutLogo url="https://www.loadout.gg/" target="_blank" className="text-white" />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading text-xs font-medium text-white">Terms & Conditions</span>
                <div className="flex items-center gap-2">
                  <GithubLogo
                    url="https://github.com/PlutoMining/pluto"
                    target="_blank"
                    className="text-primary"
                  />
                  <DiscordLogo url="https://discord.gg/osmu" target="_blank" className="text-primary" />
                </div>
              </div>
              <p className="text-[11px] font-light text-sidebar-foreground/70">
                © 2024 Pluto. All rights reserved. This open-source application software is licensed under the AGPL 3.0 License.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-light text-sidebar-foreground/70">Designed with love by</span>
                <LoadoutLogo url="https://www.loadout.gg/" target="_blank" className="text-white" />
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
