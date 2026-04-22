import { Calendar } from "lucide-react";
import { useRef } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export interface DateRange {
  start: string;
  end: string;
}

interface Props {
  value: DateRange;
  onChange: (v: DateRange) => void;
  min?: string;
  max?: string;
}

export function DateRangePicker({ value, onChange, min, max }: Props) {
  return (
    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
      <Label>Date range</Label>
      <div className="flex items-center gap-2">
        <DateField
          value={value.start}
          min={min}
          max={max}
          onChange={(v) => onChange({ ...value, start: v })}
        />
        <span className="pinto-xs text-pinto-gray-4">→</span>
        <DateField
          value={value.end}
          min={min}
          max={max}
          onChange={(v) => onChange({ ...value, end: v })}
        />
      </div>
    </div>
  );
}

function DateField({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    // Chrome/Edge 99+, Safari 16.4+, Firefox 101+ expose showPicker().
    // Fall back to focus() on older browsers — clicking the native indicator
    // remains available either way.
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // showPicker throws if the input is not focused or user-gesture is
        // missing; ignore and fall through to focus().
      }
    }
    el.focus();
  };

  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={openPicker}
      className={cn(
        "group relative flex h-10 w-full min-w-[130px] cursor-pointer items-center rounded-md border border-pinto-gray-2 bg-white pl-3 pr-9 shadow-sm transition-colors sm:w-[150px]",
        "hover:bg-pinto-gray-1 focus-within:ring-1 focus-within:ring-ring",
      )}
    >
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0",
          "pinto-sm text-pinto-gray-5 outline-none",
          // Hide the native picker indicator so we can render our own, but
          // keep it interactive by stretching it across the whole input.
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:inset-0",
          "[&::-webkit-calendar-picker-indicator]:h-full",
          "[&::-webkit-calendar-picker-indicator]:w-full",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-0",
          "[&::-webkit-date-and-time-value]:text-left",
        )}
      />
      <Calendar
        className="pointer-events-none absolute right-3 h-4 w-4 text-pinto-green-4 transition-colors group-hover:text-pinto-green-3"
        strokeWidth={1.75}
      />
    </div>
  );
}
