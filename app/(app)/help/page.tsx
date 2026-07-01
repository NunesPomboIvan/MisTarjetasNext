import { BackButton } from "@/components/shared/back-button";
import {
  CreditCard,
  Receipt,
  Folder,
  BarChart3,
  Lightbulb,
  Sparkles,
} from "lucide-react";

export const metadata = { title: "Ayuda" };

type Accent = readonly [L: number, C: number, H: number];

const SECTIONS: Array<{
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: Accent;
}> = [
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Tus tarjetas",
    body:
      "Agregá tantas tarjetas como necesites desde Más → Mis tarjetas → +. Para cada una indicá el banco, los últimos 4 dígitos, el color, el día de cierre y el día de vencimiento. La app calcula automáticamente el período actual y los próximos vencimientos. También podés crear tarjetas adicionales (extensiones) asociándolas a una titular.",
    accent: [0.62, 0.2, 250], // azul
  },
  {
    icon: <Receipt className="h-5 w-5" />,
    title: "Cargar consumos",
    body:
      "Desde el detalle de una tarjeta o desde la sección Movimientos podés registrar un consumo. Ingresá el comercio, el monto, las cuotas y opcionalmente el descuento o reintegro. Si activás descuento, la app calcula el precio final y el monto por cuota. Cada cuota se imputa al período correspondiente automáticamente.",
    accent: [0.74, 0.16, 70], // ámbar
  },
  {
    icon: <Folder className="h-5 w-5" />,
    title: "Categorías",
    body:
      "Cada consumo puede tener una categoría con emoji y color. Vienen categorías predefinidas (Comida, Transporte, etc.) y podés crear las tuyas desde Ajustes → Mis categorías. El emoji se puede tipear libremente — no estás limitado al teclado por defecto.",
    accent: [0.62, 0.22, 295], // violeta
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Estadísticas",
    body:
      "En la sección Estadísticas vas a ver el gasto del período por categoría, los meses con más movimiento y comparativas. También cada tarjeta tiene su propio panel de estadísticas con la utilización del límite, el saldo del período actual y la evolución mensual.",
    accent: [0.65, 0.18, 160], // esmeralda
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: "Tips rápidos",
    body:
      "• Mantené apretada una tarjeta del homepage para acceder a Editar / Eliminar.\n" +
      "• En consumos en cuotas, al editar una cuota específica podés cambiar solo ese importe sin afectar las demás.\n" +
      "• Desde Ajustes podés exportar e importar un backup de tus datos en formato JSON, o bajar los consumos a CSV para abrirlos en Excel.\n" +
      "• La app funciona como PWA: instalala en tu pantalla de inicio para acceder más rápido.",
    accent: [0.78, 0.17, 95], // amarillo
  },
];

function alpha([L, C, H]: Accent, a: number) {
  return `oklch(${L} ${C} ${H} / ${a})`;
}
function solid([L, C, H]: Accent) {
  return `oklch(${L} ${C} ${H})`;
}

