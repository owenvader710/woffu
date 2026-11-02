import { NextResponse } from "next/server";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
type Mime = (typeof SUPPORTED_MIME)[number];

function fileSignature(bytes: Buffer): Mime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

/** Read at most 5 MB of a permitted asset. Video projects should link Google Drive. */
export async function validatePublicAttachment(file: File) {
  if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
    return { error: NextResponse.json({ error: "ขนาดไฟล์ต้องไม่เกิน 5 MB" }, { status: 413 }) };
  }
  if (!SUPPORTED_MIME.includes(file.type as Mime)) {
    return { error: NextResponse.json({ error: "รองรับเฉพาะ JPG, PNG, WebP และ PDF" }, { status: 415 }) };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = fileSignature(buffer);
  if (!detectedType || detectedType !== file.type) {
    return { error: NextResponse.json({ error: "ชนิดไฟล์ไม่ตรงกับเนื้อหาจริง" }, { status: 415 }) };
  }
  const safeFilename = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(-80) || "attachment";
  return { buffer, mime: detectedType, safeFilename };
}
