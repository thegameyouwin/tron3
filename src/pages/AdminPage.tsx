import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Settings, Database, CreditCard, Shield, ArrowLeft, Save, Users,
  CheckCircle2, XCircle, Clock, Bot, Plus, Trash2, Play, Square,
  DollarSign, Activity, BarChart3, Search, Filter, ChevronLeft,
  ChevronRight, RefreshCw, AlertTriangle, Edit2, TrendingUp, Zap,
  UserPlus, ShieldCheck, Mail, Smartphone, FileText, Bell, Globe,
  Eye, Lock, Server, AlertCircle, Megaphone
} from "lucide-react";
import { useSiteSettingsDB } from "@/hooks/useSiteSettingsDB";
import {
  useAdminTransactions, useAdminUsers, useAdminWallets, useAdminBots,
  useApproveTransaction, useManageBot, useAdminAddBalance
} from "@/hooks/useAdminData";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ALL_CRYPTOS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "tether", name: "Tether", symbol: "USDT" },
  { id: "solana", name: "Solana", symbol: "SOL" },
  { id: "binancecoin", name: "BNB", symbol: "BNB" },
  { id: "ripple", name: "Ripple", symbol: "XRP" },
  { id: "cardano", name: "Cardano", symbol: "ADA" },
  { id: "polkadot", name: "Polkadot", symbol: "DOT" },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  { id: "avalanche-2", name: "Avalanche", symbol: "AVAX" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK" },
  { id: "litecoin", name: "Litecoin", symbol: "LTC" },
  { id: "tron", name: "Tron", symbol: "TRX" },
  { id: "stellar", name: "Stellar", symbol: "XLM" },
];

type Tab = "overview" | "transactions" | "wallets" | "bots" | "users" | "kyc" | "roles" | "security_logs" | "announcements" | "email_tool" | "settings";

const formatNumber = (num: number) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
};

const inputClass = "w-full h-10 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";

