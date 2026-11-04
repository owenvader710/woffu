"use client";

export type Status = "PRE_ORDER" | "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

type Props = {
  value: Status;
  onChange: (next: Status) => void;
};

const OPTIONS: { value: Status; label: string; disabled?: boolean }[] = [
  { value: "PRE_ORDER", label: "งานล่วงหน้า (อัตโนมัติ)", disabled: true },
  { value: "TODO", label: "รอเริ่ม" },
  { value: "IN_PROGRESS", label: "กำลังทำ" },
  { value: "COMPLETED", label: "เสร็จแล้ว / ขอปิดงาน" },
  { value: "BLOCKED", label: "ติดปัญหา" },
];

/**
 * Native select is easier to use with keyboards, touch devices, and screen
 * readers than the legacy floating portal menu. The parent keeps all approval
 * / blocked-reason rules; this component only emits the selected status.
 */
export default function StatusDropdown({ value, onChange }: Props) {
  return (
    <select
      aria-label="เปลี่ยนสถานะงาน"
      title="เลือกสถานะเพื่อส่งคำขอเปลี่ยนสถานะ"
      value={value}
      onChange={event => onChange(event.target.value as Status)}
      className="woffu-input-simple w-full min-w-[170px] cursor-pointer text-sm sm:w-auto"
    >
      {OPTIONS.map(option => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
