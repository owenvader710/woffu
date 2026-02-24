"use client";

import React, { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";

type Props = {
  open: boolean;
  imageFile: File | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

export default function AvatarCropModal({
  open,
  imageFile,
  onClose,
  onConfirm,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // ✅ สำคัญมาก: สร้าง preview URL เมื่อมีไฟล์ใหม่
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  if (!open) return null;

  async function createImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = reject;
    });
  }

  async function getCroppedImg() {
    if (!imageSrc || !croppedAreaPixels) return;

    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0b0b0b] p-6 text-white">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">Edit Image</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        <div className="relative h-80 w-full bg-black rounded-xl overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          )}
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              const blob = await getCroppedImg();
              if (blob) onConfirm(blob);
            }}
            className="px-5 py-2 rounded-xl bg-[#e5ff78] text-black font-bold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}