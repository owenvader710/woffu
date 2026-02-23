// app/projects/[id]/page.tsx
import { use } from "react";
import ProjectDetailClient from "./ProjectDetailClient";

type ParamsLike = { id?: string } | Promise<{ id?: string }>;

export default function ProjectDetailPage({ params }: { params: ParamsLike }) {
  // ✅ รองรับทั้ง params ปกติ และ params แบบ Promise (Next 16 บางโหมด)
  const p = (params as any)?.then ? use(params as any) : (params as any);
  const id = p?.id;

  return <ProjectDetailClient projectId={id ?? ""} />;
}