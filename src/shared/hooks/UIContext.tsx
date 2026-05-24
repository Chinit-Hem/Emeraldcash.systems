"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

interface UIState {
  isModalOpen: boolean;
}

interface UIContextType extends UIState {
  setIsModalOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <UIContext.Provider value={{ isModalOpen, setIsModalOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within <UIProvider />");
  }
  return context;
}
