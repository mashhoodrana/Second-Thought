"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Plus, 
  LogOut, 
  Menu, 
  X, 
  FileText,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Trash2
} from "lucide-react";
import { listInvestigations, deleteInvestigation } from "@/lib/api-client";
import type { InvestigationResponse } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";

interface SidebarProps {
  user: any;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [history, setHistory] = useState<InvestigationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await listInvestigations();
      setHistory(res);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch history on path change
  useEffect(() => {
    fetchHistory();
  }, [pathname]);

  // Automatically poll history if any session is in pending or processing status
  useEffect(() => {
    const isProcessingAny = history.some(
      (item) => item.status === "processing" || item.status === "pending"
    );
    if (!isProcessingAny) return;

    const interval = setInterval(() => {
      listInvestigations().then((res) => setHistory(res)).catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [history]);

  // Restore collapse state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("st_sidebar_collapsed");
      if (saved) setIsCollapsed(saved === "true");
    } catch {}
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuSessionId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("st_sidebar_collapsed", String(next));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteInvestigation(sessionId);
      setConfirmDeleteSessionId(null);
      showToast("Investigation deleted.");
      
      // If the deleted investigation is currently open, navigate to /investigate
      if (pathname === `/investigate/${sessionId}`) {
        router.push("/investigate");
      }
      fetchHistory();
    } catch (err: any) {
      console.error("Failed to delete session:", err);
      showToast(err.message || "Failed to delete investigation.");
    }
  };

  // Grouping history logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const today: InvestigationResponse[] = [];
  const yesterday: InvestigationResponse[] = [];
  const previous: InvestigationResponse[] = [];

  history.forEach((item) => {
    const itemDate = new Date(item.created_at);
    if (itemDate >= startOfToday) {
      today.push(item);
    } else if (itemDate >= startOfYesterday) {
      yesterday.push(item);
    } else {
      previous.push(item);
    }
  });

  const renderHistoryItem = (item: InvestigationResponse) => {
    const isActive = pathname === `/investigate/${item.session_id}`;
    const title = item.title || "Untitled Investigation";

    if (isCollapsed) {
      const isConfirming = confirmDeleteSessionId === item.session_id;

      if (isConfirming) {
        return (
          <div
            key={item.session_id}
            className="flex flex-col items-center justify-center gap-1 bg-red-50/50 border border-signal-danger/25 rounded-xl p-1 h-12 w-10 my-1 animate-in zoom-in duration-200"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteSession(item.session_id);
              }}
              title="Confirm Delete"
              className="text-signal-danger hover:text-red-700 p-0.5 rounded cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDeleteSessionId(null);
              }}
              title="Cancel"
              className="text-muted hover:text-foreground p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }

      return (
        <div key={item.session_id} className="relative group/item flex items-center justify-center w-10 h-10">
          <Link
            href={`/investigate/${item.session_id}`}
            onClick={() => setIsOpen(false)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all relative ${
              isActive
                ? "bg-surface-soft text-brand-primary"
                : "text-muted hover:bg-surface-soft hover:text-foreground"
            }`}
            title={title}
          >
            <FileText className={`h-4 w-4 shrink-0 ${isActive ? "text-brand-primary" : "text-muted"}`} />
            {item.status === "processing" && (
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-brand-primary animate-ping" />
            )}
            {item.status === "pending" && (
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-signal-warning" />
            )}
          </Link>

          {/* Three-dot menu button in collapsed state */}
          <div className="absolute right-0 top-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveMenuSessionId(activeMenuSessionId === item.session_id ? null : item.session_id);
              }}
              className="opacity-0 group-hover/item:opacity-100 p-0.5 bg-surface-card hover:bg-surface-soft border border-border-default rounded-full text-muted hover:text-foreground shadow-sm cursor-pointer text-[10px] flex items-center justify-center"
            >
              ⋮
            </button>
            
            {activeMenuSessionId === item.session_id && (
              <div className="absolute left-6 top-0 w-20 bg-surface-card border border-border-default rounded-lg shadow-md z-20 py-1 text-left animate-in fade-in duration-100">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDeleteSessionId(item.session_id);
                    setActiveMenuSessionId(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-signal-danger hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    const isConfirming = confirmDeleteSessionId === item.session_id;

    if (isConfirming) {
      return (
        <div
          key={item.session_id}
          className="bg-red-50/40 border border-signal-danger/25 rounded-lg p-2.5 my-1 space-y-2 animate-in slide-in-from-top-1 duration-200 text-left select-none"
        >
          <p className="text-[11px] font-bold text-foreground leading-tight">Delete this investigation?</p>
          <p className="text-[10px] text-muted leading-tight">Your thinking record for this investigation will be removed.</p>
          <div className="flex justify-end gap-1 text-[9px] font-bold uppercase tracking-wider">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDeleteSessionId(null);
              }}
              className="px-2 py-0.5 rounded border border-border-default hover:bg-surface-soft text-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteSession(item.session_id);
              }}
              className="px-2 py-0.5 rounded bg-signal-danger hover:bg-red-700 text-white cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={item.session_id} className="relative group/item flex items-center w-full">
        <Link
          href={`/investigate/${item.session_id}`}
          onClick={() => setIsOpen(false)}
          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors pr-8 ${
            isActive
              ? "bg-surface-soft text-brand-primary font-semibold"
              : "text-muted hover:bg-surface-soft hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-primary" : "text-muted"}`} />
            <span className="truncate">{title}</span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {item.status === "processing" && (
              <Loader2 className="h-3 w-3 animate-spin text-brand-primary" />
            )}
            {item.status === "pending" && (
              <span className="h-1.5 w-1.5 rounded-full bg-signal-warning" />
            )}
          </div>
        </Link>

        {/* Three-dot menu */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveMenuSessionId(activeMenuSessionId === item.session_id ? null : item.session_id);
            }}
            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-surface-soft rounded text-muted hover:text-foreground transition-all cursor-pointer font-bold text-[13px] px-1.5"
          >
            ⋮
          </button>
          
