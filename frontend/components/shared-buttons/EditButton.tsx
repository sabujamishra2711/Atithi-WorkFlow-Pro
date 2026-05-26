import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface EditButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isEditing: boolean;
  onStartEdit?: () => void;
  onCancel?: () => void;
}

const EditButton = React.forwardRef<HTMLButtonElement, EditButtonProps>(
  ({ isEditing, onStartEdit, onCancel, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn("transition-all", className)}
        onClick={isEditing ? onCancel : onStartEdit}
        variant={isEditing ? "outline" : "default"}
        {...props}
      >
        {isEditing ? (
          <>
            <span className="mr-2">Cancel</span>
          </>
        ) : (
          <>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </>
        )}
      </Button>
    );
  }
);

EditButton.displayName = "EditButton";

export { EditButton };