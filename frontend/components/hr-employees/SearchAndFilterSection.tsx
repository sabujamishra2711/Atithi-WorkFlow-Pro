import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { RefreshButton } from "@/components/shared-buttons";

interface SearchAndFilterSectionProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  loading: boolean;
  onRefresh: () => void;
}

export function SearchAndFilterSection({ 
  searchTerm, 
  onSearchChange, 
  showFilters, 
  onToggleFilters, 
  loading, 
  onRefresh 
}: SearchAndFilterSectionProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={onToggleFilters}
          className="w-full sm:w-auto"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>
      <RefreshButton 
        onClick={onRefresh}
        loading={loading}
        className="ml-4"
      />
    </div>
  );
}