"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Review = {
  id: string; draft_number: number;
  review_status: "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED";
  submission_url: string; submission_note: string | null;
  created_at: string; reviewed_at: string | null; feedback: string | null;
};

type Person = { id: string; display_name: string | null; is_active?: boolean };
type Props = {
  projectId: string; assigneeId?: string | null; reviewerId?: string | null;
  viewerId?: string | null; isManager: boolean; people: Person[];
};

async function readResponse(res: Response) {
  return res.json().catch(() => null);
}

export default function ProjectDraftReviewPanel({
  projectId, assigneeId, reviewerId, viewerId, isManager, people,
}: Props) {
  const [reviewer, setReviewer] = useState(reviewerId || "");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [missingMigration, setMissingMigration] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => setReviewer(reviewerId || ""), [reviewerId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/draft-reviews`, { cache: "no-store" });
      const j = await readResponse(res);
      if (res.status === 503 && j?.code === "MIGRATION_REQUIRED") {
        setMissingMigration(true);
        setReviews([]);
        return;
      }
      if (!res.ok) throw new Error(j?.error || "โหลดรายการ Draft ไม่สำเร็จ");
      setMissingMigration(false);
      setReviews(Array.isArray(j?.data) ? j.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดรายการ Draft ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const last = reviews[0] ?? null;
  const canSubmit = !missingMigration && viewerId === assigneeId &&
    (!last || last.review_status === "CHANGES_REQUESTED") &&
    (last?.draft_number ?? 0) < 4;
  const canReview = !missingMigration && Boolean(viewerId) &&
    (isManager || (reviewer === viewerId && assigneeId !== viewerId));

  async function saveReviewer(next: string) {
    if (!isManager || working || missingMigration) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: next || null }),
      });
      const j = await readResponse(res);
      if (!res.ok) throw new Error(j?.error || "บันทึกผู้ตรวจไม่สำเร็จ");
      setReviewer(next); setMessage("บันทึกผู้ตรวจแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกผู้ตรวจไม่สำเร็จ");
    } finally { setWorking(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/draft-reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim(), note: note.trim() }),
      });
      const j = await readResponse(res);
      if (!res.ok) throw new Error(j?.error || "ส่ง Draft ไม่สำเร็จ");
      setLink(""); setNote(""); await load();
      setMessage("ส่ง Draft ให้ตรวจแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่ง Draft ไม่สำเร็จ");
    } finally { setWorking(false); }
  }

  async function decide(id: string, action: "APPROVE" | "REQUEST_CHANGES") {
    if (!canReview || working) return;
    if (action === "REQUEST_CHANGES" && !feedback.trim()) {
      setError("กรุณาระบุสิ่งที่ต้องแก้ไข"); return;
    }
    setWorking(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/draft-reviews/${encodeURIComponent(id)}/decision`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback: feedback.trim() }),
      });
      const j = await readResponse(res);
      if (!res.ok) throw new Error(j?.error || "บันทึกผลตรวจไม่สำเร็จ");
      setFeedback(""); await load();
      setMessage(action === "APPROVE" ? "Draft ผ่าน QC แล้ว" : "ส่งกลับให้แก้ไขแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกผลตรวจไม่สำเร็จ");
    } finally { setWorking(false); }
  }

  return (
    <section id="draft-reviews" className="mt-6 scroll-mt-24 rounded-2xl border border-white/10 bg-white/5 p-4 text-white md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-widest text-[#e5ff78]">WOFFU WORKFLOW</div>
          <h2 className="mt-1 text-xl font-bold">Draft & Senior QC</h2>
          <p className="mt-2 text-sm text-white/55">รอบตรวจ Draft 1–4 แยกจากสถานะงานหลัก</p>
        </div>
        <button type="button" disabled={working || loading} onClick={() => void load()}
          className="rounded-xl border border-white/20 px-3 py-2 text-sm disabled:opacity-50">รีเฟรช</button>
      </div>

      {missingMigration && <p className="mt-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">
        ต้องติดตั้งฐานข้อมูล Draft Review Migration Phase 3 บน Staging ก่อนเปิดใช้งาน
      </p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-200">{message}</p>}

      {!missingMigration && <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <label htmlFor="reviewer-picker" className="mb-2 block text-sm font-bold">ผู้ตรวจงาน (Senior QC)</label>
        {isManager ? <select id="reviewer-picker" value={reviewer} disabled={working}
          onChange={(e) => void saveReviewer(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-[#202020] px-3 py-2 text-sm md:max-w-sm">
          <option value="">หัวหน้าทีมตรวจเอง / ยังไม่ระบุ</option>
          {people.filter(p => p.is_active !== false && p.id !== assigneeId).map(p =>
            <option value={p.id} key={p.id}>{p.display_name || p.id}</option>
          )}
        </select> : <p className="text-sm text-white/80">
          {people.find(p => p.id === reviewer)?.display_name || (reviewer ? "ผู้ตรวจที่ได้รับมอบหมาย" : "หัวหน้าทีม")}
        </p>}
      </div>}

      {canSubmit && <form onSubmit={submit} className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="text-sm font-bold">ส่ง Draft {(last?.draft_number || 0) + 1}</div>
        <label htmlFor="draft-link" className="mt-3 block text-xs text-white/65">ลิงก์ไฟล์งาน (HTTPS)</label>
        <input type="url" required id="draft-link" value={link} maxLength={2048}
          onChange={e => setLink(e.target.value)} placeholder="https://drive.google.com/..."
          className="mt-2 w-full rounded-lg border border-white/20 bg-[#202020] p-3 text-sm"/>
        <label htmlFor="draft-note" className="mt-3 block text-xs text-white/65">หมายเหตุ</label>
        <textarea id="draft-note" rows={2} value={note} maxLength={4000}
          onChange={e => setNote(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/20 bg-[#202020] p-3 text-sm"/>
        <button type="submit" disabled={working || !link.trim()}
          className="mt-3 rounded-lg bg-[#e5ff78] px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
          {working ? "กำลังส่ง..." : "ส่งให้ Senior QC"}
        </button>
      </form>}

      {loading ? <p className="mt-5 text-sm text-white/50">กำลังโหลด...</p> :
      reviews.length === 0 && !missingMigration ? <p className="mt-5 text-sm text-white/50">ยังไม่มี Draft ที่ส่งตรวจ</p> :
      <div className="mt-5 space-y-3">{reviews.map(review => (
        <article key={review.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>Draft {review.draft_number}</strong>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${review.review_status === "APPROVED" ?
              "bg-green-400/15 text-green-200" : review.review_status === "CHANGES_REQUESTED" ?
              "bg-red-400/15 text-red-200" : "bg-yellow-400/15 text-yellow-200"}`}>
              {review.review_status === "SUBMITTED" ? "รอตรวจ" : review.review_status === "APPROVED" ? "ผ่าน QC" : "ต้องแก้ไข"}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/50">ส่งเมื่อ {new Date(review.created_at).toLocaleString("th-TH")}</p>
          <a href={review.submission_url} target="_blank" rel="noopener noreferrer"
            className="mt-2 block break-all text-sm text-[#e5ff78] underline underline-offset-4">เปิดไฟล์ Draft</a>
          {review.submission_note && <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{review.submission_note}</p>}
          {review.feedback && <p className="mt-3 rounded-lg border border-white/10 p-3 text-sm text-white/70">Feedback: {review.feedback}</p>}
          {review.reviewed_at && <p className="mt-2 text-xs text-white/50">ตรวจเมื่อ {new Date(review.reviewed_at).toLocaleString("th-TH")}</p>}
          {canReview && review.review_status === "SUBMITTED" &&
            <div className="mt-4 border-t border-white/10 pt-4">
              <label htmlFor={`review-feedback-${review.id}`} className="text-xs text-white/60">Feedback</label>
              <textarea id={`review-feedback-${review.id}`} rows={3} value={feedback} maxLength={4000}
                onChange={e=>setFeedback(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-[#202020] p-3 text-sm"/>
              <div className="mt-3 flex gap-2">
                <button disabled={working} onClick={() => void decide(review.id, "APPROVE")}
                  className="rounded-lg bg-[#e5ff78] px-4 py-2 text-sm font-bold text-black disabled:opacity-50">ผ่าน QC</button>
                <button disabled={working || !feedback.trim()} onClick={() => void decide(review.id, "REQUEST_CHANGES")}
                  className="rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200 disabled:opacity-50">ส่งกลับแก้ไข</button>
              </div>
            </div>}
        </article>
      ))}</div>}
    </section>
  );
}