// ─── KYC Management Tab ───
const KYCManagementTab = () => {
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase.from("kyc_documents").select("*").order("created_at", { ascending: false }).then(({ data }) => { setKycDocs(data || []); setLoading(false); });
  }, []);

  const updateKYCStatus = async (id: string, status: string, userId: string) => {
    await supabase.from("kyc_documents").update({ status }).eq("id", id);
    if (status === "approved") await supabase.from("profiles").update({ kyc_status: "verified" }).eq("user_id", userId);
    setKycDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    toast.success(`KYC document ${status}`);
  };

  const filtered = filter === "all" ? kycDocs : kycDocs.filter(d => d.status === filter);
  const pendingCount = kycDocs.filter(d => d.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-display font-bold text-foreground">KYC Verification</h2>
        {pendingCount > 0 && <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full font-medium">{pendingCount} pending</span>}
      </div>
      <div className="flex gap-2">{["all", "pending", "approved", "rejected"].map(f => (<Button key={f} variant={filter === f ? "gold" : "ghost"} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">{f}</Button>))}</div>
      {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
       filtered.length === 0 ? <p className="text-muted-foreground text-sm text-center py-12">No KYC documents found.</p> :
       <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 px-4">User ID</th><th className="text-left py-3 px-4">Document Type</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Submitted</th><th className="text-right py-3 px-4">Actions</th></tr></thead><tbody>{filtered.map((doc: any) => (<tr key={doc.id} className="border-b border-border/50 hover:bg-secondary/30"><td className="py-3 px-4 text-xs font-mono text-muted-foreground">{doc.user_id.slice(0, 12)}...</td><td className="py-3 px-4 text-foreground capitalize">{doc.document_type.replace(/_/g, " ")}</td><td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.status === "approved" ? "bg-profit/10 text-profit" : doc.status === "rejected" ? "bg-loss/10 text-loss" : "bg-primary/10 text-primary"}`}>{doc.status}</span></td><td className="py-3 px-4 text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</td><td className="py-3 px-4 text-right">{doc.status === "pending" && (<div className="flex gap-1 justify-end"><Button variant="ghost" size="sm" className="h-7 px-2 text-profit hover:bg-profit/10" onClick={() => updateKYCStatus(doc.id, "approved", doc.user_id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 px-2 text-loss hover:bg-loss/10" onClick={() => updateKYCStatus(doc.id, "rejected", doc.user_id)}><XCircle className="h-3.5 w-3.5" /></Button></div>)}</td></tr>))}</tbody></table></div></div>}
    </div>
  );
};

// ─── Roles Management Tab ───
const RolesManagementTab = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "moderator" | "user">("moderator");

  useEffect(() => {
    supabase.from("user_roles").select("*").order("created_at", { ascending: false }).then(({ data }) => { setRoles(data || []); setLoading(false); });
  }, []);

  const addRole = async () => {
    if (!newUserId) return toast.error("Enter a user ID");
    const { error } = await supabase.from("user_roles").insert({ user_id: newUserId, role: newRole });
    if (error) return toast.error(error.message);
    const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    setRoles(data || []);
    setNewUserId("");
    toast.success(`Role ${newRole} added`);
  };

  const removeRole = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    setRoles(prev => prev.filter(r => r.id !== id));
    toast.success("Role removed");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold text-foreground">User Roles Management</h2>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4" /> Assign Role</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" value={newUserId} onChange={e => setNewUserId(e.target.value)} placeholder="User ID" className={inputClass} />
          <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className={inputClass}>
            <option value="admin">Admin</option><option value="moderator">Moderator</option><option value="user">User</option>
          </select>
          <Button variant="gold" onClick={addRole}>Assign Role</Button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
       roles.length === 0 ? <p className="text-muted-foreground text-sm text-center py-12">No custom roles assigned.</p> :
       <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 px-4">User ID</th><th className="text-left py-3 px-4">Role</th><th className="text-left py-3 px-4">Assigned</th><th className="text-right py-3 px-4">Actions</th></tr></thead><tbody>{roles.map((r: any) => (<tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30"><td className="py-3 px-4 text-xs font-mono text-muted-foreground">{r.user_id.slice(0, 12)}...</td><td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.role === "admin" ? "bg-primary/10 text-primary" : r.role === "moderator" ? "bg-accent/10 text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>{r.role}</span></td><td className="py-3 px-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td><td className="py-3 px-4 text-right"><Button variant="ghost" size="sm" className="h-7 px-2 text-loss hover:bg-loss/10" onClick={() => removeRole(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>))}</tbody></table></div></div>}
    </div>
  );
};

// ─── Security Logs Tab ───
const SecurityLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("security_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const eventColors: Record<string, string> = {
    login: "bg-profit/10 text-profit",
    logout: "bg-muted text-muted-foreground",
    password_change: "bg-primary/10 text-primary",
    failed_login: "bg-loss/10 text-loss",
    withdrawal_request: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-foreground">Security Logs</h2>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); supabase.from("security_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => { setLogs(data || []); setLoading(false); }); }}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
      </div>
      {loading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
       logs.length === 0 ? <p className="text-muted-foreground text-sm text-center py-12">No security events recorded.</p> :
       <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 px-4">Event</th><th className="text-left py-3 px-4">User</th><th className="text-left py-3 px-4">IP</th><th className="text-left py-3 px-4">Details</th><th className="text-left py-3 px-4">Time</th></tr></thead><tbody>{logs.map((log: any) => (<tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30"><td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eventColors[log.event_type] || "bg-secondary text-muted-foreground"}`}>{log.event_type.replace(/_/g, " ")}</span></td><td className="py-3 px-4 text-xs font-mono text-muted-foreground">{log.user_id.slice(0, 12)}...</td><td className="py-3 px-4 text-xs text-muted-foreground">{log.ip_address || "—"}</td><td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">{log.details ? JSON.stringify(log.details).slice(0, 50) : "—"}</td><td className="py-3 px-4 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td></tr>))}</tbody></table></div></div>}
    </div>
  );
};

// ─── Email Tool Tab ───
const EmailToolTab = () => {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sentLog, setSentLog] = useState<{to: string; status: string; time: string}[]>([]);

  const handleSend = async () => {
    if (!recipients.trim() || !subject.trim() || !body.trim()) return toast.error("Fill in all fields");
    const emails = recipients.split(/[\n,;]+/).map(e => e.trim()).filter(e => e && e.includes("@"));
    if (emails.length === 0) return toast.error("No valid email addresses");
    setSending(true);
    const results: typeof sentLog = [];
    for (const to of emails) {
      try {
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: { template: "custom", to, data: { subject, html: body } },
        });
        results.push({ to, status: data?.sent ? "✅ Sent" : `❌ ${data?.reason || error?.message || "Failed"}`, time: new Date().toLocaleTimeString() });
      } catch (err: any) {
        results.push({ to, status: `❌ ${err.message}`, time: new Date().toLocaleTimeString() });
      }
    }
    setSentLog(prev => [...results, ...prev]);
    setSending(false);
    const successCount = results.filter(r => r.status.startsWith("✅")).length;
    toast.success(`Sent ${successCount}/${emails.length} emails`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold text-foreground">Email Tool</h2>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Compose Email</h3>
        <p className="text-xs text-muted-foreground">Send emails via Resend from <span className="font-mono text-foreground">support@tronnlix.com</span>. Enter one or multiple email addresses separated by commas or new lines.</p>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Recipients</label>
          <textarea value={recipients} onChange={e => setRecipients(e.target.value)} placeholder={"user1@example.com\nuser2@example.com"} className={inputClass + " h-20 resize-none py-3"} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Subject</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Body (HTML or plain text)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email content here... HTML is supported." className={inputClass + " h-40 resize-none py-3 font-mono text-xs"} />
        </div>
        <div className="flex gap-3">
          <Button variant="gold" onClick={handleSend} disabled={sending} className="gap-2">
            <Mail className="h-3.5 w-3.5" /> {sending ? "Sending..." : "Send Email"}
          </Button>
          <Button variant="outline" onClick={() => { setRecipients(""); setSubject(""); setBody(""); }}>Clear</Button>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Quick Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: "Welcome", subj: "Welcome to Tronnlix!", bodyTpl: '<h2>Welcome to Tronnlix!</h2><p>Thank you for joining us. Start by making your first deposit to unlock all features.</p><p>Best regards,<br/>Tronnlix Team</p>' },
            { label: "Deposit Reminder", subj: "Don't forget to deposit!", bodyTpl: '<h2>Your Account is Ready</h2><p>Hi there, we noticed you haven\'t made your first deposit yet. Fund your account to start trading with Tronnlix.</p><p>Minimum deposit: $30 USD.</p>' },
            { label: "Maintenance", subj: "Scheduled Maintenance Notice", bodyTpl: '<h2>Scheduled Maintenance</h2><p>We will be performing scheduled maintenance. During this time, some services may be temporarily unavailable.</p><p>Thank you for your patience.</p>' },
          ].map(t => (
            <button key={t.label} onClick={() => { setSubject(t.subj); setBody(t.bodyTpl); }} className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subj}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sent Log */}
      {sentLog.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Send Log</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSentLog([])}>Clear Log</Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sentLog.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-secondary/30">
                <span className="font-mono text-muted-foreground">{entry.to}</span>
                <span>{entry.status}</span>
                <span className="text-muted-foreground">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Announcements Tab ───
const AnnouncementsTab = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success">("info");

  const handleSend = () => {
    if (!title || !message) return toast.error("Fill in title and message");
    toast.success(`Announcement "${title}" sent to all users!`);
    setTitle("");
    setMessage("");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold text-foreground">Announcements & Notifications</h2>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Megaphone className="h-4 w-4" /> Send Announcement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title..." className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className={inputClass}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your announcement..." className={inputClass + " h-24 resize-none py-3"} />
        </div>
        <div className="flex gap-3">
          <Button variant="gold" onClick={handleSend} className="gap-2"><Bell className="h-3.5 w-3.5" /> Send to All Users</Button>
          <Button variant="outline" onClick={() => { setTitle(""); setMessage(""); }}>Clear</Button>
        </div>
      </div>
      {title && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Preview</h3>
          <div className={`p-4 rounded-lg border ${type === "warning" ? "bg-amber-500/10 border-amber-500/30" : type === "success" ? "bg-profit/10 border-profit/30" : "bg-primary/10 border-primary/30"}`}>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Page ───
const AdminPage = () => {
  const { settings, updateSetting, isLoading: settingsLoading } = useSiteSettingsDB();
  const { getSymbol } = useCryptoPrices();
  const [tab, setTab] = useState<Tab>("overview");
  const navigate = useNavigate();

  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = useAdminTransactions();
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useAdminUsers();
  const { data: allWallets = [], isLoading: walletsLoading, refetch: refetchWallets } = useAdminWallets();
  const { data: bots = [], isLoading: botsLoading, refetch: refetchBots } = useAdminBots();
  const approveTx = useApproveTransaction();
  const { createBot, updateBot, deleteBot } = useManageBot();
  const addBalance = useAdminAddBalance();

  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const itemsPerPage = 10;

  // Settings state
  const [localName, setLocalName] = useState(settings.site_name);
  const [localEmail, setLocalEmail] = useState(settings.support_email);
  const [localCryptos, setLocalCryptos] = useState(settings.enabled_cryptos);
  const [localWallets, setLocalWallets] = useState(settings.deposit_wallets);
  const [localMinDeposit, setLocalMinDeposit] = useState(settings.min_deposit);
  const [localMinWithdraw, setLocalMinWithdraw] = useState(settings.min_withdraw);
  const [localFee, setLocalFee] = useState(settings.withdraw_fee_percent);
  const [localMaintenance, setLocalMaintenance] = useState(settings.maintenance_mode || false);
  const [localReferralBonus, setLocalReferralBonus] = useState(settings.referral_bonus_percent || 10);
  const [localResendKey, setLocalResendKey] = useState((settings as any).resend_api_key || "");
  const [localKopoClientId, setLocalKopoClientId] = useState((settings as any).kopokopo_client_id || "");
  const [localKopoClientSecret, setLocalKopoClientSecret] = useState((settings as any).kopokopo_client_secret || "");
  const [localKopoTill, setLocalKopoTill] = useState((settings as any).kopokopo_till_number || "");
  const [localKopoBaseUrl, setLocalKopoBaseUrl] = useState((settings as any).kopokopo_api_base_url || "https://sandbox.kopokopo.com");

  // Bot creation state
  const [newBotName, setNewBotName] = useState("");
  const [newBotCrypto, setNewBotCrypto] = useState("bitcoin");
  const [newBotStrategy, setNewBotStrategy] = useState("market_making");
  const [newBotSpread, setNewBotSpread] = useState("0.5");
  const [newBotSize, setNewBotSize] = useState("0.1");
  const [newBotTier, setNewBotTier] = useState("free");
  const [newBotDesc, setNewBotDesc] = useState("");
  const [newBotIsAi, setNewBotIsAi] = useState(false);
  const [newBotMinStake, setNewBotMinStake] = useState("30");
  const [newBotDailyEarn, setNewBotDailyEarn] = useState("0");
  const [editingBot, setEditingBot] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [addBalanceUserId, setAddBalanceUserId] = useState("");
  const [addBalanceCrypto, setAddBalanceCrypto] = useState("usdt");
  const [addBalanceAmount, setAddBalanceAmount] = useState("");

  // Computed
  const pendingTx = transactions.filter((t: any) => t.status === "pending");
  const completedDeposits = transactions.filter((t: any) => t.type === "deposit" && t.status === "completed");
  const completedWithdrawals = transactions.filter((t: any) => t.type === "withdrawal" && t.status === "completed");
  const totalDeposited = completedDeposits.reduce((s: number, t: any) => s + Number(t.usd_amount), 0);
  const totalWithdrawn = completedWithdrawals.reduce((s: number, t: any) => s + Number(t.usd_amount), 0);
  const totalVolume = totalDeposited + totalWithdrawn;
  const activeBots = bots.filter((b: any) => b.status === "running").length;

  const filteredTransactions = useMemo(() => transactions.filter((tx: any) => tx.user_id.toLowerCase().includes(txSearch.toLowerCase()) || tx.crypto_id.toLowerCase().includes(txSearch.toLowerCase()) || tx.type.toLowerCase().includes(txSearch.toLowerCase())), [transactions, txSearch]);
  const paginatedTransactions = filteredTransactions.slice((txPage - 1) * itemsPerPage, txPage * itemsPerPage);
  const totalTxPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const filteredUsers = useMemo(() => users.filter((u: any) => u.user_id.toLowerCase().includes(userSearch.toLowerCase()) || (u.display_name && u.display_name.toLowerCase().includes(userSearch.toLowerCase()))), [users, userSearch]);
  const filteredWallets = useMemo(() => allWallets.filter((w: any) => w.user_id.toLowerCase().includes(walletSearch.toLowerCase()) || w.crypto_id.toLowerCase().includes(walletSearch.toLowerCase())), [allWallets, walletSearch]);

  const handleSaveSettings = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "site_name", value: localName }),
        updateSetting.mutateAsync({ key: "support_email", value: localEmail }),
        updateSetting.mutateAsync({ key: "enabled_cryptos", value: localCryptos }),
        updateSetting.mutateAsync({ key: "deposit_wallets", value: localWallets }),
        updateSetting.mutateAsync({ key: "min_deposit", value: localMinDeposit }),
        updateSetting.mutateAsync({ key: "min_withdraw", value: localMinWithdraw }),
        updateSetting.mutateAsync({ key: "withdraw_fee_percent", value: localFee }),
        updateSetting.mutateAsync({ key: "maintenance_mode", value: localMaintenance }),
        updateSetting.mutateAsync({ key: "referral_bonus_percent", value: localReferralBonus }),
        ...(localResendKey ? [updateSetting.mutateAsync({ key: "resend_api_key", value: localResendKey })] : []),
        ...(localKopoClientId ? [updateSetting.mutateAsync({ key: "kopokopo_client_id", value: localKopoClientId })] : []),
        ...(localKopoClientSecret ? [updateSetting.mutateAsync({ key: "kopokopo_client_secret", value: localKopoClientSecret })] : []),
        ...(localKopoTill ? [updateSetting.mutateAsync({ key: "kopokopo_till_number", value: localKopoTill })] : []),
        updateSetting.mutateAsync({ key: "kopokopo_api_base_url", value: localKopoBaseUrl }),
      ]);
      toast.success("Settings saved!");
    } catch (err: any) { toast.error("Failed: " + err.message); }
  };

  const toggleCrypto = (id: string) => setLocalCryptos(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const updateWalletAddress = (cryptoId: string, address: string) => setLocalWallets(prev => ({ ...prev, [cryptoId]: { ...(prev[cryptoId] || {}), address } }));

  const openEditBot = (bot: any) => {
    setEditingBot(bot);
    setNewBotName(bot.name); setNewBotCrypto(bot.crypto_id); setNewBotStrategy(bot.strategy);
    setNewBotSpread(bot.config?.spread_percent?.toString() || "0.5");
    setNewBotSize(bot.config?.order_size?.toString() || "0.1");
    setNewBotTier(bot.tier || "free"); setNewBotDesc(bot.description || ""); setNewBotIsAi(bot.is_ai || false);
    setNewBotMinStake(bot.min_stake?.toString() || "30"); setNewBotDailyEarn(bot.daily_earn?.toString() || "0");
    setEditModalOpen(true);
  };

  const handleUpdateBot = () => {
    if (!editingBot) return;
    updateBot.mutate({
      id: editingBot.id,
      updates: { name: newBotName, crypto_id: newBotCrypto, strategy: newBotStrategy, config: { spread_percent: Number(newBotSpread), order_size: Number(newBotSize), max_orders: 5 }, tier: newBotTier, description: newBotDesc, is_ai: newBotIsAi, min_stake: Number(newBotMinStake), daily_earn: Number(newBotDailyEarn) },
    });
    setEditModalOpen(false); setEditingBot(null);
  };

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "transactions", label: "Transactions", icon: Activity, badge: pendingTx.length },
    { key: "wallets", label: "Wallets", icon: CreditCard },
    { key: "bots", label: "Bots", icon: Bot },
    { key: "users", label: "Users", icon: Users },
    { key: "kyc", label: "KYC", icon: ShieldCheck },
    { key: "roles", label: "Roles", icon: Shield },
    { key: "security_logs", label: "Security", icon: Lock },
    { key: "announcements", label: "Announce", icon: Bell },
    { key: "email_tool", label: "Email", icon: Mail },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <Button variant="outline" size="sm" onClick={() => { refetchTx(); refetchUsers(); refetchWallets(); refetchBots(); toast.info("Refreshing..."); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Tab Bar — scrollable */}
        <div className="flex gap-1.5 mb-8 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? "gold" : "ghost"} size="sm" className="gap-1.5 shrink-0 text-xs" onClick={() => setTab(t.key)}>
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.slice(0, 4)}</span>
              {t.badge ? <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">{t.badge}</span> : null}
            </Button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
                { label: "Pending Txs", value: pendingTx.length, icon: Clock, color: "text-amber-400" },
                { label: "Active Bots", value: activeBots, icon: Bot, color: "text-accent-foreground" },
                { label: "Total Volume", value: `$${formatNumber(totalVolume)}`, icon: TrendingUp, color: "text-primary" },
                { label: "Total Deposits", value: `$${formatNumber(totalDeposited)}`, icon: ArrowLeft, color: "text-profit" },
                { label: "Total Withdrawals", value: `$${formatNumber(totalWithdrawn)}`, icon: ArrowLeft, color: "text-loss" },
                { label: "Bot Profit", value: `$${formatNumber(bots.reduce((s, b) => s + (b.total_profit || 0), 0))}`, icon: BarChart3, color: "text-profit" },
                { label: "Wallets", value: allWallets.length, icon: CreditCard, color: "text-primary" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2"><s.icon className={`h-4 w-4 ${s.color}`} /><span className="text-xs text-muted-foreground">{s.label}</span></div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
            {pendingTx.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary animate-pulse" /> Pending Approvals</h3>
                <div className="space-y-2">{pendingTx.slice(0, 5).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div><p className="text-sm font-medium text-foreground capitalize">{tx.type} — {getSymbol(tx.crypto_id)}</p><p className="text-xs text-muted-foreground">${Number(tx.usd_amount).toLocaleString()} • {tx.user_id.slice(0, 8)}...</p></div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="h-8 text-profit hover:bg-profit/10" onClick={() => approveTx.mutate({ txId: tx.id, action: "completed" })} disabled={approveTx.isPending}><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 text-loss hover:bg-loss/10" onClick={() => approveTx.mutate({ txId: tx.id, action: "rejected" })} disabled={approveTx.isPending}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        )}

        {/* ─── TRANSACTIONS ─── */}
        {tab === "transactions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-display font-bold text-foreground">All Transactions</h2>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><input type="text" placeholder="Search..." value={txSearch} onChange={e => { setTxSearch(e.target.value); setTxPage(1); }} className={`${inputClass} pl-8 w-64 h-8 text-xs`} /></div>
            </div>
            {txLoading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
             filteredTransactions.length === 0 ? <p className="text-muted-foreground text-sm text-center py-12">No transactions.</p> :
             <>
               <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 px-4">Type</th><th className="text-left py-3 px-4">Coin</th><th className="text-right py-3 px-4">Amount</th><th className="text-right py-3 px-4">USD</th><th className="text-left py-3 px-4">User</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Date</th><th className="text-right py-3 px-4">Actions</th></tr></thead><tbody>{paginatedTransactions.map((tx: any) => (<tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30"><td className={`py-3 px-4 font-medium capitalize ${tx.type === "deposit" ? "text-profit" : "text-loss"}`}>{tx.type}</td><td className="py-3 px-4">{getSymbol(tx.crypto_id)}</td><td className="py-3 px-4 text-right">{Number(tx.amount).toFixed(6)}</td><td className="py-3 px-4 text-right font-semibold">${Number(tx.usd_amount).toLocaleString()}</td><td className="py-3 px-4 text-xs font-mono text-muted-foreground">{tx.user_id.slice(0, 8)}...</td><td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.status === "completed" ? "bg-profit/10 text-profit" : tx.status === "rejected" ? "bg-loss/10 text-loss" : "bg-primary/10 text-primary"}`}>{tx.status}</span></td><td className="py-3 px-4 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td><td className="py-3 px-4 text-right">{tx.status === "pending" && (<div className="flex gap-1 justify-end"><Button variant="ghost" size="sm" className="h-7 px-2 text-profit hover:bg-profit/10" onClick={() => approveTx.mutate({ txId: tx.id, action: "completed" })} disabled={approveTx.isPending}><CheckCircle2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 px-2 text-loss hover:bg-loss/10" onClick={() => approveTx.mutate({ txId: tx.id, action: "rejected" })} disabled={approveTx.isPending}><XCircle className="h-3.5 w-3.5" /></Button></div>)}</td></tr>))}</tbody></table></div></div>
               {totalTxPages > 1 && <div className="flex justify-center gap-2"><Button variant="outline" size="sm" onClick={() => setTxPage(p => Math.max(1, p-1))} disabled={txPage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button><span className="text-sm text-muted-foreground">Page {txPage} of {totalTxPages}</span><Button variant="outline" size="sm" onClick={() => setTxPage(p => Math.min(totalTxPages, p+1))} disabled={txPage === totalTxPages}><ChevronRight className="h-3.5 w-3.5" /></Button></div>}
             </>}
          </div>
        )}

        {/* ─── WALLETS ─── */}
        {tab === "wallets" && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-bold text-foreground">User Wallets</h2>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add/Remove Balance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input type="text" value={addBalanceUserId} onChange={e => setAddBalanceUserId(e.target.value)} placeholder="User ID" className={inputClass} />
                <select value={addBalanceCrypto} onChange={e => setAddBalanceCrypto(e.target.value)} className={inputClass}>
                  <option value="usdt">USDT</option>{ALL_CRYPTOS.filter(c => c.id !== "tether").map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
                </select>
                <input type="number" value={addBalanceAmount} onChange={e => setAddBalanceAmount(e.target.value)} placeholder="Amount" className={inputClass} />
                <Button variant="gold" onClick={() => { if (!addBalanceUserId || !addBalanceAmount) return toast.error("Fill all fields"); addBalance.mutate({ userId: addBalanceUserId, cryptoId: addBalanceCrypto, amount: Number(addBalanceAmount) }); setAddBalanceAmount(""); }} disabled={addBalance.isPending}>{addBalance.isPending ? "..." : "Update Balance"}</Button>
              </div>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="text-sm font-semibold text-foreground">All Wallets</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><input type="text" placeholder="Search..." value={walletSearch} onChange={e => setWalletSearch(e.target.value)} className={`${inputClass} pl-8 w-64 h-8 text-xs`} /></div></div>
            {walletsLoading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
             filteredWallets.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">No wallets.</p> :
             <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 px-4">User ID</th><th className="text-left py-3 px-4">Coin</th><th className="text-right py-3 px-4">Balance</th><th className="text-left py-3 px-4">Updated</th></tr></thead><tbody>{filteredWallets.map((w: any) => (<tr key={w.id} className="border-b border-border/50"><td className="py-3 px-4 text-xs font-mono text-muted-foreground">{w.user_id.slice(0, 12)}...</td><td className="py-3 px-4 font-medium">{getSymbol(w.crypto_id)}</td><td className="py-3 px-4 text-right font-bold">{w.balance.toFixed(w.crypto_id === "usdt" ? 2 : 6)}</td><td className="py-3 px-4 text-xs text-muted-foreground">{new Date(w.updated_at).toLocaleDateString()}</td></tr>))}</tbody></table></div></div>}
          </div>
        )}

        {/* ─── BOTS ─── */}
        {tab === "bots" && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-bold text-foreground">Trading Bots Management</h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Plus className="h-4 w-4" /> Create Platform Bot</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">Bot Name</label><input type="text" value={newBotName} onChange={e => setNewBotName(e.target.value)} placeholder="e.g. Grid Bot" className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Crypto</label><select value={newBotCrypto} onChange={e => setNewBotCrypto(e.target.value)} className={inputClass}>{ALL_CRYPTOS.filter(c => c.id !== "tether").map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}</select></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Strategy</label><select value={newBotStrategy} onChange={e => setNewBotStrategy(e.target.value)} className={inputClass}><option value="market_making">Market Making</option><option value="trend_following">Trend Following</option><option value="arbitrage">Arbitrage</option><option value="momentum">Momentum</option></select></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Tier</label><select value={newBotTier} onChange={e => setNewBotTier(e.target.value)} className={inputClass}><option value="free">Free</option><option value="pro">Pro</option><option value="elite">Elite</option><option value="vip">VIP</option></select></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Min Stake (USDT)</label><input type="number" value={newBotMinStake} onChange={e => setNewBotMinStake(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Daily Earn %</label><input type="number" value={newBotDailyEarn} onChange={e => setNewBotDailyEarn(e.target.value)} step="0.01" className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Spread %</label><input type="number" value={newBotSpread} onChange={e => setNewBotSpread(e.target.value)} step="0.1" className={inputClass} /></div>
                <div className="flex items-center gap-2 pt-5"><input type="checkbox" id="isAi" checked={newBotIsAi} onChange={e => setNewBotIsAi(e.target.checked)} className="rounded accent-primary" /><label htmlFor="isAi" className="text-xs text-foreground">AI-Powered</label></div>
              </div>
              <div><label className="block text-xs text-muted-foreground mb-1">Description</label><textarea value={newBotDesc} onChange={e => setNewBotDesc(e.target.value)} placeholder="Bot description..." className={inputClass + " h-16 resize-none py-3"} /></div>
              <Button variant="gold" className="w-full" onClick={() => { if (!newBotName) return toast.error("Enter a bot name"); createBot.mutate({ name: newBotName, crypto_id: newBotCrypto, strategy: newBotStrategy, config: { spread_percent: Number(newBotSpread), order_size: Number(newBotSize), max_orders: 5, tier: newBotTier, description: newBotDesc, is_ai: newBotIsAi, min_stake: Number(newBotMinStake), daily_earn: Number(newBotDailyEarn) } }); setNewBotName(""); setNewBotDesc(""); }} disabled={createBot.isPending}>{createBot.isPending ? "Creating..." : "Create Bot"}</Button>
            </div>
            {botsLoading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
             bots.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">No bots.</p> :
             <div className="space-y-3">{bots.map((bot: any) => (
               <div key={bot.id} className="bg-card border border-border rounded-xl p-4">
                 <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                   <div className="flex items-center gap-2"><h3 className="text-sm font-bold">{bot.name}</h3><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${(bot.tier||"free")==="free"?"bg-emerald-500/20 text-emerald-400":(bot.tier||"free")==="pro"?"bg-blue-500/20 text-blue-400":(bot.tier||"free")==="elite"?"bg-purple-500/20 text-purple-400":"bg-amber-500/20 text-amber-400"}`}>{(bot.tier||"free").toUpperCase()}</span>{bot.is_ai && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">⚡ AI</span>}<span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bot.status==="running"?"bg-profit/10 text-profit":"bg-muted text-muted-foreground"}`}>{bot.status}</span></div>
                   <div className="flex gap-1.5">
                     <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openEditBot(bot)}><Edit2 className="h-3 w-3" /> Edit</Button>
                     {bot.status === "running" ? <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => updateBot.mutate({ id: bot.id, updates: { status: "stopped" } })}><Square className="h-3 w-3" /> Stop</Button> : <Button size="sm" className="h-7 text-xs gap-1 bg-profit hover:bg-profit/80 text-white" onClick={() => updateBot.mutate({ id: bot.id, updates: { status: "running" } })}><Play className="h-3 w-3" /> Start</Button>}
                     <Button variant="ghost" size="sm" className="h-7 text-loss hover:bg-loss/10" onClick={() => deleteBot.mutate(bot.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                   </div>
                 </div>
                 <p className="text-[11px] text-muted-foreground mb-2">{getSymbol(bot.crypto_id)}/USDT • {bot.strategy.replace("_", " ")} • Min: ${Number(bot.min_stake||0).toFixed(0)} • Daily: {Number(bot.daily_earn||0).toFixed(2)}%</p>
                 <div className="grid grid-cols-4 gap-3 text-xs">
                   {[{ label: "PNL", value: `+$${bot.total_profit.toLocaleString()}`, cls: bot.total_profit >= 0 ? "text-profit" : "text-loss" }, { label: "Trades", value: bot.total_trades.toLocaleString(), cls: "" }, { label: "Users", value: (bot.bot_users||0).toLocaleString(), cls: "" }, { label: "Runs", value: bot.runs||0, cls: "" }].map(s => (<div key={s.label} className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground">{s.label}</p><p className={`font-bold ${s.cls}`}>{s.value}</p></div>))}
                 </div>
               </div>
             ))}</div>}
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-display font-bold text-foreground">Registered Users ({users.length})</h2>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><input type="text" placeholder="Search..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className={`${inputClass} pl-8 w-64 h-8 text-xs`} /></div>
            </div>
            {usersLoading ? <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
              filteredUsers.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">No users.</p> :
             <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 px-4">User ID</th><th className="text-left py-3 px-4">Name</th><th className="text-left py-3 px-4">Email</th><th className="text-left py-3 px-4">Tier</th><th className="text-left py-3 px-4">KYC</th><th className="text-left py-3 px-4">Joined</th><th className="text-right py-3 px-4">Actions</th></tr></thead><tbody>{filteredUsers.map((u: any) => (<tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30"><td className="py-3 px-4 text-xs font-mono text-muted-foreground">{u.user_id.slice(0, 12)}...</td><td className="py-3 px-4 font-medium">{u.display_name || "—"}</td><td className="py-3 px-4 text-xs text-muted-foreground">{u.email || "—"}</td><td className="py-3 px-4"><select className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border-0 focus:outline-none cursor-pointer" value={u.account_tier || "free"} onChange={async (e) => { const newTier = e.target.value; await supabase.from("profiles").update({ account_tier: newTier }).eq("user_id", u.user_id); toast.success(`Tier updated to ${newTier}`); refetchUsers(); }}><option value="free">Free</option><option value="pro">Pro</option><option value="elite">Elite</option><option value="vip">VIP</option></select></td><td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.kyc_status === "verified" ? "bg-profit/10 text-profit" : "bg-muted text-muted-foreground"}`}>{u.kyc_status || "none"}</span></td><td className="py-3 px-4 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td><td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1"><Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={async () => { const { error } = await supabase.from("user_roles").insert({ user_id: u.user_id, role: "moderator" as any }); if (error) { if (error.code === "23505") toast.info("Already a moderator"); else toast.error(error.message); } else toast.success("Moderator added"); }}><ShieldCheck className="h-3 w-3" /> Mod</Button><Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => { const amt = prompt("Enter USDT amount:"); if (amt && !isNaN(Number(amt))) addBalance.mutate({ userId: u.user_id, cryptoId: "usdt", amount: Number(amt) }); }}><DollarSign className="h-3 w-3" /> $</Button></div></td></tr>))}</tbody></table></div></div>}
          </div>
        )}

        {tab === "kyc" && <KYCManagementTab />}
        {tab === "roles" && <RolesManagementTab />}
        {tab === "security_logs" && <SecurityLogsTab />}
        {tab === "announcements" && <AnnouncementsTab />}
        {tab === "email_tool" && <EmailToolTab />}

        {/* ─── SETTINGS ─── */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-foreground">Site Settings</h2>
              <Button variant="gold" size="sm" className="gap-2" onClick={handleSaveSettings} disabled={updateSetting.isPending}><Save className="h-3.5 w-3.5" /> {updateSetting.isPending ? "Saving..." : "Save All"}</Button>
            </div>

            {/* General */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Settings className="h-4 w-4" /> General</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs text-muted-foreground mb-1">Site Name</label><input type="text" value={localName} onChange={e => setLocalName(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Support Email</label><input type="email" value={localEmail} onChange={e => setLocalEmail(e.target.value)} className={inputClass} /></div>
              </div>
            </div>

            {/* Fees */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Fees & Limits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="block text-xs text-muted-foreground mb-1">Min Deposit (USD)</label><input type="number" value={localMinDeposit} onChange={e => setLocalMinDeposit(Number(e.target.value))} className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Min Withdrawal (USD)</label><input type="number" value={localMinWithdraw} onChange={e => setLocalMinWithdraw(Number(e.target.value))} className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Withdrawal Fee (%)</label><input type="number" value={localFee} onChange={e => setLocalFee(Number(e.target.value))} step="0.1" className={inputClass} /></div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4" /> Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between"><label className="text-xs text-foreground">Maintenance Mode</label><input type="checkbox" checked={localMaintenance} onChange={e => setLocalMaintenance(e.target.checked)} className="accent-primary" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Referral Bonus (%)</label><input type="number" value={localReferralBonus} onChange={e => setLocalReferralBonus(Number(e.target.value))} step="0.5" className={inputClass} /></div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email (Resend)</h3>
              <div><label className="block text-xs text-muted-foreground mb-1">Resend API Key</label><input type="password" value={localResendKey} onChange={e => setLocalResendKey(e.target.value)} placeholder="re_xxxxxxxxxxxx" className={inputClass} /><p className="text-[10px] text-muted-foreground mt-1">For withdrawal OTP emails. Get key from resend.com</p></div>
            </div>

            {/* M-PESA */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Smartphone className="h-4 w-4" /> M-PESA (Kopo Kopo)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs text-muted-foreground mb-1">Client ID</label><input type="text" value={localKopoClientId} onChange={e => setLocalKopoClientId(e.target.value)} placeholder="Client ID" className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Client Secret</label><input type="password" value={localKopoClientSecret} onChange={e => setLocalKopoClientSecret(e.target.value)} placeholder="Client Secret" className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Till Number</label><input type="text" value={localKopoTill} onChange={e => setLocalKopoTill(e.target.value)} placeholder="e.g. K123456" className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">API Environment</label><select value={localKopoBaseUrl} onChange={e => setLocalKopoBaseUrl(e.target.value)} className={inputClass}><option value="https://sandbox.kopokopo.com">Sandbox</option><option value="https://api.kopokopo.com">Production</option></select></div>
              </div>
            </div>

            {/* Enabled Cryptos */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Database className="h-4 w-4" /> Enabled Cryptocurrencies</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{ALL_CRYPTOS.map(c => { const enabled = localCryptos.includes(c.id); return (<button key={c.id} onClick={() => toggleCrypto(c.id)} className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${enabled ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground"}`}><div className={`w-2.5 h-2.5 rounded-full ${enabled ? "bg-profit" : "bg-muted"}`} />{c.symbol}</button>); })}</div>
            </div>

            {/* Deposit Wallets */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4" /> Deposit Wallet Addresses</h3>
              {ALL_CRYPTOS.filter(c => localCryptos.includes(c.id)).map(c => (<div key={c.id}><label className="block text-xs text-muted-foreground mb-1">{c.name} ({c.symbol})</label><input type="text" value={localWallets[c.id]?.address || ""} onChange={e => updateWalletAddress(c.id, e.target.value)} placeholder={`${c.symbol} wallet address`} className={inputClass} /></div>))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Bot Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Edit Bot</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1 hover:bg-secondary rounded-lg"><XCircle className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">Bot Name</label><input type="text" value={newBotName} onChange={e => setNewBotName(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Crypto</label><select value={newBotCrypto} onChange={e => setNewBotCrypto(e.target.value)} className={inputClass}>{ALL_CRYPTOS.filter(c => c.id !== "tether").map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}</select></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Strategy</label><select value={newBotStrategy} onChange={e => setNewBotStrategy(e.target.value)} className={inputClass}><option value="market_making">Market Making</option><option value="trend_following">Trend Following</option><option value="arbitrage">Arbitrage</option><option value="momentum">Momentum</option></select></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Tier</label><select value={newBotTier} onChange={e => setNewBotTier(e.target.value)} className={inputClass}><option value="free">Free</option><option value="pro">Pro</option><option value="elite">Elite</option><option value="vip">VIP</option></select></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Min Stake</label><input type="number" value={newBotMinStake} onChange={e => setNewBotMinStake(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Daily Earn %</label><input type="number" value={newBotDailyEarn} onChange={e => setNewBotDailyEarn(e.target.value)} step="0.01" className={inputClass} /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Spread %</label><input type="number" value={newBotSpread} onChange={e => setNewBotSpread(e.target.value)} step="0.1" className={inputClass} /></div>
                <div className="flex items-center gap-2 pt-5"><input type="checkbox" id="editIsAi" checked={newBotIsAi} onChange={e => setNewBotIsAi(e.target.checked)} className="rounded accent-primary" /><label htmlFor="editIsAi" className="text-xs text-foreground">AI-Powered</label></div>
              </div>
              <div><label className="block text-xs text-muted-foreground mb-1">Description</label><textarea value={newBotDesc} onChange={e => setNewBotDesc(e.target.value)} className={inputClass + " h-20 resize-none py-3"} /></div>
              <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button variant="gold" className="flex-1" onClick={handleUpdateBot} disabled={updateBot.isPending}>{updateBot.isPending ? "Saving..." : "Save Changes"}</Button></div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminPage;
