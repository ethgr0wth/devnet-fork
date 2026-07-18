import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Shield,
  Plus,
  Clock,
  ArrowLeft,
  Trash2,
  RotateCcw,
  GitCompare,
  Target,
  Layers,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "@/lib/queryClient";

interface DirectiveSnapshot {
  id: string;
  content: string;
  directive_type: string;
  priority: number;
  active: boolean;
}

interface TemplateSnapshot {
  id: string;
  name: string;
  category: string;
}

interface PolicySnapshot {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  directives: DirectiveSnapshot[];
  templates: TemplateSnapshot[];
  knowledge_base_ids: string[];
  is_auto: boolean;
}

interface ComparisonResult {
  snapshot_a: PolicySnapshot;
  snapshot_b: PolicySnapshot;
  differences: {
    directives: {
      added: DirectiveSnapshot[];
      removed: DirectiveSnapshot[];
      changed: any[];
    };
    templates: {
      added: string[];
      removed: string[];
    };
    summary: {
      directives_added: number;
      directives_removed: number;
      directives_changed: number;
      templates_added: number;
      templates_removed: number;
    };
  };
}

export default function PolicySnapshotsPage() {
  const [snapshots, setSnapshots] = useState<PolicySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const [newSnapshot, setNewSnapshot] = useState({ name: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      const res = await apiFetch("/api/policy-snapshots");
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (error) {
      console.error("Failed to load snapshots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!newSnapshot.name.trim()) return;
    setIsCreating(true);
    try {
      const res = await apiFetch("/api/policy-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSnapshot)
      });
      if (res.ok) {
        const created = await res.json();
        setSnapshots(prev => [created, ...prev]);
        setNewSnapshot({ name: "", description: "" });
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error("Failed to create snapshot:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    setIsRestoring(snapshotId);
    try {
      const res = await apiFetch(`/api/policy-snapshots/${snapshotId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore_directives: true })
      });
      if (res.ok) {
        const result = await res.json();
        setRestoreSuccess(result.message);
        setTimeout(() => setRestoreSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Failed to restore snapshot:", error);
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      const res = await apiFetch(`/api/policy-snapshots/${snapshotId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      }
    } catch (error) {
      console.error("Failed to delete snapshot:", error);
    }
  };

  const handleCompare = async () => {
    if (selectedForCompare.length !== 2) return;
    try {
      const res = await apiFetch(
        `/api/policy-snapshots/compare/${selectedForCompare[0]}/${selectedForCompare[1]}`
      );
      if (res.ok) {
        const result = await res.json();
        setComparison(result);
        setShowCompareModal(true);
      }
    } catch (error) {
      console.error("Failed to compare snapshots:", error);
    }
  };

  const toggleCompareSelection = (snapshotId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(snapshotId)) {
        return prev.filter(id => id !== snapshotId);
      }
      if (prev.length < 2) {
        return [...prev, snapshotId];
      }
      return [prev[1], snapshotId];
    });
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          <span>Loading Policy Snapshots...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
              <img src="/favicon.png" alt="AiAssist" className="w-8 h-8 object-contain"  />
              <span className="font-display font-bold text-lg">AiAssist</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {restoreSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400">{restoreSuccess}</span>
          </motion.div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="w-7 h-7 text-cyan-400" />
              AI Policy Snapshots
            </h1>
            <p className="text-white/60 mt-1">
              Version control for AI behavior. Capture, compare, and restore configurations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedForCompare.length === 2 && (
              <button
                onClick={handleCompare}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-400 transition-colors flex items-center gap-2"
                data-testid="button-compare"
              >
                <GitCompare className="w-4 h-4" />
                Compare
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors flex items-center gap-2"
              data-testid="button-create-snapshot"
            >
              <Plus className="w-4 h-4" />
              Create Snapshot
            </button>
          </div>
        </div>

        {selectedForCompare.length > 0 && (
          <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-violet-400">
                {selectedForCompare.length} snapshot{selectedForCompare.length !== 1 ? "s" : ""} selected for comparison
              </span>
              <button
                onClick={() => setSelectedForCompare([])}
                className="text-xs text-white/50 hover:text-white"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {/* Snapshot Timeline */}
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <div className="text-center py-16 bg-white/5 border border-white/10 rounded-xl">
              <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Snapshots Yet</h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                Create your first policy snapshot to capture your current AI configuration.
                This enables rollbacks, compliance audits, and debugging.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors"
              >
                Create First Snapshot
              </button>
            </div>
          ) : (
            snapshots.map((snapshot, idx) => (
              <motion.div
                key={snapshot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white/5 border rounded-xl overflow-hidden transition-colors ${
                  selectedForCompare.includes(snapshot.id)
                    ? "border-violet-500/50"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleCompareSelection(snapshot.id)}
                        className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                          selectedForCompare.includes(snapshot.id)
                            ? "bg-violet-500 border-violet-500 text-white"
                            : "border-white/30 hover:border-white/50"
                        }`}
                        data-testid={`checkbox-compare-${snapshot.id}`}
                      >
                        {selectedForCompare.includes(snapshot.id) && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{snapshot.name}</h3>
                          {snapshot.is_auto && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                              Auto
                            </span>
                          )}
                        </div>
                        {snapshot.description && (
                          <p className="text-sm text-white/50 mt-1">{snapshot.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(snapshot.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {snapshot.directives.length} directives
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {snapshot.templates.length} templates
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreSnapshot(snapshot.id)}
                        disabled={isRestoring === snapshot.id}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Restore this snapshot"
                        data-testid={`button-restore-${snapshot.id}`}
                      >
                        {isRestoring === snapshot.id ? (
                          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setExpandedSnapshot(
                          expandedSnapshot === snapshot.id ? null : snapshot.id
                        )}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        data-testid={`button-expand-${snapshot.id}`}
                      >
                        {expandedSnapshot === snapshot.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete snapshot"
                        data-testid={`button-delete-${snapshot.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSnapshot === snapshot.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 overflow-hidden"
                    >
                      <div className="p-4 bg-black/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Directives */}
                          <div>
                            <h4 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Captured Directives ({snapshot.directives.length})
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {snapshot.directives.length === 0 ? (
                                <p className="text-xs text-white/40">No directives</p>
                              ) : (
                                snapshot.directives.map((d, i) => (
                                  <div key={i} className="p-2 bg-white/5 rounded text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        d.active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"
                                      }`}>
                                        {d.directive_type}
                                      </span>
                                      <span className="text-white/40">P{d.priority}</span>
                                    </div>
                                    <p className="text-white/70 line-clamp-2">{d.content}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Templates */}
                          <div>
                            <h4 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              Captured Templates ({snapshot.templates.length})
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {snapshot.templates.length === 0 ? (
                                <p className="text-xs text-white/40">No templates</p>
                              ) : (
                                snapshot.templates.map((t, i) => (
                                  <div key={i} className="p-2 bg-white/5 rounded text-xs flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-white/40" />
                                    <span className="text-white/70">{t.name}</span>
                                    <span className="text-white/40 capitalize">({t.category})</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Create Snapshot Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Create Policy Snapshot</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Snapshot Name</label>
                  <input
                    type="text"
                    value={newSnapshot.name}
                    onChange={e => setNewSnapshot(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Pre-launch config"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/50"
                    data-testid="input-snapshot-name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Description (optional)</label>
                  <textarea
                    value={newSnapshot.description}
                    onChange={e => setNewSnapshot(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Why are you creating this snapshot?"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/50 resize-none"
                    data-testid="input-snapshot-description"
                  />
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400">
                    This snapshot will capture your current directives, templates, knowledge base references, and provider configuration.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSnapshot}
                  disabled={!newSnapshot.name.trim() || isCreating}
                  className="flex-1 px-4 py-3 bg-cyan-500 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-confirm-create"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Create Snapshot
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Modal */}
      <AnimatePresence>
        {showCompareModal && comparison && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCompareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-violet-400" />
                    Snapshot Comparison
                  </h2>
                  <p className="text-sm text-white/50 mt-1">
                    {comparison.snapshot_a.name} → {comparison.snapshot_b.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-2 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                      +{comparison.differences.summary.directives_added}
                    </div>
                    <div className="text-xs text-white/50">Directives Added</div>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400">
                      -{comparison.differences.summary.directives_removed}
                    </div>
                    <div className="text-xs text-white/50">Directives Removed</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {comparison.differences.summary.directives_changed}
                    </div>
                    <div className="text-xs text-white/50">Directives Changed</div>
                  </div>
                  <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-violet-400">
                      {comparison.differences.summary.templates_added + comparison.differences.summary.templates_removed}
                    </div>
                    <div className="text-xs text-white/50">Template Changes</div>
                  </div>
                </div>

                {/* Directive Changes */}
                {comparison.differences.directives.added.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-emerald-400 mb-2">+ Added Directives</h4>
                    <div className="space-y-2">
                      {comparison.differences.directives.added.map((d, i) => (
                        <div key={i} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-sm">
                          <span className="text-emerald-400">[{d.directive_type}]</span>
                          <span className="text-white/70 ml-2">{d.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {comparison.differences.directives.removed.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-400 mb-2">- Removed Directives</h4>
                    <div className="space-y-2">
                      {comparison.differences.directives.removed.map((d, i) => (
                        <div key={i} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                          <span className="text-red-400">[{d.directive_type}]</span>
                          <span className="text-white/70 ml-2 line-through">{d.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {comparison.differences.summary.directives_added === 0 &&
                 comparison.differences.summary.directives_removed === 0 &&
                 comparison.differences.summary.directives_changed === 0 &&
                 comparison.differences.summary.templates_added === 0 &&
                 comparison.differences.summary.templates_removed === 0 && (
                  <div className="text-center py-8">
                    <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-white/60">These snapshots are identical</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
