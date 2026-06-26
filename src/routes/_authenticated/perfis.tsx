// Painel de Perfis — só faz sentido para o admin (quem cadastrou a conta).
// Lista membros do workspace, convites pendentes e permite criar novo convite
// escolhendo exatamente quais módulos cada perfil pode acessar.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createInvite,
  removeMember,
  revokeInvite,
  updateMemberModules,
} from "@/lib/perfis.functions";
import { importarContextoMembro } from "@/lib/admin-import.functions";
import { MODULE_KEYS, MODULE_LABELS, type ModuleKey } from "@/lib/perfis";
import { KittDebug } from "@/components/KittDebug";
import {
  ArrowLeft,
  Check,
  Copy,
  Mail,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/perfis")({
  component: PerfisPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

type Member = {
  id: string;
  member_id: string;
  modules: string[];
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

type Invite = {
  id: string;
  email: string;
  modules: string[];
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
};

function PerfisPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerOfMe, setOwnerOfMe] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const createFn = useServerFn(createInvite);
  const revokeFn = useServerFn(revokeInvite);
  const updateFn = useServerFn(updateMemberModules);
  const removeFn = useServerFn(removeMember);
  const importContextoFn = useServerFn(importarContextoMembro);

  const reload = useCallback(async (uid: string) => {
    const [{ data: m }, { data: inv }] = await Promise.all([
      supabase
        .from("workspace_members")
        .select(
          "id, member_id, modules, created_at, profile:profiles!workspace_members_member_id_fkey(display_name, avatar_url)",
        )
        .eq("owner_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_invitations")
        .select("id, email, modules, status, token, expires_at, created_at")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false }),
    ]);
    setMembers((m ?? []) as unknown as Member[]);
    setInvites((inv ?? []) as Invite[]);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: own } = await supabase
        .from("workspace_members")
        .select("owner_id")
        .eq("member_id", uid)
        .maybeSingle();
      const admin = !own;
      setOwnerOfMe(own?.owner_id ?? null);
      setIsAdmin(admin);

      if (admin) await reload(uid);
      setLoading(false);
    })();
  }, [reload]);

  if (loading)
    return (
      <Shell>
        <p className="text-[#F3EBDD]/60">Carregando…</p>
      </Shell>
    );

  if (!isAdmin) {
    return (
      <Shell>
        <div className="rounded-2xl border border-white/5 bg-[#111016] p-6 space-y-3">
          <ShieldCheck className="w-6 h-6 text-[#D9A441]" />
          <h2 className="serif text-xl">Você participa de um workspace</h2>
          <p className="text-sm text-[#F3EBDD]/70">
            Esta conta é um perfil convidado. Quem administra é{" "}
            {ownerOfMe ? (
              <code className="text-[#D9A441]">{ownerOfMe.slice(0, 8)}…</code>
            ) : (
              "o admin"
            )}{" "}
            e ele controla os módulos que você acessa.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-8">
        <section className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/55 mb-3">
            KITT · debug (admin)
          </p>
          <KittDebug />
        </section>

        <InviteForm
          userId={userId!}
          onCreated={async () => {
            if (userId) await reload(userId);
          }}
          createFn={createFn}
        />

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50 mb-3 inline-flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Perfis ativos
          </h2>
          {members.length === 0 ? (
            <p className="text-xs text-[#F3EBDD]/55 italic">
              Ninguém ainda. Use o formulário acima para convidar.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onUpdate={async (mods) => {
                    await updateFn({ data: { memberId: m.member_id, modules: mods } });
                    if (userId) await reload(userId);
                  }}
                  onRemove={async () => {
                    if (!confirm(`Remover acesso de ${m.profile?.display_name ?? "este perfil"}?`))
                      return;
                    await removeFn({ data: { memberId: m.member_id } });
                    if (userId) await reload(userId);
                  }}
                  onImportContexto={async (input) => {
                    await importContextoFn({ data: { memberId: m.member_id, ...input } });
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50 mb-3 inline-flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> Convites
          </h2>
          {invites.length === 0 ? (
            <p className="text-xs text-[#F3EBDD]/55 italic">Sem convites.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((i) => (
                <InviteRow
                  key={i.id}
                  invite={i}
                  onRevoke={async () => {
                    await revokeFn({ data: { id: i.id } });
                    if (userId) await reload(userId);
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <header className="border-b border-white/5 sticky top-0 z-20 bg-[#08080E]/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/klio" aria-label="Voltar" className="text-[#F3EBDD]/60 hover:text-[#D9A441]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="leading-tight">
            <div className="serif text-[#D9A441] text-base tracking-[0.18em]">PERFIS</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/50">
              workspace · convites · módulos
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

// ─── Formulário de convite ────────────────────────────────────────────────

function InviteForm({
  userId,
  onCreated,
  createFn,
}: {
  userId: string;
  onCreated: () => Promise<void>;
  createFn: (args: {
    data: { email: string; modules: ModuleKey[]; origin: string };
  }) => Promise<{ acceptUrl: string; shareLink: string; emailSent: boolean }>;
}) {
  void userId;
  const [email, setEmail] = useState("");
  const [mods, setMods] = useState<Set<ModuleKey>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ link: string; emailSent: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleMod(k: ModuleKey) {
    setMods((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function submit() {
    setErr(null);
    setResult(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErr("E-mail inválido.");
      return;
    }
    if (mods.size === 0) {
      setErr("Escolha pelo menos um módulo.");
      return;
    }
    setBusy(true);
    try {
      const r = await createFn({
        data: { email: email.trim(), modules: [...mods], origin: window.location.origin },
      });
      setResult({ link: r.shareLink, emailSent: r.emailSent });
      setEmail("");
      setMods(new Set());
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao criar convite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-[#111016] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#D9A441]" />
        <h2 className="serif text-lg">Convidar novo perfil</h2>
      </div>
      <p className="text-xs text-[#F3EBDD]/60">
        O convidado recebe um e-mail, cria a conta dele e passa a ver no app só os módulos que você
        marcar.
      </p>
      <div className="space-y-2">
        <label className="block text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/50">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="pessoa@exemplo.com"
          className="w-full bg-[#0B0A10] border border-white/10 rounded-md h-10 px-3 text-sm outline-none focus:border-[#C98A65]"
        />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/50">
          Módulos liberados
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {MODULE_KEYS.map((k) => {
            const checked = mods.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleMod(k)}
                className={
                  "text-left rounded-lg border px-3 py-2 transition " +
                  (checked
                    ? "border-[#C98A65] bg-[#C98A65]/10"
                    : "border-white/5 hover:border-[#C98A65]/40")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[#F3EBDD]">{MODULE_LABELS[k].title}</p>
                  {checked && <Check className="w-4 h-4 text-[#C98A65]" />}
                </div>
                <p className="text-[11px] text-[#F3EBDD]/55 mt-0.5">{MODULE_LABELS[k].descricao}</p>
              </button>
            );
          })}
        </div>
      </div>
      {err && <p className="text-xs text-[#BE123C]">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="h-10 px-4 rounded-md bg-[#C98A65] text-[#08080E] text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
      >
        <Mail className="w-4 h-4" /> {busy ? "Enviando…" : "Enviar convite"}
      </button>

      {result && <InviteCreatedBanner link={result.link} emailSent={result.emailSent} />}
    </section>
  );
}

function InviteCreatedBanner({ link, emailSent }: { link: string; emailSent: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-[#D9A441]/40 bg-[#D9A441]/5 p-3 space-y-2">
      <p className="text-xs text-[#D9A441]">
        {emailSent
          ? "E-mail enviado. Se o convidado não receber, mande o link abaixo:"
          : "O convidado já tem conta. Envie este link manualmente:"}
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2 text-xs text-[#F3EBDD]/80 outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="h-9 px-3 rounded-md border border-white/10 hover:border-[#C98A65] text-xs text-[#F3EBDD]/80 inline-flex items-center gap-1"
        >
          <Copy className="w-3.5 h-3.5" /> {copied ? "copiado" : "copiar"}
        </button>
      </div>
    </div>
  );
}

// ─── Linha de membro com edição inline ────────────────────────────────────

function MemberRow({
  member,
  onUpdate,
  onRemove,
  onImportContexto,
}: {
  member: Member;
  onUpdate: (mods: ModuleKey[]) => Promise<void>;
  onRemove: () => Promise<void>;
  onImportContexto: (input: {
    titulo: string;
    conteudo: string;
    tipo: "identidade" | "memoria_relacional";
  }) => Promise<void>;
}) {
  const [importing, setImporting] = useState(false);
  const initial = useMemo(
    () =>
      new Set(
        member.modules.filter((m): m is ModuleKey =>
          (MODULE_KEYS as readonly string[]).includes(m),
        ),
      ),
    [member.modules],
  );
  const [draft, setDraft] = useState<Set<ModuleKey>>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const name = member.profile?.display_name ?? member.member_id.slice(0, 8);

  return (
    <li className="rounded-xl border border-white/5 bg-[#111016] p-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#C98A65]/20 text-[#C98A65] text-sm font-medium flex items-center justify-center shrink-0">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#F3EBDD] truncate">{name}</p>
          <p className="text-[10px] text-[#F3EBDD]/45">
            entrou em {new Date(member.created_at).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {editing ? (
              MODULE_KEYS.map((k) => {
                const on = draft.has(k);
                return (
                  <button
                    key={k}
                    onClick={() =>
                      setDraft((p) => {
                        const n = new Set(p);
                        if (n.has(k)) n.delete(k);
                        else n.add(k);
                        return n;
                      })
                    }
                    className={
                      "text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded border " +
                      (on
                        ? "border-[#C98A65] bg-[#C98A65]/15 text-[#C98A65]"
                        : "border-white/10 text-[#F3EBDD]/55")
                    }
                  >
                    {MODULE_LABELS[k].title}
                  </button>
                );
              })
            ) : member.modules.length === 0 ? (
              <span className="text-[11px] text-[#F3EBDD]/45 italic">sem módulos liberados</span>
            ) : (
              member.modules.map((m) => (
                <span
                  key={m}
                  className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded bg-[#C98A65]/10 text-[#C98A65]"
                >
                  {MODULE_LABELS[m as ModuleKey]?.title ?? m}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {editing ? (
            <>
              <button
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onUpdate([...draft]);
                    setEditing(false);
                  } finally {
                    setSaving(false);
                  }
                }}
                className="text-xs px-2 py-1 rounded bg-[#C98A65] text-[#08080E] disabled:opacity-50"
              >
                salvar
              </button>
              <button
                onClick={() => {
                  setDraft(initial);
                  setEditing(false);
                }}
                className="text-xs px-2 py-1 rounded border border-white/10 text-[#F3EBDD]/70"
              >
                cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-2 py-1 rounded border border-white/10 hover:border-[#C98A65] text-[#F3EBDD]/70"
              >
                editar
              </button>
              <button
                onClick={() => setImporting((v) => !v)}
                aria-label="Importar contexto"
                className="text-xs px-2 py-1 rounded border border-white/10 hover:border-[#D9A441] text-[#F3EBDD]/70"
              >
                <UploadCloud className="w-3 h-3 inline" />
              </button>
              <button
                onClick={onRemove}
                aria-label="Remover perfil"
                className="text-xs px-2 py-1 rounded border border-white/10 hover:border-[#BE123C] text-[#BE123C]/70"
              >
                <Trash2 className="w-3 h-3 inline" />
              </button>
            </>
          )}
        </div>
      </div>
      {importing && <ImportPanel onImportContexto={onImportContexto} />}
    </li>
  );
}

// ─── Painel de importação de contexto (já analisado, sem reinterpretação) ──

function ImportPanel({
  onImportContexto,
}: {
  onImportContexto: (input: {
    titulo: string;
    conteudo: string;
    tipo: "identidade" | "memoria_relacional";
  }) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<"identidade" | "memoria_relacional">("memoria_relacional");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/50">
        Importar contexto / identidade / memória já condensada
      </p>
      <p className="text-[11px] text-[#F3EBDD]/45">
        Cole o conteúdo já analisado (ex.: PDF condensado de outra Kháris). É assimilado como está,
        sem reinterpretação aqui.
      </p>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título do bloco"
        className="w-full bg-[#0B0A10] border border-white/10 rounded-md h-9 px-3 text-xs outline-none focus:border-[#D9A441]"
      />
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder="Cole aqui o markdown de contexto/identidade/histórico já condensado…"
        rows={4}
        className="w-full bg-[#0B0A10] border border-white/10 rounded-md p-2 text-xs outline-none focus:border-[#D9A441]"
      />
      <div className="flex items-center gap-3">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "identidade" | "memoria_relacional")}
          className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2 text-xs"
        >
          <option value="memoria_relacional">memória relacional (com esta pessoa)</option>
          <option value="identidade">identidade (continuidade da própria Kháris)</option>
        </select>
        <button
          disabled={busy || !titulo.trim() || !conteudo.trim()}
          onClick={async () => {
            setBusy(true);
            setOk(false);
            try {
              await onImportContexto({ titulo: titulo.trim(), conteudo: conteudo.trim(), tipo });
              setTitulo("");
              setConteudo("");
              setOk(true);
            } finally {
              setBusy(false);
            }
          }}
          className="h-9 px-3 rounded-md bg-[#D9A441] text-[#08080E] text-xs font-medium disabled:opacity-50"
        >
          {busy ? "importando…" : "importar contexto"}
        </button>
        {ok && <Check className="w-4 h-4 text-emerald-400" />}
      </div>
    </div>
  );
}

// ─── Linha de convite pendente ────────────────────────────────────────────

function InviteRow({ invite, onRevoke }: { invite: Invite; onRevoke: () => Promise<void> }) {
  const acceptUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/convite?token=${invite.token}`;
  const [copied, setCopied] = useState(false);
  const isPending = invite.status === "pending";

  return (
    <li className="rounded-xl border border-white/5 bg-[#111016] p-3 flex items-start gap-3">
      <Mail className="w-4 h-4 text-[#D9A441] mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-[#F3EBDD] truncate">{invite.email}</p>
          <span
            className={
              "text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded " +
              (isPending
                ? "bg-[#D9A441]/15 text-[#D9A441]"
                : invite.status === "accepted"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/5 text-[#F3EBDD]/45")
            }
          >
            {invite.status}
          </span>
        </div>
        <p className="text-[10px] text-[#F3EBDD]/45">
          {invite.modules.length} módulo(s) · expira em{" "}
          {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
        </p>
        {isPending && (
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={acceptUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-[#0B0A10] border border-white/10 rounded-md h-7 px-2 text-[10px] text-[#F3EBDD]/70 outline-none"
            />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(acceptUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="h-7 px-2 rounded border border-white/10 hover:border-[#C98A65] text-[10px] text-[#F3EBDD]/70 inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> {copied ? "copiado" : "copiar link"}
            </button>
          </div>
        )}
      </div>
      {isPending && (
        <button
          onClick={onRevoke}
          aria-label="Revogar convite"
          className="text-[#F3EBDD]/40 hover:text-[#BE123C]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
