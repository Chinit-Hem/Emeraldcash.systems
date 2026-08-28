"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Send, X } from "lucide-react";

type Participant = { username: string; fullName: string; position: string; branch: string };
type Message = { id: string; senderUsername: string; recipientUsername: string; body: string; readAt: string | null; createdAt: string };
type ChatData = { participants: Participant[]; unreadCount: number; messages: Message[] };

function time(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel({ currentUsername, onClose, onUnreadCountChange }: { currentUsername: string; onClose: () => void; onUnreadCountChange: (count: number) => void }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chat${selected ? `?with=${encodeURIComponent(selected)}` : ""}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null) as { success?: boolean; data?: ChatData; error?: string } | null;
      if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || "Could not load chat");
      setParticipants(payload.data.participants);
      setMessages(payload.data.messages);
      onUnreadCountChange(payload.data.unreadCount);
      if (!selected && payload.data.participants[0]) setSelected(payload.data.participants[0].username);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load chat");
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange, selected]);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(`emerald-chat-recent-${currentUsername}`) || "[]") as unknown;
      if (Array.isArray(saved)) setRecentRecipients(saved.map(String).slice(0, 8));
    } catch { /* Recent chat recipients are optional browser convenience data. */ }
  }, [currentUsername]);

  useEffect(() => {
    if (!selected) return;
    setRecentRecipients((current) => {
      const next = [selected, ...current.filter((username) => username !== selected)].slice(0, 8);
      try { window.localStorage.setItem(`emerald-chat-recent-${currentUsername}`, JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
      return next;
    });
  }, [currentUsername, selected]);

  const recipient = useMemo(() => participants.find((participant) => participant.username === selected), [participants, selected]);
  const visibleParticipants = useMemo(() => {
    const query = recipientSearch.trim().toLocaleLowerCase();
    if (!query) return participants;
    return participants.filter((participant) => `${participant.fullName} ${participant.username} ${participant.position} ${participant.branch}`.toLocaleLowerCase().includes(query));
  }, [participants, recipientSearch]);
  const recentParticipants = visibleParticipants.filter((participant) => recentRecipients.includes(participant.username)).sort((left, right) => recentRecipients.indexOf(left.username) - recentRecipients.indexOf(right.username));
  const otherParticipants = visibleParticipants.filter((participant) => !recentRecipients.includes(participant.username));
  const participantLabel = (participant: Participant) => [participant.fullName, participant.position, participant.branch].filter(Boolean).join(" — ");
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/chat", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: selected, message: message.trim() }) });
      const payload = await response.json().catch(() => null) as { success?: boolean; data?: Message; error?: string } | null;
      if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || "Could not send message");
      setMessages((current) => [...current, payload.data!]);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return <div className="flex h-[min(36rem,70vh)] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700"><div><h3 className="font-semibold text-slate-800 dark:text-slate-100">Internal chat</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Private messages with your team</p></div><button type="button" onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close chat"><X className="h-5 w-5" /></button></header>
    {participants.length ? <div className="space-y-2 border-b border-slate-200 p-3 dark:border-slate-700"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search team member…" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label><select aria-label="Chat recipient" value={selected} onChange={(event) => setSelected(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{recentParticipants.length ? <optgroup label="Recent conversations">{recentParticipants.map((participant) => <option key={participant.username} value={participant.username}>{participantLabel(participant)}</option>)}</optgroup> : null}{otherParticipants.length ? <optgroup label={recentParticipants.length ? "All team members" : "Team members"}>{otherParticipants.map((participant) => <option key={participant.username} value={participant.username}>{participantLabel(participant)}</option>)}</optgroup> : null}</select></div> : null}
    <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">{loading ? <div className="flex h-full items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chat…</div> : null}{!loading && !participants.length ? <p className="p-6 text-center text-sm text-slate-500">No other users are available for chat.</p> : null}{!loading && selected && !messages.length ? <p className="p-6 text-center text-sm text-slate-500">Start a conversation with {recipient?.fullName || selected}.</p> : null}{!loading && messages.map((item) => { const mine = item.senderUsername.toLowerCase() === currentUsername.toLowerCase(); return <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}><p>{item.body}</p><p className={`mt-1 text-[10px] ${mine ? "text-emerald-100" : "text-slate-400"}`}>{time(item.createdAt)}</p></div></div>; })}</div>
    {error ? <p className="px-3 pb-2 text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
    <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700"><input value={message} onChange={(event) => setMessage(event.target.value)} disabled={!selected || sending} maxLength={2000} placeholder={selected ? "Write a message…" : "Choose a user"} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><button disabled={!selected || !message.trim() || sending} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form>
  </div>;
}
