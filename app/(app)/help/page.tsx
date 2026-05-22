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

const SECTIONS: Array<{
  icon: React.ReactNode;
  title: string;
  body: string;
}> = [
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Tus tarjetas",
    body:
      "Agregá tantas tarjetas como necesites desde Más → Mis tarjetas → +. Para cada una indicá el banco, los últimos 4 dígitos, el color, el día de cierre y el día de vencimiento. La app calcula automáticamente el período actual y los próximos vencimientos. También podés crear tarjetas adicionales (extensiones) asociándolas a una titular.",
  },
  {
    icon: <Receipt className="h-5 w-5" />,
    title: "Cargar consumos",
    body:
      "Desde el detalle de una tarjeta o desde la sección Movimientos podés registrar un consumo. Ingresá el comercio, el monto, las cuotas y opcionalmente el descuento o reintegro. Si activás descuento, la app calcula el precio final y el monto por cuota. Cada cuota se imputa al período correspondiente automáticamente.",
  },
  {
    icon: <Folder className="h-5 w-5" />,
    title: "Categorías",
    body:
      "Cada consumo puede tener una categoría con emoji y color. Vienen categorías predefinidas (Comida, Transporte, etc.) y podés crear las tuyas desde Ajustes → Mis categorías. El emoji se puede tipear libremente — no estás limitado al teclado por defecto.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Estadísticas",
    body:
      "En la sección Estadísticas vas a ver el gasto del período por categoría, los meses con más movimiento y comparativas. También cada tarjeta tiene su propio panel de estadísticas con la utilización del límite, el saldo del período actual y la evolución mensual.",
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: "Tips rápidos",
    body:
      "• Mantené apretada una tarjeta del homepage para acceder a Editar / Eliminar.\n" +
      "• En consumos en cuotas, al editar una cuota específica podés cambiar solo ese importe sin afectar las demás.\n" +
      "• Desde Ajustes podés exportar e importar un backup de tus datos en formato JSON, o bajar los consumos a CSV para abrirlos en Excel.\n" +
      "• La app funciona como PWA: instalala en tu pantalla de inicio para acceder más rápido.",
  },
];

export default function HelpPage() {
  return (
    <div className="relative space-y-5">
      {/* Luz ambiental roja en la parte superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -z-0 h-72 w-[140%] -translate-x-1/2"
        style={{
          top: -120,
          background:
            "radial-gradient(60% 60% at 50% 40%, oklch(0.62 0.21 25 / 0.45) 0%, oklch(0.62 0.21 25 / 0.12) 38%, transparent 72%)",
          filter: "blur(28px)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <BackButton />
        <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
          Ayuda
        </h1>
      </div>

      <section
        className="relative overflow-hidden rounded-[20px] border border-border p-5"
        style={{
          background:
            "linear-gradient(140deg, oklch(0.62 0.21 25 / 0.16) 0%, var(--card) 55%)",
        }}
      >
        {/* Glow superior-derecho */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.62 0.21 25 / 0.55) 0%, transparent 68%)",
            filter: "blur(12px)",
          }}
        />
        {/* Brillo diagonal sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, transparent 45%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{
              background: "linear-gradient(135deg, oklch(0.68 0.2 30), oklch(0.55 0.22 22))",
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

      <h2 className="px-1 font-display text-[16px] font-semibold text-foreground">
        Manual de uso
      </h2>

      <div className="space-y-3">
        {SECTIONS.map((s, i) => (
          <article
            key={i}
            className="rounded-[18px] border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <header className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {s.icon}
              </span>
              <h3 className="text-[15px] font-semibold text-foreground">
                {s.title}
              </h3>
            </header>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
              {s.body}
            </p>
          </article>
        ))}
      </div>

      <p className="px-1 pb-2 text-center text-[11px] text-muted-foreground">
        ¿Encontraste un problema o tenés una sugerencia? Escribinos para
        contarnos cómo podemos mejorar.
      </p>
    </div>
  );
}
