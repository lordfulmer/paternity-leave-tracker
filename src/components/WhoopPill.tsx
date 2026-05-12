import type { WhoopStatus } from "@/types";
import { statusBg, statusColor, statusLabel } from "@/lib/helpers";

export default function WhoopPill({ status, recovery }: { status: WhoopStatus; recovery?: number | null }) {
  return (
    <span className={`pill ${statusBg(status)} ${statusColor(status)}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      {recovery != null ? `${recovery}% · ${statusLabel(status)}` : statusLabel(status)}
    </span>
  );
}
