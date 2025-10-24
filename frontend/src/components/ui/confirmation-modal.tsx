import * as React from "react";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      maxWidth="sm"
      className="p-6"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              variant === "destructive"
                ? "bg-red-500/10 text-red-500"
                : "bg-yellow-500/10 text-yellow-500"
            )}
          >
            {variant === "destructive" ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-lg font-semibold leading-none tracking-tight text-left">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground text-left">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-0 sm:flex-row-reverse sm:justify-end sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </AnimatedModal>
  );
}

