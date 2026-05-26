import React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Save, Loader } from "lucide-react";
import { forwardRef } from "react";

export interface SaveButtonProps extends ButtonProps {
  loading?: boolean;
  showText?: boolean;
  text?: string;
  loadingText?: string;
}

export const SaveButton = forwardRef<HTMLButtonElement, SaveButtonProps>(
  (
    {
      loading = false,
      showText = true,
      text = "Save",
      loadingText = "Saving...",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        type="submit"
        disabled={loading}
        {...props}
      >
        {loading ? (
          <Loader className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {showText && (loading ? loadingText : (children || text))}
      </Button>
    );
  }
);

SaveButton.displayName = "SaveButton";