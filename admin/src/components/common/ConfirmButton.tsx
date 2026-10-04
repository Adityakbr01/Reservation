import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmButtonProps {
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel?: ReactNode;
  triggerVariant?: "ghost" | "default" | "outline" | "destructive";
  triggerClassName?: string;
  pending?: boolean;
  onConfirm: () => void;
}

/**
 * Destructive/important action guarded by a shadcn confirmation dialog.
 * Use for deletes, money moves, stay transitions, and sign-out.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Delete",
  triggerLabel = "Delete",
  triggerVariant = "ghost",
  triggerClassName,
  pending = false,
  onConfirm,
}: ConfirmButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size="sm"
          className={triggerClassName ?? "rounded-full text-destructive hover:text-destructive"}
        >
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmButton;
