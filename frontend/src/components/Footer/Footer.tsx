"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { LoadoutLogo } from "../icons/LoadoutLogo";
import { DiscordLogo, GithubLogo } from "../icons/FooterIcons";

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-border bg-background py-4 text-muted-foreground">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-8 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="hidden flex-col-reverse gap-2 tablet:flex tablet:flex-col tablet:items-start desktop:flex-row desktop:items-center desktop:gap-4">
          <div className="flex w-full items-center justify-between gap-4 tablet:w-auto tablet:justify-start">
            <span className="font-heading text-xs font-medium text-foreground">Terms & Conditions</span>
            <div className="flex items-center gap-2">
              <GithubLogo url="https://github.com/PlutoMining/pluto" target="_blank" className="text-primary" />
              <DiscordLogo url="https://discord.gg/osmu" target="_blank" className="text-primary" />
            </div>
          </div>
          <p className="text-xs font-light">© 2024 Pluto. All rights reserved. This open-source application software is licensed under the AGPL 3.0 License.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-light">Designed with love by</span>
          <LoadoutLogo url="https://www.loadout.gg/" target="_blank" className="text-foreground" />
        </div>
      </div>
    </footer>
  );
};
