import { Button, type ButtonProps } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { forwardRef } from "react";

export interface RefreshButtonProps extends ButtonProps {
  loading?: boolean;
  showText?: boolean;
  text?: string;
  loadingText?: string;
  iconPosition?: "left" | "right";
}

export const RefreshButton = forwardRef<HTMLButtonElement, RefreshButtonProps>(
  (
    {
      loading = false,
      showText = true,
      text = "Refresh",
      loadingText = "Refreshing...",
      iconPosition = "left",
      children,
      ...props
    },
    ref
  ) => {
    const icon = <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : iconPosition === "left" ? "mr-2" : "ml-2"}`} />;
    
    return (
      <Button
        ref={ref}
        variant="outline"
        disabled={loading}
        {...props}
      >
        {iconPosition === "left" && icon}
        {showText && (loading ? loadingText : (children || text))}
        {iconPosition === "right" && icon}
      </Button>
    );
  }
);

RefreshButton.displayName = "RefreshButton";