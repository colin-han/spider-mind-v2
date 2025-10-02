"use client";

import {
  createContext,
  useState,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "./confirm-dialog";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ open: false, options: null, resolve: null });
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, options: null, resolve: null });
  }, [state]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && state.options && (
        <ConfirmDialog
          open={state.open}
          title={state.options.title}
          description={state.options.description}
          confirmText={state.options.confirmText ?? "确认"}
          cancelText={state.options.cancelText ?? "取消"}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}
