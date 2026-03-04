"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface PageTitleContextValue {
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  customTitle: null,
  setCustomTitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [customTitle, setCustomTitleRaw] = useState<string | null>(null);
  const setCustomTitle = useCallback((title: string | null) => {
    setCustomTitleRaw(title);
  }, []);

  return (
    <PageTitleContext.Provider value={{ customTitle, setCustomTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageTitleContext);
}
