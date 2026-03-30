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
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type DialogVariant = "success" | "warning" | "info" | "error";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  hideCancel?: boolean;
}

const variantConfig: Record<DialogVariant, { icon: any; iconClass: string; btnClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-400", btnClass: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-400", btnClass: "bg-amber-500 hover:bg-amber-600 text-white" },
  info: { icon: Info, iconClass: "text-primary", btnClass: "" },
  error: { icon: XCircle, iconClass: "text-destructive", btnClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground" },
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  hideCancel = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
            </div>
            <div>
              <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-xs mt-1">{description}</AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          {!hideCancel && (
            <AlertDialogCancel onClick={onCancel} className="text-xs h-9">
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={onConfirm}
            className={`text-xs h-9 ${config.btnClass}`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
