import { formatDistanceToNow } from "date-fns";
import {
  CheckIcon,
  CopyIcon,
  Edit2Icon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/cn";
import type { MemoryEntry } from "@/types/memory";

interface EntryCardProps {
  entry: MemoryEntry;
  mode: "compact" | "detailed";
  onEdit: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.5) return "bg-yellow-500";
  return "bg-red-500";
};

const truncateText = (text: string, lines = 2) => {
  const maxLength = lines === 1 ? 50 : 100;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export function EntryCard({
  entry,
  mode,
  onEdit,
  onDelete,
  onDuplicate,
}: EntryCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shouldTruncateAnswer = entry.answer.length > 100 && !expanded;
  const displayAnswer = shouldTruncateAnswer
    ? truncateText(entry.answer, 2)
    : entry.answer;

  if (mode === "compact") {
    return (
      <Card className="p-4 gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {entry.question && (
              <h3 className="font-medium text-sm mb-1 truncate">
                {entry.question}
              </h3>
            )}
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer">
                  {entry.answer}
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <p className="text-sm whitespace-pre-wrap wrap-break-word">
                  {entry.answer}
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                getConfidenceColor(entry.confidence),
              )}
              title={`Confidence: ${Math.round(entry.confidence * 100)}%`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {entry.category}
          </Badge>
          {entry.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {entry.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{entry.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {entry.metadata.lastUsed
              ? `Used ${formatDistanceToNow(new Date(entry.metadata.lastUsed), { addSuffix: true })}`
              : "Never used"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(entry.id)}>
                <Edit2Icon className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(entry.id)}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(entry.id)}
                className="text-destructive"
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {entry.question && (
                <h3 className="font-medium text-base mb-2">{entry.question}</h3>
              )}
              <div className="text-sm text-foreground">
                {shouldTruncateAnswer ? (
                  <>
                    <p className="whitespace-pre-wrap wrap-break-word">
                      {displayAnswer}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => setExpanded(true)}
                    >
                      Show more
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap wrap-break-word">
                      {entry.answer}
                    </p>
                    {entry.answer.length > 100 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs mt-1"
                        onClick={() => setExpanded(false)}
                      >
                        Show less
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  getConfidenceColor(entry.confidence),
                )}
                title={`Confidence: ${Math.round(entry.confidence * 100)}%`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{entry.category}</Badge>
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-4">
              <span>
                Used: {entry.metadata.usageCount}{" "}
                {entry.metadata.usageCount === 1 ? "time" : "times"}
              </span>
              <span>
                {entry.metadata.lastUsed
                  ? `Last used ${formatDistanceToNow(new Date(entry.metadata.lastUsed), { addSuffix: true })}`
                  : "Never used"}
              </span>
              <span>
                Created{" "}
                {formatDistanceToNow(new Date(entry.metadata.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {entry.metadata.createdAt !== entry.metadata.updatedAt && (
                <span>
                  Updated{" "}
                  {formatDistanceToNow(new Date(entry.metadata.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(entry.id)}>
                  <Edit2Icon className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(entry.id)}>
                  <CopyIcon className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(entry.id)}
                  className="text-destructive"
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}
