/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LogStreamContextType {
  isLogStreamActive: boolean;
  startLogStream: () => void;
  stopLogStream: () => void;
  shouldReconnect: boolean;
  requestReconnect: () => void;
}

const LogStreamContext = createContext<LogStreamContextType | undefined>(undefined);

export const LogStreamProvider = ({ children }: { children: ReactNode }) => {
  const [isLogStreamActive, setIsLogStreamActive] = useState(false);
  const [shouldReconnect, setShouldReconnect] = useState(false);

  const startLogStream = useCallback(() => {
    setIsLogStreamActive(true);
    setShouldReconnect(false);
  }, []);

  const stopLogStream = useCallback(() => {
    setIsLogStreamActive(false);
  }, []);

  const requestReconnect = useCallback(() => {
    setShouldReconnect(true);
  }, []);

  return (
    <LogStreamContext.Provider
      value={{
        isLogStreamActive,
        startLogStream,
        stopLogStream,
        shouldReconnect,
        requestReconnect,
      }}
    >
      {children}
    </LogStreamContext.Provider>
  );
};

export const useLogStream = () => {
  const context = useContext(LogStreamContext);
  if (context === undefined) {
    throw new Error("useLogStream must be used within a LogStreamProvider");
  }
  return context;
};
