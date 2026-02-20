"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onApply: (payload: { blob: Blob; previewDataUrl: string }) => void | Promise<void>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function AvatarCropModal({ open, file, onClose, onApply }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // Controls
  const [zoom, setZoom] = useState(1.2);
  const [offsetX, setOffsetX] = useState(0); // px
  const [offsetY, setOffsetY] = useState(0); // px

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const hasFile = !!file;

  useEffect(() => {
    if (!open) return;

    // reset on open
    setZoom(1.2);
    setOffsetX(0);
    setOffsetY(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!file) {
      setDataUrl("");
      setImg(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }, [file, open]);

  useEffect(() => {
    if (!dataUrl) return;
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = dataUrl;
  }, [dataUrl]);

  const canRender = useMemo(() => open && !!img, [open, img]);

  // Draw preview
  useEffect(() => {
    if (!canRender) return;
    const canvas = previewCanvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width; // square
    ctx.clearRect(0, 0, size, size);

    // circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // cover-like draw with zoom+offset
    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * zoom;

    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const x = size / 2 - drawW / 2 + offsetX;
    const y = size / 2 - drawH / 2 + offsetY;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    // border ring
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 6;
    ctx.stroke();
  }, [canRender, img, zoom, offsetX, offsetY]);

  if (!open) return null;

  async function apply() {
    if (!img) return;

    // output 256x256 PNG transparent outside circle
    const outSize = 256;
    const out = document.createElement("canvas");
    out.width = outSize;
    out.height = outSize;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, outSize, outSize);

    ctx.save();
    ctx.beginPath();
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const baseScale = Math.max(outSize / img.width, outSize / img.height);
    const scale = baseScale * zoom;

    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const x = outSize / 2 - drawW / 2 + offsetX;
    const y = outSize / 2 - drawH / 2 + offsetY;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    const previewDataUrl = out.toDataURL("image/png");

    const blob: Blob = await new Promise((resolve, reject) => {
      out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.92);
    });

    await onApply({ blob, previewDataUrl });
  }

  function reset() {
    setZoom(1.2);
    setOffsetX(0);
    setOffsetY(0);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[560px] rounded-2xl border bg-zinc-900 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Edit Image</div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-white/80 hover:bg-white/10"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row">
          {/* Preview circle */}
          <div className="flex-1">
            <div className="rounded-xl bg-black/30 p-4">
              <div className="mx-auto w-fit">
                <canvas ref={previewCanvasRef} width={260} height={260} className="block rounded-full" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full md:w-[240px]">
            {!hasFile ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                ยังไม่ได้เลือกไฟล์รูป
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/70">Zoom</div>
                  <input
                    type="range"
                    min={0.8}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/70">Left / Right</div>
                  <input
                    type="range"
                    min={-140}
                    max={140}
                    step={1}
                    value={offsetX}
                    onChange={(e) => setOffsetX(clamp(parseInt(e.target.value, 10), -140, 140))}
                    className="mt-2 w-full"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/70">Up / Down</div>
                  <input
                    type="range"
                    min={-140}
                    max={140}
                    step={1}
                    value={offsetY}
                    onChange={(e) => setOffsetY(clamp(parseInt(e.target.value, 10), -140, 140))}
                    className="mt-2 w-full"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button onClick={reset} className="text-sm text-white/70 hover:text-white">
                    Reset
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                    >
                      Cancel
                    </button>
                    <button onClick={apply} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm hover:opacity-90">
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              * จะอัปโหลดเป็น PNG วงกลม พื้นหลังโปร่งใส
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
