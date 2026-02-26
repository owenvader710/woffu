// app/(app)/projects/[id]/page.tsx
import React from "react";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

export default function ProjectDetailPage({
  params,
}: {
  params: { id?: string };
}) {
  const projectId = params?.id;

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80">
        Missing project id (route)
      </div>
    );
  }

  return <ProjectDetailClient projectId={projectId} />;
}