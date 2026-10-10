"use client";

import { Bot, BrainCircuit, ChevronDown, Loader2, Send, Sparkles, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { API_URL, type LiveSnapshot } from "@/hooks/use-live";
import { fmtIst } from "@/lib/live";
import { cn } from "@/lib/utils";

interface Insight {
  title: string;
  finding: string;
  reasoning: string;
  tone: "alert" | "warn" | "good" | "info";
  cities?: string[];
  confidence?: string;
}

interface InsightsResp {
  headline: string;
  insights: Insight[];
  updated_at: string;
  model: string;
}

const TONE: Record<Insight["tone"], string> = {
  alert: "#ef4444",
  warn: "#f59e0b",
  good: "#10b981",
  info: "#38bdf8",
};

/** Minimal Markdown: paragraphs, bullets, **bold**. */
function Md({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i} className="text-fg">{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length} className="ml-4 list-disc space-y-0.5">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^[-*•]\s+/.test(line)) list.push(line.replace(/^[-*•]\s+/, ""));
    else {
      flush();
      if (line) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

export function AiInsights({ snap, nonce = 0 }: { snap: LiveSnapshot; nonce?: number }) {
  const [state, setState] = useState<{ key: string; data: InsightsResp | null; error: string | null }>({ key: "", data: null, error: null });
  const key = `${snap.updated_at}:${nonce}`;
  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/api/ai/insights${nonce ? "?force=1" : ""}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).detail ?? `HTTP ${r.status}`))))
      .then((d) => alive && setState({ key, data: d as InsightsResp, error: null }))
      .catch((e) => alive && setState({ key, data: null, error: String(e.message ?? e) }));
    return () => {
      alive = false;
    };
  }, [key, nonce]);
  const loading = state.key !== key;
  const d = loading ? null : state.data;

  return (
    <Card>
      <CardHeader
        title="AI analyst · live insights"
        subtitle={d ? `Reasoned from the ${fmtIst(Date.parse(d.updated_at), { hour: "numeric", minute: "2-digit", hour12: true })} IST snapshot · ${d.model} on Groq` : "Reading the current live data…"}
        icon={<BrainCircuit className="size-4" />}
        action={loading ? <Loader2 className="size-4 animate-spin text-primary" /> : undefined}
      />
      {state.error && !loading ? (
        <div className="rounded-2xl bg-amber-500/12 p-3 text-sm text-amber-200">AI insights unavailable: {state.error}</div>
      ) : !d ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 !rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-primary-soft p-3.5 text-[14px] font-medium leading-relaxed text-fg">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            {d.headline}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {d.insights.map((ins, i) => (
              <InsightCard key={ins.title + i} ins={ins} i={i} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function InsightCard({ ins, i }: { ins: Insight; i: number }) {
  const [open, setOpen] = useState(false);
  const color = TONE[ins.tone] ?? TONE.info;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="relative overflow-hidden rounded-2xl bg-surface-sunken p-4">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="flex items-start justify-between gap-2">
        <div className="text-[14px] font-semibold leading-snug text-fg">{ins.title}</div>
        {ins.confidence && <Badge className="shrink-0">{ins.confidence}</Badge>}
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{ins.finding}</p>
      {!!ins.cities?.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ins.cities.slice(0, 5).map((c) => (
            <span key={c} className="rounded-full px-2 py-0.5 text-[10.5px] font-medium text-fg" style={{ background: `color-mix(in oklab, ${color} 22%, transparent)` }}>
              {c}
            </span>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        Reasoning <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-xs leading-relaxed text-fg-muted">
            <span className="mt-1.5 block border-l-2 pl-2.5" style={{ borderColor: color }}>
              {ins.reasoning}
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const SUGGESTIONS = ["Why is the most polluted city so bad today?", "Which cities will get worse in the next 24 hours?", "Are crop fires affecting Delhi right now?", "Is it safe to go jogging in Bengaluru this evening?"];

export function AiChat({ city }: { city: string }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/ai/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next, city }) });
      const j = await r.json();
      setMsgs([...next, { role: "assistant", content: r.ok ? j.answer : `⚠️ ${j.detail ?? `HTTP ${r.status}`}` }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `⚠️ ${String(e)}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-[560px] flex-col">
      <CardHeader title="Ask the data" subtitle={`Chat grounded in the current live snapshot · selected: ${city}`} icon={<Bot className="size-4" />} />
      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 scrollbar-thin" data-lenis-prevent>
        {msgs.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-2xl bg-surface-sunken p-3 text-left text-[13px] text-fg-muted transition hover:text-fg">
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", m.role === "user" ? "bg-white/20" : "bg-primary-soft text-primary")}>
              {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", m.role === "user" ? "bg-white/90 text-slate-900" : "bg-surface-sunken text-fg-muted")}>
              {m.role === "user" ? m.content : <Md text={m.content} />}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Loader2 className="size-3.5 animate-spin" /> Reasoning over live data…
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2 rounded-full bg-surface-sunken p-1.5 pl-4"
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about today's air quality…" className="h-9 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle" />
        <button type="submit" disabled={busy || !input.trim()} className="grid size-9 place-items-center rounded-full bg-primary text-white disabled:opacity-40" aria-label="Send">
          <Send className="size-4" />
        </button>
      </form>
    </Card>
  );
}
