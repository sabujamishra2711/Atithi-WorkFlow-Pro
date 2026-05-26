import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import React from "react";

interface SaveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const SaveButton = React.forwardRef<HTMLButtonElement, SaveButtonProps>(
  ({ loading, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className="bg-primary hover:bg-primary-foreground text-primary-foreground"
        disabled={loading}
        {...props}
      >
        {loading ? (
          <span className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></span>
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {children || "Save"}
      </Button>
    );
  }
);

SaveButton.displayName = "SaveButton";

export { SaveButton };