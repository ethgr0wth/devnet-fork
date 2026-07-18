import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Shield, Eye, Settings, Check, X, Layers, ChevronLeft, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/queryClient";

interface Environment {
  id: string;
  display_name: string;
  slug: string;
  is_primary: boolean;
}

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "member" | "viewer";
  environment_access: string[];
  joined_at: string;
}

interface LicenseOverview {
  license_id: string;
  plan_code: string;
  max_environments: number;
  used_environments: number;
  total_workspaces: number;
  total_api_keys: number;
  total_members: number;
}

const roleLabels: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  owner: { label: "Owner", color: "text-amber-400 bg-amber-500/20", icon: Shield },
  admin: { label: "Admin", color: "text-violet-400 bg-violet-500/20", icon: Shield },
  member: { label: "Member", color: "text-cyan-400 bg-cyan-500/20", icon: Users },
  viewer: { label: "Viewer", color: "text-gray-400 bg-gray-500/20", icon: Eye },
};

export default function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [overview, setOverview] = useState<LicenseOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{role?: string; environments?: string[]}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isOwner, setIsOwner] = useState(false);


  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [envRes, overviewRes] = await Promise.all([
        apiFetch("/api/environments/"),
        apiFetch("/api/environments/overview")
      ]);

      if (envRes.ok) {
        const envData = await envRes.json();
        setEnvironments(envData.environments || []);
        setIsOwner(envData.is_license_admin || false);
      }

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }

      const membersRes = await apiFetch("/api/environments/members");
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }
    } catch (err: any) {
      setError(friendlyError(err, "Failed to load team data. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member.id);
    setPendingChanges({
      role: member.role,
      environments: [...member.environment_access]
    });
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setPendingChanges({});
  };

  const handleToggleEnvironment = (envId: string) => {
    const current = pendingChanges.environments || [];
    if (current.includes(envId)) {
      setPendingChanges({
        ...pendingChanges,
        environments: current.filter(id => id !== envId)
      });
    } else {
      setPendingChanges({
        ...pendingChanges,
        environments: [...current, envId]
      });
    }
  };

  const handleSaveChanges = async (member: TeamMember) => {
    setIsSaving(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/environments/members/${member.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: pendingChanges.role,
          environment_ids: pendingChanges.environments
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update member");
      }

      setMessage("Member updated successfully");
      setEditingMember(null);
      setPendingChanges({});
      loadData();
    } catch (err: any) {
      setMessage(friendlyError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.display_name || member.email} from the team? They will lose access to all environments.`)) {
      return;
    }
    
    setMessage("");
    try {
      const res = await apiFetch(`/api/environments/members/${member.user_id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to remove member");
      }

      setMessage("Member removed successfully");
      loadData();
    } catch (err: any) {
      setMessage(friendlyError(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white" data-testid="page-title">
                  Team Members
                </h1>
                <p className="text-white/60">
                  Manage team access and environment permissions
                </p>
              </div>
            </div>
            {overview && (
              <div className="text-right text-sm text-white/50">
                <div>{overview.total_members} member{overview.total_members !== 1 ? "s" : ""}</div>
                <div>{overview.used_environments}/{overview.max_environments === -1 ? "∞" : overview.max_environments} environments</div>
              </div>
            )}
          </div>
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg border ${
              message.includes("success") 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
            data-testid="message-banner"
          >
            {message}
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400" data-testid="error-message">
            {error}
          </div>
        ) : members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-semibold text-white mb-2">No team members yet</h3>
            <p className="text-white/50 mb-6">
              Distribute license keys from your dashboard to add team members
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {members.map((member, idx) => {
              const roleInfo = roleLabels[member.role] || roleLabels.member;
              const RoleIcon = roleInfo.icon;
              const isEditing = editingMember === member.id;

              return (
                <div
                  key={member.id}
                  className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-6"
                  data-testid={`member-card-${idx}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                        {(member.display_name || member.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate" data-testid={`member-name-${idx}`}>
                            {member.display_name || member.email}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleInfo.color}`}>
                            <RoleIcon className="w-3 h-3 inline mr-1" />
                            {roleInfo.label}
                          </span>
                        </div>
                        <div className="text-sm text-white/50 truncate">{member.email}</div>
                        <div className="text-xs text-white/30 mt-1">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          environments.map(env => (
                            <button
                              key={env.id}
                              onClick={() => handleToggleEnvironment(env.id)}
                              className={`px-2 py-1 rounded text-xs transition-colors ${
                                (pendingChanges.environments || []).includes(env.id)
                                  ? "bg-violet-500 text-white"
                                  : "bg-white/10 text-white/50 hover:bg-white/20"
                              }`}
                              data-testid={`toggle-env-${env.slug}-${idx}`}
                            >
                              <Layers className="w-3 h-3 inline mr-1" />
                              {env.display_name}
                            </button>
                          ))
                        ) : (
                          member.environment_access.length > 0 ? (
                            environments
                              .filter(e => member.environment_access.includes(e.id))
                              .map(env => (
                                <span
                                  key={env.id}
                                  className="px-2 py-1 rounded text-xs bg-white/10 text-white/70"
                                >
                                  <Layers className="w-3 h-3 inline mr-1" />
                                  {env.display_name}
                                </span>
                              ))
                          ) : (
                            <span className="text-xs text-white/40">No environment access</span>
                          )
                        )}
                      </div>

                      {member.role === "owner" && isOwner && (
                      <div className="text-xs text-amber-400/60 bg-amber-500/10 px-2 py-1 rounded">
                        You have full access to all environments
                      </div>
                    )}

                    {isOwner && member.role !== "owner" && (
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <select
                                value={pendingChanges.role || member.role}
                                onChange={(e) => setPendingChanges({...pendingChanges, role: e.target.value})}
                                className="px-2 py-1 bg-black/30 border border-white/20 rounded text-sm text-white [&>option]:bg-slate-900 [&>option]:text-white"
                                data-testid={`select-role-${idx}`}
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => handleSaveChanges(member)}
                                disabled={isSaving}
                                className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded transition-colors disabled:opacity-50"
                                data-testid={`button-save-${idx}`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                                data-testid={`button-cancel-${idx}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditMember(member)}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                                data-testid={`button-edit-${idx}`}
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member)}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                                data-testid={`button-remove-${idx}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {!isLoading && environments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 p-6 bg-black/40 border border-white/10 rounded-xl"
          >
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Environment Access Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {environments.map(env => {
                const accessCount = members.filter(m => 
                  m.environment_access.includes(env.id)
                ).length;
                
                return (
                  <div
                    key={env.id}
                    className="p-4 bg-black/40 rounded-lg border border-white/10"
                    data-testid={`env-summary-${env.slug}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{env.display_name}</span>
                      {env.is_primary && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white/50">
                      {accessCount} member{accessCount !== 1 ? "s" : ""} with access
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
