"use client";

interface LinePoint {
  date: string;
  label: string;
  amount: number;
}

interface ExpenseLineChartProps {
  data: LinePoint[];
  height?: number;
}

export function ExpenseLineChart({ data, height = 160 }: ExpenseLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[13px] text-muted-foreground" style={{ height }}>
        Sin datos
      </div>
    );
  }

  // Acumulamos para tener una curva creciente (más estética para "evolución")
  let acc = 0;
  const accData = data.map((d) => {
    acc += d.amount;
    return { ...d, acc };
  });

  const max = Math.max(...accData.map((p) => p.acc), 1);

  const width = 600; // viewBox virtual
  const padX = 16;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = accData.map((d, i) => {
    const x = padX + (accData.length === 1 ? innerW / 2 : (i / (accData.length - 1)) * innerW);
    const y = padY + innerH - (d.acc / max) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`;

  // Etiquetas X — solo primer/medio/último
  const labels = [
    points[0],
    points[Math.floor(points.length / 2)],
    points[points.length - 1],
  ].filter((p, i, arr) => arr.indexOf(p) === i);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines horizontales */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line
            key={i}
            x1={padX}
            x2={width - padX}
            y1={padY + innerH * f}
            y2={padY + innerH * f}
            stroke="var(--border)"
            strokeDasharray="3 4"
            strokeWidth={0.6}
          />
        ))}

        {/* Área bajo la curva */}
        <path d={areaD} fill="url(#lineFill)" />

        {/* Línea principal */}
        <path
          d={pathD}
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Punto final */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={4}
          fill="#6366f1"
        />
      </svg>

      <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={i}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}
