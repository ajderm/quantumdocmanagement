// Promise-based confirmation dialog, app-wide.
//
// The app runs inside HubSpot's sandboxed iframe, where the browser silently
// blocks native window.confirm()/alert()/prompt() (no allow-modals) — a blocked
// confirm() returns false, so destructive actions gated on it did nothing. This
// replaces those gates with a single shadcn AlertDialog exposed as an awaitable
// confirm() so call sites stay one-liners:
//
//   if (!(await confirm({ title, description, destructive: true }))) return;
//
// z-[80]: must render above the embedded Settings overlay (z-[60]) and the
// dropdown/popover layer (z-[70]); stays below toasts (z-[100]).

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as destructive (red). Default true. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((v: boolean) => void) | undefined>(undefined);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = (result: boolean) => {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = undefined;
  };

  const destructive = opts.destructive !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => { if (!o) resolve(false); }}>
        <AlertDialogContent className="z-[80]" overlayClassName="z-[80]">
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title || "Are you sure?"}</AlertDialogTitle>
            {opts.description ? <AlertDialogDescription>{opts.description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolve(false)}>{opts.cancelText || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolve(true)}
              className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {opts.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return ctx;
}
