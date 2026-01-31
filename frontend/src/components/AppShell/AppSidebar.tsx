"use client";

import axios from "axios";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useTheme } from "next-themes";

import { PlutoLogo } from "@/components/icons/PlutoLogo/PlutoLogo";
import { PlutoMark } from "@/components/icons/PlutoLogo/PlutoMark";
import { LoadoutLogo, LoadoutMark } from "@/components/icons/LoadoutLogo";
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const settingsActive = SETTINGS_NAV.match(pathname);
  const SettingsIcon = SETTINGS_NAV.Icon;

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
            <PlutoMark color="#13FFEB" className="h-9 w-9" />
          ) : (
            <div className="flex items-end gap-2">
              <PlutoLogo color={isDark ? "#FFFFFF" : "#090B0D"} />
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
            const ItemIcon = item.Icon;
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    "relative h-8 rounded-[6px] px-3 py-1",
                    "font-heading text-[14px] uppercase tracking-[0.07px]",
                    "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-primary"
                      : "text-sidebar-foreground/80"
                  )}
                >
                  <NextLink href={item.href}>
                    <span className="inline-flex size-5 items-center justify-center">
                      <ItemIcon
                        className={cn(
                          "h-5 w-5",
                          active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
                        )}
                      />
                    </span>
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
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
              isActive={settingsActive}
              tooltip={SETTINGS_NAV.label}
              className={cn(
                "relative h-8 rounded-[6px] px-3 py-1",
                "font-heading text-[14px] uppercase tracking-[0.07px]",
                "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0",
                settingsActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
              )}
            >
              <NextLink href={SETTINGS_NAV.href}>
                <span className="inline-flex size-5 items-center justify-center">
                  <SettingsIcon
                    className={cn(
                      "h-5 w-5",
                      settingsActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
                    )}
                  />
                </span>
                <span className="group-data-[collapsible=icon]:hidden">{SETTINGS_NAV.label}</span>
              </NextLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className={cn("mt-3 px-2", state === "collapsed" ? "px-0" : null)}>
          <div className={cn("border-t border-sidebar-border pt-3", state === "collapsed" ? "mx-auto w-6" : null)} />

          {state === "collapsed" ? (
            <div className="mt-3 flex flex-col items-center gap-3">
              <GithubLogo url="https://github.com/PlutoMining/pluto" target="_blank" className="text-primary" />
              <DiscordLogo url="https://discord.gg/Nksp22hA" target="_blank" className="text-primary" />
              <LoadoutMark url="https://www.loadout.gg/" target="_blank" className="text-sidebar-accent-foreground" />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading text-xs font-medium text-sidebar-accent-foreground">
                  Terms & Conditions
                </span>
                <div className="flex items-center gap-2">
                  <GithubLogo
                    url="https://github.com/PlutoMining/pluto"
                    target="_blank"
                    className="text-primary"
                  />
                  <DiscordLogo url="https://discord.gg/Nksp22hA" target="_blank" className="text-primary" />
                </div>
              </div>
              <p className="text-[11px] font-light text-sidebar-foreground/70">
                © 2024 Pluto. All rights reserved. This open-source application software is licensed under the AGPL 3.0 License.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-light text-sidebar-foreground/70">Designed with love by</span>
                <LoadoutLogo
                  url="https://www.loadout.gg/"
                  target="_blank"
                  className="text-sidebar-accent-foreground"
                />
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
