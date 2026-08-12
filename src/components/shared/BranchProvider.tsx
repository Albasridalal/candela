"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Branch } from "@/lib/types/database.types";

const STORAGE_KEY = "salon.selectedBranchId";

const BranchContext = createContext<{
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: string) => void;
} | null>(null);

export function BranchProvider({
  branches,
  children,
}: {
  branches: Branch[];
  children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(branches[0]?.id ?? null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && branches.some((b) => b.id === stored)) {
      setSelectedId(stored);
    }
  }, [branches]);

  function setSelectedBranchId(id: string) {
    setSelectedId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  const selectedBranch = branches.find((b) => b.id === selectedId) ?? branches[0] ?? null;

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranchId }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
