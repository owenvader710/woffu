// app/(app)/projects/[id]/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getProject(id: string) {
  const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getLogs(id: string) {
  const res = await fetch(`/api/projects/${id}/logs`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id);
  const logs = await getLogs(params.id);

  if (!project) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-semibold">Project not found</div>
        <Link href="/projects" className="text-white/70 underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-white/50">
            <Link href="/projects" className="underline">Projects</Link> / {project.id}
          </div>
          <div className="text-2xl font-semibold">{project.title || project.name || "Untitled Project"}</div>
          <div className="text-sm text-white/60">{project.description || "—"}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs text-white/50">Status</div>
          <div className="text-sm font-semibold">{project.status || "—"}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold mb-3">Overview</div>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/50">Owner</div>
              <div>{project.owner_name || project.owner || "—"}</div>
            </div>
            <div className="rounded-xl bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/50">Team</div>
              <div>{project.team || "—"}</div>
            </div>
            <div className="rounded-xl bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/50">Created</div>
              <div>{project.created_at ? new Date(project.created_at).toLocaleString() : "—"}</div>
            </div>
            <div className="rounded-xl bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/50">Updated</div>
              <div>{project.updated_at ? new Date(project.updated_at).toLocaleString() : "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold mb-3">Activity</div>
          <div className="space-y-2">
            {Array.isArray(logs) && logs.length ? (
              logs.slice(0, 8).map((l: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="text-xs text-white/50">
                    {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                  </div>
                  <div className="text-sm">{l.message || l.action || "—"}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/60">No logs</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}