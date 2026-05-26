"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const LoadingContext = createContext({
  loading: false,
  setLoading: (val: boolean) => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically turn off loading when the route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100); // Small delay to ensure navigation is complete

    return () => clearTimeout(timer);
  }, [pathname]);

  // Implement global loading timeout of 3 seconds
  useEffect(() => {
    if (loading) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new 3 second timeout
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 3000);
    }
    
    // Cleanup timeout on unmount or when loading changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading]);

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}