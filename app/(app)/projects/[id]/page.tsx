// app/(app)/projects/[id]/page.tsx
import React from "react";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

type Params = { id?: string };

export default async function ProjectDetailPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  // ✅ รองรับกรณี Next ส่ง params มาเป็น Promise (บาง env/prod)
  const resolvedParams = await params;
  const projectId = resolvedParams?.id;

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80">
        Missing project id (route)
      </div>
    );
  }

  return <ProjectDetailClient projectId={projectId} />;
}