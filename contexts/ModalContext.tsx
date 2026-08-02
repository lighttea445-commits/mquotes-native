import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ModalSheet = 'categories' | 'themes' | 'topics' | 'profile' | 'myquotes' | 'history' | 'notifications' | 'widgets' | 'favorites' | 'collections' | 'trial' | 'settings' | 'share' | 'streak' | null;
type SheetName = Exclude<ModalSheet, null>;

interface ModalContextValue {
  activeSheet: ModalSheet;
  /** The sheet that was active just before the current one (null if fresh open). */
  previousSheet: ModalSheet;
  openSheet: (sheet: SheetName) => void;
  /** Pop back to the previous sheet in the stack. */
  goBack: () => void;
  /** Close all sheets. */
  closeSheet: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [sheetStack, setSheetStack] = useState<SheetName[]>([]);
  const [previousSheet, setPreviousSheet] = useState<ModalSheet>(null);

  // Ref so callbacks always see current stack without stale closures
  const stackRef = useRef<SheetName[]>([]);

  const activeSheet: ModalSheet = sheetStack.length > 0 ? sheetStack[sheetStack.length - 1] : null;

  const openSheet = useCallback((sheet: SheetName) => {
    const current = stackRef.current.length > 0 ? stackRef.current[stackRef.current.length - 1] : null;
    setPreviousSheet(current);
    stackRef.current = [...stackRef.current, sheet];
    setSheetStack([...stackRef.current]);
  }, []);

  const goBack = useCallback(() => {
    if (stackRef.current.length === 0) return;
    const current = stackRef.current[stackRef.current.length - 1];
    const prev = stackRef.current.length > 1 ? stackRef.current[stackRef.current.length - 2] : null;
    setPreviousSheet(current);
    stackRef.current = stackRef.current.slice(0, -1);
    setSheetStack([...stackRef.current]);
    // If we popped back to empty, previousSheet will equal current so isSwitching stays true briefly
    // — that's fine, it just means instant transition
    void prev;
  }, []);

  const closeSheet = useCallback(() => {
    // null → isSwitching=false → outgoing sheet plays the slide-down animation
    // (used by X buttons, backdrop taps — not sheet-to-sheet navigation)
    setPreviousSheet(null);
    stackRef.current = [];
    setSheetStack([]);
  }, []);

  return (
    <ModalContext.Provider value={{ activeSheet, previousSheet, openSheet, goBack, closeSheet }}>
      {children}
    </ModalContext.Provider>
  );
}

/** Returns null when rendered outside <ModalProvider> (e.g. standalone route screens). */
export function useModal(): ModalContextValue | null {
  return useContext(ModalContext);
}
