import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Calendar, 
  ArrowUpDown, 
  ChevronDown,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Star
} from "lucide-react";
import { apiFetch } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  email: string;
  client_id: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

type SortField = "created_at" | "email" | "source" | "status";
type SortOrder = "asc" | "desc";

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const limit = 25;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const res = await apiFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead updated", description: "Status changed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead status", variant: "destructive" });
    }
  });

  const { data, isLoading, refetch } = useQuery<LeadsResponse>({
    queryKey: ["leads", statusFilter, sourceFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      const res = await apiFetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    }
  });

  const filteredAndSortedLeads = useMemo(() => {
    if (!data?.leads) return [];
    
    let filtered = data.leads;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.email.toLowerCase().includes(searchLower) ||
        lead.client_id.toLowerCase().includes(searchLower) ||
        lead.source.toLowerCase().includes(searchLower)
      );
    }
    
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "source":
          comparison = a.source.localeCompare(b.source);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "created_at":
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [data?.leads, search, sortField, sortOrder]);

  const stats = useMemo(() => {
    if (!data?.leads) return { total: 0, new: 0, contacted: 0, converted: 0 };
    const leads = data.leads;
    return {
      total: data.total,
      new: leads.filter(l => l.status === "new").length,
      contacted: leads.filter(l => l.status === "contacted").length,
      converted: leads.filter(l => l.status === "converted").length
    };
  }, [data]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const exportToCSV = () => {
    if (!filteredAndSortedLeads.length) return;
    
    const headers = ["Email", "Source", "Status", "Captured At", "Client ID"];
    const rows = filteredAndSortedLeads.map(lead => [
      lead.email,
      lead.source,
      lead.status,
      lead.created_at ? format(new Date(lead.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      lead.client_id || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "contacted": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "qualified": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "converted": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "lost": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-white/10 text-white/60 border-white/20";
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "widget": return "🔌";
      case "sdk": return "📦";
      case "wordpress": return "📝";
      case "landing": return "🏠";
      case "api": return "⚡";
      default: return "📥";
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Lead Generation</h1>
            <p className="text-white/50">Track and manage captured leads from all channels</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-black/40 border border-white/10 hover:bg-white/10 transition-colors"
              data-testid="button-refresh-leads"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={exportToCSV}
              disabled={!filteredAndSortedLeads.length}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-black font-medium hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-white/50 text-sm">Total Leads</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-total-leads">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/40 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-white/50 text-sm">New</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-new-leads">{stats.new}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/40 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Mail className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-white/50 text-sm">Contacted</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-contacted-leads">{stats.contacted}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-black/40 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-white/50 text-sm">Converted</span>
            </div>
            <p className="text-3xl font-bold" data-testid="stat-converted-leads">{stats.converted}</p>
          </motion.div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, client ID, or source..."
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                data-testid="input-search-leads"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/40" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                data-testid="select-source-filter"
              >
                <option value="all">All Sources</option>
                <option value="widget">Widget</option>
                <option value="sdk">SDK</option>
                <option value="wordpress">WordPress</option>
                <option value="landing">Landing Page</option>
                <option value="api">API</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50 text-sm">
                  <th 
                    className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("source")}
                  >
                    <div className="flex items-center gap-2">
                      Source
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-2">
                      Captured
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-white/40">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Loading leads...
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-white/40">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No leads found</p>
                      <p className="text-sm mt-1">Leads will appear here when visitors submit their email</p>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedLeads.map((lead, idx) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-white/5 hover:bg-black/40 transition-colors"
                      data-testid={`row-lead-${lead.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-white/40" />
                          <span className="font-medium">{lead.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span>{getSourceIcon(lead.source)}</span>
                          <span className="capitalize">{lead.source}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {lead.created_at ? format(new Date(lead.created_at), "MMM d, yyyy h:mm a") : "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: "contacted" })}
                            disabled={updateStatusMutation.isPending || lead.status === "contacted"}
                            className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark as contacted"
                            data-testid={`button-contact-${lead.id}`}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: "qualified" })}
                            disabled={updateStatusMutation.isPending || lead.status === "qualified"}
                            className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark as qualified"
                            data-testid={`button-qualify-${lead.id}`}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: "converted" })}
                            disabled={updateStatusMutation.isPending || lead.status === "converted"}
                            className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark as converted"
                            data-testid={`button-convert-${lead.id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateStatusMutation.mutate({ leadId: lead.id, status: "lost" })}
                            disabled={updateStatusMutation.isPending || lead.status === "lost"}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark as lost"
                            data-testid={`button-lost-${lead.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.total > limit && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-white/50 text-sm">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} leads
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-prev-page"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= data.total}
                  className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="button-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
