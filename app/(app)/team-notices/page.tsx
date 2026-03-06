"use client";

import React, { useEffect, useMemo, useState } from "react";

type NoticeType = "ทั่วไป" | "ลางาน" | "ประชุม" | "ปัญหา" | "เร่งด่วน";

type TeamNotice = {
  id: string;
  title: string;
  content?: string | null;
  notice_type?: NoticeType | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  is_pinned?: boolean | null;
  is_active?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  creator?: {
    display_name?: string | null;
    role?: string | null;
  } | null;
};

type MeProfile = {
  id: string;
  role?: "LEADER" | "MEMBER" | "ADMIN" | string | null;
  display_name?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function NoticeTypePill({ type }: { type?: string | null }) {
  const t = type || "ทั่วไป";

  const cls =
    t === "เร่งด่วน"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : t === "ประชุม"
        ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
        : t === "ลางาน"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
          : t === "ปัญหา"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold", cls)}>
      {t}
    </span>
  );
}

export default function TeamNoticesPage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [items, setItems] = useState<TeamNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("ทั่วไป");
  const [isPinned, setIsPinned] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | NoticeType>("ALL");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isLeader = me?.role === "LEADER" || me?.role === "ADMIN";

  async function loadMe() {
    const res = await fetch("/api/me-profile", { cache: "no-store" });
    const json = await safeJson(res);
    if (res.ok) setMe((json?.data ?? json) as MeProfile);
  }

  async function loadNotices() {
    setLoading(true);
    setError("");

    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("q", search.trim());
      if (filterType !== "ALL") q.set("type", filterType);

      const res = await fetch(`/api/team-notices?${q.toString()}`, { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Load notices failed");
      }

      const rows = Array.isArray(json?.data) ? (json.data as TeamNotice[]) : [];
      setItems(rows);
    } catch (e: any) {
      setError(e?.message || "Load notices failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    loadNotices();
  }, [filterType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const needle = search.trim().toLowerCase();
    return items.filter((n) =>
      `${n.title || ""} ${n.content || ""} ${n.creator?.display_name || ""}`.toLowerCase().includes(needle)
    );
  }, [items, search]);

  async function submitNotice() {
    if (!title.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/team-notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          notice_type: noticeType,
          is_pinned: isLeader ? isPinned : false,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        }),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Create notice failed");
      }

      setTitle("");
      setContent("");
      setNoticeType("ทั่วไป");
      setIsPinned(false);
      setAttachmentUrl(null);
      setAttachmentName(null);
      await loadNotices();
    } catch (e: any) {
      setError(e?.message || "Create notice failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/team-notices/upload", {
        method: "POST",
        body: form,
      });

      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Upload failed");
      }

      setAttachmentUrl(json?.data?.url || null);
      setAttachmentName(json?.data?.name || null);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function togglePin(id: string, value: boolean) {
    const res = await fetch(`/api/team-notices/${id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: value }),
    });

    const json = await safeJson(res);
    if (!res.ok) {
      setError((json && (json.error || json.message)) || "Update pin failed");
      return;
    }

    await loadNotices();
  }

  async function deleteNotice(id: string) {
    const ok = window.confirm("ลบประกาศนี้หรือไม่");
    if (!ok) return;

    const res = await fetch(`/api/team-notices/${id}`, { method: "DELETE" });
    const json = await safeJson(res);

    if (!res.ok) {
      setError((json && (json.error || json.message)) || "Delete failed");
      return;
    }

    await loadNotices();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Team Notice Board</h1>
          <div className="mt-2 text-sm text-white/60">กระดานประกาศกลางของทีม สำหรับแจ้งลา ประชุม ปัญหา และงานด่วน</div>
        </div>

        <button
          onClick={loadNotices}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          รีเฟรช
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาประกาศ"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="ALL">All</option>
                <option value="ทั่วไป">ทั่วไป</option>
                <option value="ลางาน">ลางาน</option>
                <option value="ประชุม">ประชุม</option>
                <option value="ปัญหา">ปัญหา</option>
                <option value="เร่งด่วน">เร่งด่วน</option>
              </select>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
                  กำลังโหลดประกาศ...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/40">
                  ยังไม่มีประกาศทีม
                </div>
              ) : (
                filtered.map((n) => {
                  const canDelete = isLeader || n.created_by === me?.id;
                  return (
                    <div
                      key={n.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <NoticeTypePill type={n.notice_type} />
                            {n.is_pinned ? (
                              <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-200">
                                PINNED
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 font-semibold text-white">{n.title}</div>

                          {n.content ? (
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
                              {n.content}
                            </div>
                          ) : null}

                          <div className="mt-3 text-xs text-white/40">
                            โดย {n.creator?.display_name || "ไม่ทราบชื่อ"} · {formatDateTimeTH(n.created_at)}
                          </div>

                          {n.attachment_url ? (
                            <a
                              href={n.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                            >
                              เปิดไฟล์แนบ {n.attachment_name ? `: ${n.attachment_name}` : ""}
                            </a>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {isLeader ? (
                            <button
                              type="button"
                              onClick={() => togglePin(n.id, !n.is_pinned)}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                            >
                              {n.is_pinned ? "ยกเลิกหมุด" : "ปักหมุด"}
                            </button>
                          ) : null}

                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => deleteNotice(n.id)}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/15"
                            >
                              ลบ
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-lg font-bold text-white">+ New notice</div>
            <div className="mt-1 text-sm text-white/50">สร้างประกาศใหม่สำหรับทีม</div>

            <div className="mt-4 grid gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="หัวข้อประกาศ"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="รายละเอียดประกาศ"
                className="h-32 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />

              <div className="flex flex-wrap gap-2">
                {["ทั่วไป", "ลางาน", "ประชุม", "ปัญหา", "เร่งด่วน"].map((t) => {
                  const active = noticeType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNoticeType(t as NoticeType)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                        active
                          ? "border-white/10 bg-white text-black"
                          : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-white/70">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file);
                    }}
                  />
                  <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
                    {uploading ? "กำลังอัปโหลด..." : "แนบรูปหรือไฟล์" + " (ไม่เกิน 5MB)"}
                  </span>
                </label>

                {isLeader ? (
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                    />
                    ปักหมุด
                  </label>
                ) : null}
              </div>

              {attachmentName ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
                  แนบแล้ว: {attachmentName}
                </div>
              ) : null}

              <button
                type="button"
                onClick={submitNotice}
                disabled={submitting || !title.trim()}
                className="rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "กำลังส่ง..." : "ส่งประกาศ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}