import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Layers, Plus, Settings2, Trash2, Archive, MoreVertical, 
  Check, Users, Key, MessageSquare, ChevronLeft, Sparkles, Edit2, Save, X
} from "lucide-react";
import { apiFetch, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Environment {
  id: string;
  slug: string;
  display_name: string;
  license_id: string;
  status: string;
  is_primary: boolean;
  workspace_count: number;
  api_key_count: number;
  member_count: number;
  created_at: string;
}

interface EnvironmentListResponse {
  environments: Environment[];
  active_environment_id: string | null;
  max_environments: number;
  used_environments: number;
}

interface LicenseOverview {
  license_id: string;
  plan_code: string;
  max_environments: number;
  used_environments: number;
  total_workspaces: number;
  total_api_keys: number;
  total_members: number;
  environments: Environment[];
}

export default function Environments() {
  const [data, setData] = useState<EnvironmentListResponse | null>(null);
  const [overview, setOverview] = useState<LicenseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [newEnvName, setNewEnvName] = useState("");
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const handleInitialize = async () => {
    if (initializing) return;
    
    setInitializing(true);
    try {
      const res = await apiFetch("/api/environments/initialize", {
        method: "POST"
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to initialize environment");
      }
      
      await loadData();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setInitializing(false);
    }
  };

  const loadData = async () => {
    try {
      const [envRes, overviewRes] = await Promise.all([
        apiFetch("/api/environments/"),
        apiFetch("/api/environments/overview")
      ]);
      
      if (envRes.status === 403) {
        setError("You need a Secure or Enterprise license to use environments.");
        setLoading(false);
        return;
      }
      
      if (!envRes.ok) throw new Error("Failed to load environments");
      
      const envData = await envRes.json();
      setData(envData);
      
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }
      
      setError(null);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!newEnvName.trim() || creating) return;
    
    setCreating(true);
    try {
      const res = await apiFetch("/api/environments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newEnvName.trim() })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create environment");
      }
      
      const created = await res.json();
      
      await apiFetch("/api/environments/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment_id: created.id })
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/user/workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys-extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/training-contexts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/response-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployed-agents"] });
      
      setShowCreateModal(false);
      setNewEnvName("");
      await loadData();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedEnv || archiving) return;
    
    setArchiving(true);
    try {
      const res = await apiFetch(`/api/environments/${selectedEnv.id}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to archive environment");
      }
      
      setShowArchiveModal(false);
      setSelectedEnv(null);
      await loadData();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setArchiving(false);
    }
  };

  const handleSaveEdit = async (envId: string) => {
    if (!editName.trim() || saving) return;
    
    setSaving(true);
    try {
      const res = await apiFetch(`/api/environments/${envId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: editName.trim() })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update environment");
      }
      
      setEditingId(null);
      setEditName("");
      await loadData();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSwitch = async (envId: string) => {
    try {
      const res = await apiFetch("/api/environments/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment_id: envId })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to switch environment");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/user/workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys-extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/training-contexts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/response-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployed-agents"] });
      
      await loadData();
    } catch (err: any) {
      setError(friendlyError(err));
    }
  };

  const canCreate = data && (data.max_environments === 0 || data.used_environments < data.max_environments);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading environments...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors" data-testid="link-back-dashboard">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              <span className="font-display font-bold text-lg">Environments</span>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <Layers className="w-12 h-12 text-violet-400/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Environments Not Available</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/pricing">
              <Button className="bg-gradient-to-r from-violet-500 to-cyan-500">
                Upgrade to Secure or Enterprise
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors" data-testid="link-back-dashboard">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              <span className="font-display font-bold text-lg">Environments</span>
            </div>
          </div>
          
          {canCreate && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600"
              data-testid="button-create-environment"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Environment
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-6"
          >
            <h2 className="text-lg font-semibold mb-4">License Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-400">{overview.used_environments}</div>
                <div className="text-xs text-muted-foreground">/ {overview.max_environments === 0 ? "unlimited" : overview.max_environments} environments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{overview.total_workspaces}</div>
                <div className="text-xs text-muted-foreground">Total Workspaces</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{overview.total_api_keys}</div>
                <div className="text-xs text-muted-foreground">Total API Keys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{overview.total_members}</div>
                <div className="text-xs text-muted-foreground">Team Members</div>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {(!data?.environments || data.environments.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/5 p-8 text-center"
          >
            <Layers className="w-12 h-12 text-violet-400/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Environments Yet</h2>
            <p className="text-muted-foreground mb-6">
              Initialize your primary environment to organize all your existing workspaces, API keys, directives, and team members.
            </p>
            <Button 
              onClick={handleInitialize}
              disabled={initializing}
              className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600"
              data-testid="button-initialize-environment"
            >
              {initializing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Initializing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Initialize Primary Environment
                </>
              )}
            </Button>
          </motion.div>
        )}

        <div className="grid gap-4">
          {data?.environments.map((env, index) => (
            <motion.div
              key={env.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl border p-6 transition-all ${
                env.id === data.active_environment_id 
                  ? "border-violet-500/50 bg-gradient-to-r from-violet-500/10 to-transparent" 
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
              data-testid={`card-environment-${env.slug}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {editingId === env.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-48"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(env.id)}
                          data-testid={`input-edit-name-${env.slug}`}
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleSaveEdit(env.id)}
                          disabled={saving}
                          data-testid={`button-save-edit-${env.slug}`}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setEditingId(null); setEditName(""); }}
                          data-testid={`button-cancel-edit-${env.slug}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">{env.display_name}</h3>
                        {env.is_primary && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-400">
                            Primary
                          </span>
                        )}
                        {env.id === data.active_environment_id && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>{env.workspace_count} workspaces</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      <span>{env.api_key_count} API keys</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{env.member_count} members</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {env.id !== data.active_environment_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitch(env.id)}
                      data-testid={`button-switch-to-${env.slug}`}
                    >
                      Switch
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-env-menu-${env.slug}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => { setEditingId(env.id); setEditName(env.display_name); }}
                        data-testid={`menuitem-rename-${env.slug}`}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {!env.is_primary && (
                        <DropdownMenuItem 
                          onClick={() => { setSelectedEnv(env); setShowArchiveModal(true); }}
                          className="text-red-400"
                          data-testid={`menuitem-archive-${env.slug}`}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Environment</DialogTitle>
            <DialogDescription>
              Environments let you isolate workspaces, API keys, and directives for different use cases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="env-name">Environment Name</Label>
              <Input
                id="env-name"
                placeholder="e.g., Sales Bot, Support Team"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                data-testid="input-new-env-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newEnvName.trim() || creating}
              className="bg-gradient-to-r from-violet-500 to-cyan-500"
              data-testid="button-confirm-create"
            >
              {creating ? "Creating..." : "Create Environment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Environment</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{selectedEnv?.display_name}"? 
              This will make all resources in this environment inaccessible. 
              The environment will be permanently deleted after 90 days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveModal(false)} data-testid="button-cancel-archive">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleArchive}
              disabled={archiving}
              data-testid="button-confirm-archive"
            >
              {archiving ? "Archiving..." : "Archive Environment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
