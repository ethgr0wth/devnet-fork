import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  FileText, 
  Layers, 
  Camera, 
  Server, 
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Play,
  RotateCcw,
  ChevronDown,
  Filter,
  RefreshCw,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/queryClient";

interface ChangeLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  snapshot_id?: string;
  snapshot_version?: string;
  details?: Record<string, unknown>;
}

interface ChangeLogResponse {
  entries: ChangeLogEntry[];
  total: number;
  has_more: boolean;
}

const entityTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  directive: { icon: FileText, color: "bg-blue-500", label: "Directive" },
  template: { icon: Layers, color: "bg-purple-500", label: "Template" },
  snapshot: { icon: Camera, color: "bg-green-500", label: "Snapshot" },
  provider: { icon: Server, color: "bg-orange-500", label: "Provider" },
  api_key: { icon: Key, color: "bg-amber-500", label: "API Key" },
  takeover: { icon: UserCheck, color: "bg-red-500", label: "Human Takeover" }
};

const actionConfig: Record<string, { icon: React.ElementType; color: string }> = {
  created: { icon: Plus, color: "text-green-500" },
  updated: { icon: Edit, color: "text-blue-500" },
  deleted: { icon: Trash2, color: "text-red-500" },
  deactivated: { icon: Trash2, color: "text-orange-500" },
  deployed: { icon: Play, color: "text-purple-500" },
  restored: { icon: RotateCcw, color: "text-teal-500" },
  triggered: { icon: UserCheck, color: "text-red-500" }
};

function formatTimestamp(timestamp: string): string {
  try {
    const date = parseISO(timestamp);
    return format(date, "MMM d, HH:mm");
  } catch {
    return timestamp;
  }
}

function formatDetailValue(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if ("from" in obj && "to" in obj) {
      return `${obj.from} → ${obj.to}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export default function ChangeLog() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, refetch } = useQuery<ChangeLogResponse>({
    queryKey: ["/api/change-log", entityTypeFilter, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (entityTypeFilter !== "all") {
        params.append("entity_type", entityTypeFilter);
      }
      const res = await apiFetch(`/api/change-log?${params}`);
      if (!res.ok) throw new Error("Failed to fetch change log");
      return res.json();
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/change-log/stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/change-log/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const entries = data?.entries || [];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="title-changelog">
            <History className="h-8 w-8 text-primary" />
            AI Change Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Track who changed what, when, and why
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total_changes}</div>
              <div className="text-sm text-muted-foreground">Total Changes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-directives">{stats.by_type?.directive || 0}</div>
              <div className="text-sm text-muted-foreground">Directive Changes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-templates">{stats.by_type?.template || 0}</div>
              <div className="text-sm text-muted-foreground">Template Changes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-snapshots">{stats.by_type?.snapshot || 0}</div>
              <div className="text-sm text-muted-foreground">Snapshot Changes</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter
            </CardTitle>
            <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setOffset(0); }}>
              <SelectTrigger className="w-48" data-testid="select-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="directive">Directives</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="snapshot">Snapshots</SelectItem>
                <SelectItem value="provider">Providers</SelectItem>
                <SelectItem value="api_key">API Keys</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Changes</CardTitle>
          <CardDescription>
            {data?.total || 0} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No changes recorded yet</p>
              <p className="text-sm mt-2">Changes to directives, templates, and snapshots will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                <AnimatePresence>
                  {entries.map((entry, index) => {
                    const typeConfig = entityTypeConfig[entry.entity_type] || entityTypeConfig.directive;
                    const actConfig = actionConfig[entry.action] || actionConfig.updated;
                    const TypeIcon = typeConfig.icon;
                    const ActionIcon = actConfig.icon;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="relative"
                      >
                        <div className="flex gap-4 py-4 hover:bg-muted/50 rounded-lg px-3 transition-colors">
                          <div className="flex flex-col items-center">
                            <div className={`p-2 rounded-full ${typeConfig.color} text-white`}>
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            {index < entries.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border mt-2" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium" data-testid={`entry-user-${entry.id}`}>
                                    {entry.user_name || entry.user_id}
                                  </span>
                                  <span className={`flex items-center gap-1 ${actConfig.color}`}>
                                    <ActionIcon className="h-3 w-3" />
                                    {entry.action}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {typeConfig.label}
                                  </Badge>
                                </div>
                                
                                {entry.entity_name && (
                                  <p className="text-sm font-medium mt-1" data-testid={`entry-name-${entry.id}`}>
                                    "{entry.entity_name}"
                                  </p>
                                )}
                                
                                {entry.details && Object.keys(entry.details).length > 0 && (
                                  <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                                    {Object.entries(entry.details).slice(0, 3).map(([key, value]) => (
                                      <div key={key} className="flex gap-2">
                                        <span className="text-muted-foreground capitalize">{key}:</span>
                                        <span className="truncate">{formatDetailValue(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {entry.snapshot_id && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <Camera className="h-3 w-3" />
                                    Snapshot: {entry.snapshot_version || entry.snapshot_id}
                                  </div>
                                )}
                              </div>
                              
                              <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`entry-time-${entry.id}`}>
                                {formatTimestamp(entry.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {index < entries.length - 1 && <Separator className="ml-12" />}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              
              {data?.has_more && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => setOffset(offset + limit)}
                    data-testid="button-load-more"
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
