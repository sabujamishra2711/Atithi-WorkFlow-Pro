import { Loader2 } from "lucide-react";

export default function SupportLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Support Center</h2>
        <p className="text-gray-600">Please wait while we prepare the support resources for you...</p>
      </div>
    </div>
  );
}