function EffectCard({
  index,
  accent,
  icon,
  title,
  body,
}: {
  index: number;
  accent: Accent;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const variant = index % 5;
  const a = (n: number) => alpha(accent, n);

  let cardBackground = "var(--card)";
  let overlays: React.ReactNode = null;

  switch (variant) {
    case 0: // Flare superior-izquierdo + sheen diagonal
      cardBackground = `linear-gradient(135deg, ${a(0.15)} 0%, var(--card) 60%)`;
      overlays = (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full"
            style={{
              background: `radial-gradient(circle, ${a(0.55)} 0%, transparent 70%)`,
              filter: "blur(14px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
            }}
          />
        </>
      );
      break;

    case 1: // Beam vertical sobre el borde derecho
      cardBackground = `linear-gradient(255deg, ${a(0.13)} 0%, var(--card) 55%)`;
      overlays = (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-[8%] h-[84%] w-24 rounded-full"
            style={{
              background: `radial-gradient(ellipse, ${a(0.55)} 0%, transparent 70%)`,
              filter: "blur(18px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(270deg, ${a(0.08)} 0%, transparent 50%)`,
            }}
          />
        </>
      );
      break;

    case 2: // Spotlight inferior + sheen invertido
      cardBackground = `linear-gradient(0deg, ${a(0.16)} 0%, var(--card) 60%)`;
      overlays = (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-14 left-[28%] h-24 w-40 rounded-full"
            style={{
              background: `radial-gradient(ellipse, ${a(0.6)} 0%, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(240deg, rgba(255,255,255,0.07) 0%, transparent 50%)",
            }}
          />
        </>
      );
      break;

    case 3: // Línea superior brillante + glow en esquina derecha
      cardBackground = `linear-gradient(180deg, ${a(0.15)} 0%, var(--card) 55%)`;
      overlays = (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${a(0.7)} 50%, transparent 100%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
            style={{
              background: `radial-gradient(circle, ${a(0.5)} 0%, transparent 70%)`,
              filter: "blur(14px)",
            }}
          />
        </>
      );
      break;

    case 4: // Cruz de rayos diagonales + glow inferior-derecho
      cardBackground = `linear-gradient(135deg, ${a(0.14)} 0%, var(--card) 55%)`;
      overlays = (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(45deg, transparent 35%, ${a(0.16)} 50%, transparent 65%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(135deg, transparent 35%, ${a(0.12)} 50%, transparent 65%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full"
            style={{
              background: `radial-gradient(circle, ${a(0.45)} 0%, transparent 70%)`,
              filter: "blur(14px)",
            }}
          />
        </>
      );
      break;
  }

  return (
    <article
      className="relative overflow-hidden rounded-[18px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: cardBackground,
        borderColor: a(0.25),
      }}
    >
      {overlays}
      <header className="relative flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: a(0.2), color: solid(accent) }}
        >
          {icon}
        </span>
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      </header>
      <p className="relative mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </article>
  );
}

export default function HelpPage() {
  return (
    <div className="relative space-y-5">
      {/* Capa ambiental: aurora multicolor distribuida en toda la página */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -inset-y-16 -z-0 overflow-hidden"
        style={{
          background: [
            // coral (hero)
            "radial-gradient(45% 14% at 50% 2%, oklch(0.62 0.21 25 / 0.45) 0%, transparent 72%)",
            // azul
            "radial-gradient(38% 11% at 10% 18%, oklch(0.62 0.20 250 / 0.32) 0%, transparent 75%)",
            // ámbar
            "radial-gradient(40% 12% at 90% 32%, oklch(0.74 0.16 70 / 0.30) 0%, transparent 75%)",
            // violeta
            "radial-gradient(42% 14% at 14% 48%, oklch(0.62 0.22 295 / 0.32) 0%, transparent 75%)",
            // esmeralda
            "radial-gradient(40% 12% at 86% 64%, oklch(0.65 0.18 160 / 0.32) 0%, transparent 75%)",
            // amarillo
            "radial-gradient(42% 13% at 16% 80%, oklch(0.78 0.17 95 / 0.30) 0%, transparent 75%)",
            // rosa
            "radial-gradient(45% 14% at 60% 98%, oklch(0.66 0.22 350 / 0.32) 0%, transparent 72%)",
          ].join(", "),
          filter: "blur(40px)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <BackButton href="/more" />
        <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
          Ayuda
        </h1>
      </div>

      {/* Hero: gradient coral + glow secundario en magenta para variar */}
      <section
        className="relative overflow-hidden rounded-[20px] border border-border p-5"
        style={{
          background:
            "linear-gradient(140deg, oklch(0.62 0.21 25 / 0.18) 0%, oklch(0.66 0.22 340 / 0.10) 45%, var(--card) 75%)",
        }}
      >
        {/* Glow coral superior-derecho */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.62 0.21 25 / 0.55) 0%, transparent 68%)",
            filter: "blur(14px)",
          }}
        />
        {/* Glow magenta inferior-izquierdo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.66 0.22 340 / 0.45) 0%, transparent 70%)",
            filter: "blur(16px)",
          }}
        />
        {/* Brillo diagonal */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.12) 0%, transparent 45%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.68 0.2 30), oklch(0.6 0.22 330))",
              boxShadow: "0 8px 22px -8px oklch(0.62 0.21 25 / 0.7)",
            }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-foreground">
              ¿Qué es Mis Tarjetas?
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              Una app pensada para llevar el control de tus tarjetas de crédito.
              Cargás tus consumos, vencimientos y cuotas en un solo lugar y
              siempre sabés cuánto vas a pagar este mes, cuándo cierra cada
              tarjeta y cómo se reparte el gasto.
            </p>
          </div>
        </div>
      </section>

      <h2 className="relative px-1 font-display text-[16px] font-semibold text-foreground">
        Manual de uso
      </h2>

      <div className="relative space-y-3">
        {SECTIONS.map((s, i) => (
          <EffectCard
            key={i}
            index={i}
            accent={s.accent}
            icon={s.icon}
            title={s.title}
            body={s.body}
          />
        ))}
      </div>

      <p className="relative px-1 pb-2 text-center text-[11px] text-muted-foreground">
        ¿Encontraste un problema o tenés una sugerencia? Escribinos para
        contarnos cómo podemos mejorar.
      </p>
    </div>
  );
}
