// utils/projectMeta.ts
// เก็บ meta ของโปรเจกต์ไว้ใน description เพื่อไม่ต้องเพิ่มคอลัมน์ใหม่ใน DB

export type ProjectMeta = {
  productCode?: string;
  productGroup?: string;
};

export type ParsedProjectMeta = ProjectMeta & {
  description: string; // เนื้อหา description จริง (ไม่รวม meta header)
};

const META_START = "[[meta]]";
const META_END = "[[/meta]]";

export function parseProjectMeta(raw?: string | null): ParsedProjectMeta {
  const text = (raw ?? "").toString();

  const start = text.indexOf(META_START);
  const end = text.indexOf(META_END);

  // ไม่มี meta
  if (start === -1 || end === -1 || end < start) {
    return { description: text.trim() };
  }

  const metaBlock = text.slice(start + META_START.length, end).trim();
  const rest = text.slice(end + META_END.length).replace(/^\s+/, "");

  const meta: ProjectMeta = {};
  for (const line of metaBlock.split(/\r?\n/)) {
    const [k, ...vParts] = line.split("=");
    const key = (k ?? "").trim();
    const value = vParts.join("=").trim();
    if (!key) continue;
    if (key === "product_code") meta.productCode = value || undefined;
    if (key === "product_group") meta.productGroup = value || undefined;
  }

  return {
    ...meta,
    description: rest.trim(),
  };
}

export function buildProjectDescription(meta: ProjectMeta, description: string): string {
  const code = (meta.productCode ?? "").trim();
  const group = (meta.productGroup ?? "").trim();
  const body = (description ?? "").toString().trim();

  // ไม่มี meta อะไรเลย -> ส่ง description เดิมแบบสะอาด
  if (!code && !group) return body;

  const lines: string[] = [];
  if (code) lines.push(`product_code=${code}`);
  if (group) lines.push(`product_group=${group}`);

  return `${META_START}\n${lines.join("\n")}\n${META_END}\n\n${body}`.trim();
}