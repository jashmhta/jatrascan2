import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ScannerContextType {
  showScanner: boolean;
  openScanner: () => void;
  closeScanner: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [showScanner, setShowScanner] = useState(false);

  const openScanner = useCallback(() => {
    setShowScanner(true);
  }, []);

  const closeScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  return (
    <ScannerContext.Provider value={{ showScanner, openScanner, closeScanner }}>
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error("useScanner must be used within a ScannerProvider");
  }
  return context;
}
