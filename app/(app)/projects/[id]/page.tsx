// app/(app)/projects/[id]/page.tsx
import React from "react";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

// ✅ ใช้หน้ารายละเอียดแบบ client ที่มีครบ: ข้อมูล, ประวัติ, ขอเปลี่ยนสถานะ, แก้ไข ฯลฯ
export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient projectId={params.id} />;
}