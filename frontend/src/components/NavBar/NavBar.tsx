"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import axios from "axios";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { CrossIcon } from "../icons/CrossIcon";
import { DiscordLogo, GithubLogo } from "../icons/FooterIcons";
import { HamburgerIcon } from "../icons/HamburgerIcon";
import { Logo } from "../icons/Logo";
import { SettingsIcon } from "../icons/SettingsIcon/SettingsIcon";

type NavLink = {
  key: string;
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

export const NavBar = () => {
  const pathname = usePathname() ?? "/";
  const [version, setVersion] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const links: NavLink[] = useMemo(
    () => [
      { key: "dashboard", href: "/", label: "Overview", match: (p) => p === "/" },
      {
        key: "monitoring",
        href: "/monitoring",
        label: "Monitoring",
        match: (p) => p === "/monitoring" || p.startsWith("/monitoring/"),
      },
      { key: "settings", href: "/device-settings", label: "Device settings", match: (p) => p === "/device-settings" },
      { key: "presets", href: "/presets", label: "Pool presets", match: (p) => p === "/presets" },
      { key: "devices", href: "/devices", label: "Your devices", match: (p) => p === "/devices" },
    ],
    []
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (slideRef.current && !slideRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const getVersion = async () => {
      const response = await axios.get("/api/app-version");
      setVersion(response.data.version);
    };

    getVersion();
  }, []);

  return (
    <header className={cn("sticky top-0 z-20 border-b border-border bg-background")}> 
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-8">
        <div className="flex items-end gap-2 text-foreground">
          <NextLink href="/" aria-label="Home">
            <Logo className="text-foreground" />
          </NextLink>
          {version ? <span className="mb-1 text-xs font-accent text-muted-foreground">v.{version}</span> : null}
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 rounded-md px-3 py-2 lg:flex">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <NextLink
                key={link.key}
                href={link.href}
                className={cn(
                  "relative text-sm font-heading uppercase",
                  active ? "text-foreground" : "text-muted-foreground",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-1 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded",
                    active ? "bg-primary" : "hidden"
                  )}
                />
              </NextLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <NextLink href="/settings" aria-label="Settings" className="text-muted-foreground hover:text-foreground">
            <SettingsIcon className="h-5 w-5" />
          </NextLink>

          <button
            type="button"
            className="lg:hidden"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? <CrossIcon className="h-8 w-8 text-foreground" /> : <HamburgerIcon className="h-8 w-8 text-foreground" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden">
          <div
            ref={slideRef}
            className="absolute right-0 top-16 h-[calc(100vh-4rem)] w-[calc(50%+160px)] max-w-[100vw] border-l border-t border-border bg-background p-8"
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex flex-col gap-8">
                {links.map((link) => {
                  const active = link.match(pathname);
                  return (
                    <NextLink
                      key={link.key}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "font-body text-sm uppercase",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {link.label}
                    </NextLink>
                  );
                })}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <GithubLogo
                    url="https://github.com/PlutoMining/pluto"
                    target="_blank"
                    className="text-primary"
                  />
                  <DiscordLogo url="https://discord.gg/osmu" target="_blank" className="text-primary" />
                </div>

                <a className="text-xs font-heading text-muted-foreground underline">Terms & Conditions</a>
                <p className="text-xs font-light text-muted-foreground">
                  © 2024 Pluto. All rights reserved. This open-source application software is licensed under the AGPL 3.0 License.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
