import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  FileText, Plus, Settings, Trash2, Eye, Edit,
  Globe, Calendar, LayoutGrid, ArrowRight, Loader2,
  PenTool, ChevronRight, BookOpen, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/UpgradeModal";
import { useEpicErrorModal } from "@/components/ui/epic-error-modal";
import { apiFetch } from "@/lib/queryClient";

interface Blog {
  id: string;
  workspace_id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  theme: string;
  status: "active" | "paused" | "archived";
  created_at: string;
  updated_at: string;
}

interface BlogPost {
  id: string;
  blog_id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published" | "archived";
  created_at: string;
}

export default function BlogDashboard() {
  const [, setLocation] = useLocation();
  const { showUpgradeModal, UpgradeModalComponent } = useUpgradeModal();
  const { showError, ErrorModalComponent } = useEpicErrorModal();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, { total: number; published: number; draft: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBlog, setNewBlog] = useState({
    title: "",
    slug: "",
    description: "",
    workspace_id: "default"
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      const res = await apiFetch("/api/blog/blogs");
      if (res.status === 401) {
        setLocation("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setBlogs(data);
        const counts: Record<string, { total: number; published: number; draft: number }> = {};
        for (const blog of data) {
          const postsRes = await apiFetch(`/api/blog/blogs/${blog.id}/posts`);
          if (postsRes.ok) {
            const posts: BlogPost[] = await postsRes.json();
            counts[blog.id] = {
              total: posts.length,
              published: posts.filter(p => p.status === "published").length,
              draft: posts.filter(p => p.status === "draft").length
            };
          }
        }
        setPostCounts(counts);
      }
    } catch (error) {
      console.error("Failed to load blogs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  };

  const handleCreateBlog = async () => {
    if (!newBlog.title.trim()) return;
    setIsCreating(true);
    try {
      const res = await apiFetch("/api/blog/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBlog,
          slug: newBlog.slug || generateSlug(newBlog.title)
        })
      });
      if (res.status === 402) {
        setIsCreating(false);
        showUpgradeModal("Blog Creation");
        return;
      }
      if (res.ok) {
        const blog = await res.json();
        setBlogs([...blogs, blog]);
        setShowCreateDialog(false);
        setNewBlog({ title: "", slug: "", description: "", workspace_id: "default" });
        setLocation(`/blog/${blog.slug}/posts`);
      } else {
        const error = await res.json();
        showError({
          title: "Blog Creation Failed",
          message: "We couldn't create your new blog. Please try again.",
          technicalDetails: `Error: ${error.detail || "Unknown error"}`
        });
      }
    } catch (error) {
      console.error("Failed to create blog:", error);
      showError({
        title: "Connection Error",
        message: "Unable to reach the server. Please check your connection and try again.",
        technicalDetails: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/blog/blogs/${blogId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setBlogs(blogs.filter(b => b.id !== blogId));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete blog:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge data-testid="badge-status-active" className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "paused":
        return <Badge data-testid="badge-status-paused" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Paused</Badge>;
      case "archived":
        return <Badge data-testid="badge-status-archived" className="bg-gray-500/20 text-gray-400 border-gray-500/30">Archived</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors" data-testid="link-dashboard">
                  ← Dashboard
              </Link>
              <div className="h-4 w-px bg-gray-700" />
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-400" />
                <h1 className="text-lg font-semibold">Blog Platform</h1>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-blog" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Blog
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Blog</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Set up a new blog with AI-powered content generation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Blog Title</Label>
                    <Input
                      id="title"
                      data-testid="input-blog-title"
                      placeholder="My Awesome Blog"
                      value={newBlog.title}
                      onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug (optional)</Label>
                    <Input
                      id="slug"
                      data-testid="input-blog-slug"
                      placeholder="my-awesome-blog"
                      value={newBlog.slug}
                      onChange={(e) => setNewBlog({ ...newBlog, slug: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                    />
                    <p className="text-xs text-gray-500">Leave blank to auto-generate from title</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      data-testid="input-blog-description"
                      placeholder="A blog about..."
                      value={newBlog.description}
                      onChange={(e) => setNewBlog({ ...newBlog, description: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBlog}
                    disabled={isCreating || !newBlog.title.trim()}
                    data-testid="button-confirm-create"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Blog"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {blogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <PenTool className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No blogs yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first blog to start generating AI-powered content and reach your audience.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-first-blog"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Blog
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  data-testid={`card-blog-${blog.id}`}
                  className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-white truncate">
                          {blog.title}
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1 flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          <span className="truncate">/{blog.slug}</span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(blog.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {blog.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">{blog.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span data-testid={`text-post-count-${blog.id}`}>
                          {postCounts[blog.id]?.total || 0} posts
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{postCounts[blog.id]?.published || 0} published</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(blog.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                      <Link href={`/p/${blog.slug}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-public-${blog.id}`}
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/blog/${blog.slug}/posts`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-posts-${blog.id}`}
                          className="flex-1 text-gray-300 hover:text-white hover:bg-gray-800"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Posts
                        </Button>
                      </Link>
                      <Link href={`/blog/${blog.slug}/settings`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-settings-${blog.id}`}
                          className="text-gray-300 hover:text-white hover:bg-gray-800"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Dialog open={deleteConfirm === blog.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-delete-${blog.id}`}
                            onClick={() => setDeleteConfirm(blog.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800 text-white">
                          <DialogHeader>
                            <DialogTitle>Delete Blog</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Are you sure you want to delete "{blog.title}"? This will permanently delete all posts and settings.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="ghost"
                              onClick={() => setDeleteConfirm(null)}
                              data-testid="button-cancel-delete"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteBlog(blog.id)}
                              disabled={isDeleting}
                              data-testid="button-confirm-delete"
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Blog"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      
      <UpgradeModalComponent />
      <ErrorModalComponent />
    </div>
  );
}
