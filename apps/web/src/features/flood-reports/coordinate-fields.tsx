import type { MapPoint } from "./report-display";

export type CoordinateFieldsValue = [longitude: string, latitude: string];

export function coordinateFields(point: MapPoint): CoordinateFieldsValue {
  return [point[0].toFixed(6), point[1].toFixed(6)];
}

interface CoordinateFieldsProps {
  value: CoordinateFieldsValue;
  onChange: (value: CoordinateFieldsValue) => void;
}

export function CoordinateFields({ value, onChange }: CoordinateFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-semibold">
        ละติจูด
        <input type="number" required step="any" min={-90} max={90} inputMode="decimal"
          placeholder="7.01" value={value[1]} onChange={(event) => onChange([value[0], event.target.value])}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        ลองจิจูด
        <input type="number" required step="any" min={-180} max={180} inputMode="decimal"
          placeholder="100.47" value={value[0]} onChange={(event) => onChange([event.target.value, value[1]])}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" />
      </label>
    </div>
  );
}
