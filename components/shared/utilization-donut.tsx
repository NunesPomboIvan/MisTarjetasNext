interface UtilizationDonutProps {
  /** Porcentaje 0-100 */
  percent: number;
  /** Diámetro en px */
  size?: number;
  /** Grosor del anillo */
  thickness?: number;
  /** Color del anillo */
  color?: string;
  /** Color del track (fondo del anillo) */
  trackColor?: string;
  /** Texto del label debajo del porcentaje. Default: "Utilizado" */
  label?: string;
  /** Mostrar solo el donut, sin texto al centro */
  hideLabel?: boolean;
}

export function UtilizationDonut({
  percent,
  size = 90,
  thickness = 9,
  color = "#6366f1",
  trackColor = "#e5e7eb",
  label = "Utilizado",
  hideLabel = false,
}: UtilizationDonutProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
        />
      </svg>

      {!hideLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display font-bold leading-none text-foreground"
            style={{ fontSize: size * 0.22 }}
          >
            {Math.round(clamped)}%
          </span>
          {label && (
            <span
              className="mt-0.5 text-muted-foreground"
              style={{ fontSize: size * 0.10 }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
