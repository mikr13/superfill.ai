import { GridIcon, ListIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EntryCard } from "@/components/features/memory/entry-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMemoryStore } from "@/stores/memory";

type SortOption = "recent" | "usage" | "alphabetical";
type ViewMode = "list" | "grid";

interface EntryListProps {
  onEdit: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
}

export function EntryList({ onEdit, onDelete, onDuplicate }: EntryListProps) {
  const entries = useMemoryStore((state) => state.entries);
  const loading = useMemoryStore((state) => state.loading);
  const deleteEntry = useMemoryStore((state) => state.deleteEntry);
  const getEntryById = useMemoryStore((state) => state.getEntryById);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const categories = useMemo(
    () => [...new Set(entries.map((e) => e.category))],
    [entries],
  );

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.answer.toLowerCase().includes(query) ||
          entry.question?.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          entry.category.toLowerCase().includes(query),
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((entry) => entry.category === categoryFilter);
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case "recent":
        sorted.sort(
          (a, b) =>
            new Date(b.metadata.updatedAt).getTime() -
            new Date(a.metadata.updatedAt).getTime(),
        );
        break;
      case "usage":
        sorted.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
        break;
      case "alphabetical":
        sorted.sort((a, b) => {
          const aText = a.question || a.answer;
          const bText = b.question || b.answer;
          return aText.localeCompare(bText);
        });
        break;
    }

    return sorted;
  }, [entries, searchQuery, categoryFilter, sortBy]);

  const handleEdit = (entryId: string) => {
    onEdit(entryId);
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      onDelete(entryId);
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const handleDuplicate = async (entryId: string) => {
    const entry = getEntryById(entryId);
    if (entry) {
      onDuplicate(entryId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by question, answer, tags, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="usage">Most Used</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md">
            <ToggleGroup type="single">
              <ToggleGroupItem
                value="list"
                aria-label="List view"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="grid"
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
              >
                <GridIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {filteredAndSortedEntries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery || categoryFilter !== "all"
                ? "No results found"
                : "No entries yet"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first memory entry to get started"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex-1 overflow-auto">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
              {filteredAndSortedEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  mode="compact"
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredAndSortedEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  mode="detailed"
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedEntries.length} of {entries.length} entries
      </div>
    </div>
  );
}
