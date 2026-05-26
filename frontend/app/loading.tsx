"use client";
import { useLoading } from "@/components/LoadingContext";

export default function Loading() {
  const { loading } = useLoading();
  if (!loading) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/70 z-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#8B0000] border-b-4 border-[#FFF9E3]" />
      <span className="ml-4 text-[#8B0000] text-xl font-bold">Loading...</span>
    </div>
  );
} 