          {activeMenuSessionId === item.session_id && (
            <div className="absolute right-0 mt-1 w-20 bg-surface-card border border-border-default rounded-lg shadow-md z-20 py-1 text-left animate-in fade-in duration-100">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDeleteSessionId(item.session_id);
                  setActiveMenuSessionId(null);
                }}
                className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-signal-danger hover:bg-red-50 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-surface-card border-r border-border-default text-foreground select-none relative">
      {/* Brand Header */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-2 py-3 border-b border-border-default shrink-0">
          <Logo size="md" />
          <button
            onClick={handleToggleCollapse}
            className="text-muted hover:text-foreground p-1 rounded hover:bg-surface-soft transition-colors cursor-pointer flex items-center justify-center"
            title="Expand sidebar"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex h-14 items-center justify-between px-5 border-b border-border-default shrink-0">
          <div className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-sm font-bold tracking-tight text-foreground font-serif">
              Second Thought
            </span>
          </div>
          <button
            onClick={handleToggleCollapse}
            className="text-muted hover:text-foreground p-1 rounded hover:bg-surface-soft transition-colors cursor-pointer flex items-center justify-center"
            title="Collapse sidebar"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* New Investigation Button */}
      {isCollapsed ? (
        <div className="p-3 shrink-0 flex justify-center">
          <Link
            href="/investigate"
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary hover:bg-brand-hover text-white transition-all shadow-sm cursor-pointer"
            title="New Investigation"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <div className="p-4 shrink-0">
          <Link
            href="/investigate"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New investigation
          </Link>
        </div>
      )}



      {/* History */}
      <div className={`flex-1 overflow-y-auto px-3 py-4 space-y-4 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
        {!isCollapsed && (
          <span className="block px-3 text-[10px] font-bold uppercase tracking-wider text-muted/60 mb-1.5">
            Investigations
          </span>
        )}

        {loading && history.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
            {!isCollapsed && <span>Loading workspace...</span>}
          </div>
        ) : history.length === 0 ? (
          <p className="px-3 py-2 text-[10px] text-muted italic text-center">
            {!isCollapsed && "No past investigations."}
          </p>
        ) : (
          <div className={`space-y-3 w-full ${isCollapsed ? "flex flex-col items-center" : ""}`}>
            {/* Today */}
            {today.length > 0 && (
              <div className="space-y-1 w-full flex flex-col items-center">
                {!isCollapsed && (
                  <span className="block px-3 text-[9px] font-bold text-muted/40 uppercase tracking-widest self-start">
                    Today
                  </span>
                )}
                {today.map(renderHistoryItem)}
              </div>
            )}

            {/* Yesterday */}
            {yesterday.length > 0 && (
              <div className="space-y-1 w-full flex flex-col items-center">
                {!isCollapsed && (
                  <span className="block px-3 text-[9px] font-bold text-muted/40 uppercase tracking-widest self-start">
                    Yesterday
                  </span>
                )}
                {yesterday.map(renderHistoryItem)}
              </div>
            )}

            {/* Previous */}
            {previous.length > 0 && (
              <div className="space-y-1 w-full flex flex-col items-center">
                {!isCollapsed && (
                  <span className="block px-3 text-[9px] font-bold text-muted/40 uppercase tracking-widest self-start">
                    Previous
                  </span>
                )}
                {previous.map(renderHistoryItem)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {isCollapsed ? (
        <div className="border-t border-border-default p-3 bg-background shrink-0 flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20" title={user?.email}>
            <span className="text-[11px] font-bold uppercase text-brand-primary">
              {user?.email?.slice(0, 2) || "U"}
            </span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex h-8 w-8 items-center justify-center text-signal-danger hover:text-red-700 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="border-t border-border-default p-4 bg-background shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
              <span className="text-[10px] font-bold uppercase text-brand-primary">
                {user?.email?.slice(0, 2) || "U"}
              </span>
            </div>
            <div className="truncate flex-1">
              <p className="text-[10px] font-bold leading-tight text-foreground truncate select-all">{user?.email}</p>
              <p className="text-[8px] text-muted tracking-wider uppercase">Workspace User</p>
            </div>
          </div>

          <div className="flex items-center justify-center border-t border-border-default/50 pt-2.5">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-signal-danger hover:text-red-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert overlay */}
      {toastMessage && (
        <div className="absolute bottom-4 left-4 right-4 bg-foreground text-background text-xs py-2 px-3 rounded-lg shadow-md flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 z-50">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold cursor-pointer hover:opacity-75">✕</button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className={`hidden md:block shrink-0 h-full transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Trigger Header */}
      <div className="md:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-default bg-surface-card shadow-sm text-foreground hover:bg-surface-soft cursor-pointer"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-30 animate-in fade-in duration-200"
        />
      )}

      {/* Mobile Drawer Content */}
      <div
        className={`md:hidden fixed top-0 bottom-0 left-0 w-64 z-30 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
