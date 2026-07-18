import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Folder, Code2, Clock, Trash2, Settings,
  ChevronRight, Search, LayoutGrid, List, Rocket,
  AlertCircle, Check, X, Sparkles, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/queryClient";

interface QuestsEnvironment {
  id: string;
  name: string;
  description?: string;
  template_id?: string;
  llm_provider?: string;
  llm_model?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: string;
  thumbnail_url?: string;
  is_official: boolean;
}

interface QuestsStatus {
  enabled: boolean;
  environments_count: number;
  environments_limit: number;
  features: {
    chat: boolean;
    file_ops: boolean;
    templates: boolean;
    preview: boolean;
    build: boolean;
  };
}

export default function QuestsPortal() {
  const [, setLocation] = useLocation();
  const [environments, setEnvironments] = useState<QuestsEnvironment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [status, setStatus] = useState<QuestsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvDescription, setNewEnvDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [envsRes, templatesRes, statusRes] = await Promise.all([
        apiFetch("/api/keystone/environments").then(r => r.json()),
        apiFetch("/api/keystone/templates").then(r => r.json()),
        apiFetch("/api/keystone/status").then(r => r.json())
      ]);
      setEnvironments(Array.isArray(envsRes) ? envsRes : (envsRes.environments || []));
      setTemplates(templatesRes || []);
      setStatus(statusRes);
    } catch (error) {
      console.error("Failed to load KeyStone data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createEnvironment = async () => {
    if (!newEnvName.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await apiFetch("/api/keystone/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEnvName.trim(),
          description: newEnvDescription.trim() || undefined,
          template_id: selectedTemplate || undefined
        })
      }).then(r => r.json());
      
      setShowCreateDialog(false);
      setNewEnvName("");
      setNewEnvDescription("");
      setSelectedTemplate("");
      
      await loadData();
      setLocation(`/keystone/${response.id}`);
    } catch (error) {
      console.error("Failed to create environment:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteEnvironment = async (envId: string) => {
    try {
      const response = await apiFetch(`/api/keystone/environments/${envId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setEnvironments(prev => prev.filter(e => e.id !== envId));
        loadData();
      }
    } catch (error) {
      console.error("Failed to delete environment:", error);
    }
  };

  const filteredEnvironments = environments.filter(env =>
    env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (env.description && env.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const canCreateMore = status ? status.environments_count < status.environments_limit : true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors flex-shrink-0" data-testid="link-back-dashboard">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 flex-shrink-0" />
                <h1 className="text-base sm:text-xl font-bold text-white truncate">KeyStone Builder</h1>
              </div>
            </div>
            
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={!canCreateMore}
              className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
              size="sm"
              data-testid="button-create-environment"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New Environment</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search environments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-slate-800 border-slate-700 text-white"
                data-testid="input-search-environments"
              />
            </div>
            
            <div className="flex items-center gap-1 border border-slate-700 rounded-lg p-1 flex-shrink-0">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {status && (
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-slate-400">
              {status.environments_count} of {status.environments_limit} environments used
            </p>
            {!canCreateMore && (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Environment limit reached. Upgrade for more.</span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : filteredEnvironments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Folder className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? "No environments found" : "No environments yet"}
            </h3>
            <p className="text-slate-400 mb-6 max-w-md">
              {searchQuery
                ? "Try a different search term"
                : "Create your first environment to start building with AI assistance"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                disabled={!canCreateMore}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-create-first-environment"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Environment
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <AnimatePresence>
              {filteredEnvironments.map((env) => (
                <motion.div
                  key={env.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  data-testid={`card-environment-${env.id}`}
                >
                  <Card className="bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group">
                    <CardHeader className="pb-3 px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                            <Code2 className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-white text-base truncate">{env.name}</CardTitle>
                            {env.template_id && (
                              <span className="text-xs text-slate-500">{env.template_id}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEnvironment(env.id);
                            }}
                            data-testid={`button-delete-${env.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <CardDescription className="text-slate-400 line-clamp-2 mb-3 text-sm">
                        {env.description || "No description"}
                      </CardDescription>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(env.updated_at).toLocaleDateString()}
                        </div>
                        <Link href={`/keystone/${env.id}`} data-testid={`link-open-${env.id}`} className="inline-flex">
                            <Button size="sm" variant="ghost" className="text-indigo-400">
                              Open
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEnvironments.map((env) => (
              <motion.div
                key={env.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid={`row-environment-${env.id}`}
              >
                <Card className="bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 transition-all">
                  <div className="flex items-center p-3 sm:p-4 gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                      <Code2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate text-sm sm:text-base">{env.name}</h3>
                      <p className="text-xs sm:text-sm text-slate-400 truncate">{env.description || "No description"}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(env.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Link href={`/keystone/${env.id}`} data-testid={`link-open-list-${env.id}`} className="inline-flex">
                          <Button size="sm" variant="secondary">
                            Open
                          </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-400"
                        onClick={() => deleteEnvironment(env.id)}
                        data-testid={`button-delete-list-${env.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 mx-4 sm:mx-auto max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Environment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set up a new development environment with AI assistance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Name</Label>
              <Input
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="My Awesome App"
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="input-env-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Description (optional)</Label>
              <Textarea
                value={newEnvDescription}
                onChange={(e) => setNewEnvDescription(e.target.value)}
                placeholder="What are you building?"
                className="bg-slate-800 border-slate-700 text-white resize-none"
                rows={3}
                data-testid="input-env-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Template (optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-template">
                  <SelectValue placeholder="Start from scratch or choose a template" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="blank" className="text-slate-300">Blank Project</SelectItem>
                  {Array.isArray(templates) && templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-slate-300">
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <span className="text-xs text-slate-500">({template.framework})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              className="text-slate-400"
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={createEnvironment}
              disabled={!newEnvName.trim() || isCreating}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-confirm-create"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Create Environment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
