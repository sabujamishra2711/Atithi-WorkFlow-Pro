import { Button, type ButtonProps } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { forwardRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface DeleteButtonProps extends ButtonProps {
  showText?: boolean;
  text?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  onConfirm?: () => void;
}

export const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(
  ({ showText = true, text = "Delete", confirmTitle, confirmDescription, onConfirm, onClick, children, ...props }, ref) => {
    const [open, setOpen] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // If onConfirm is provided, handle confirmation logic
      if (onConfirm) {
        setOpen(true);
      } else if (onClick) {
        // If onClick is provided, call it directly (no confirmation dialog)
        onClick(e);
      }
    };

    const handleConfirm = () => {
      if (onConfirm) {
        onConfirm();
      }
      setOpen(false);
    };

    // If onConfirm is provided, we use the AlertDialog
    if (onConfirm) {
      return (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              ref={ref}
              className="text-white bg-red-500 hover:bg-red-600"
              size="sm"
              onClick={handleClick}
              {...props}
            >
              <Trash2 className="h-4 w-4" />
              {showText && (children || text)}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle || "Are you sure?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDescription || "This action cannot be undone. Are you sure you want to delete this item?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    // If no onConfirm is provided, just render a regular button with onClick
    return (
      <Button
        ref={ref}
        className="text-white bg-red-500 hover:bg-red-600"
        size="sm"
        onClick={handleClick}
        {...props}
      >
        <Trash2 className="h-4 w-4" />
        {showText && (children || text)}
      </Button>
    );
  }
);

DeleteButton.displayName = "DeleteButton";