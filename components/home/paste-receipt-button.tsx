"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardPaste } from "lucide-react";
import { parseMercadoPagoReceipt } from "@/lib/receipts/mercadopago";

/**
 * Carga un comprobante copiado al portapapeles.
 *
 * El Atajo de iOS "Cargar en Tarjetas" copia el texto del comprobante y abre
 * la web app instalada con `webapp://`, que siempre arranca en la home (iOS
 * descarta la ruta y el `?comprobante=`). Desde acá se lee el portapapeles
 * —iOS sólo lo permite tras un toque— y se va al alta con los datos.
 */
export function PasteReceiptButton() {
  const router = useRouter();

  async function pasteReceipt() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error("No se pudo leer el portapapeles");
      return;
    }
    if (!parseMercadoPagoReceipt(text)) {
      toast.error("No hay un comprobante copiado", {
        description: "Compartí el comprobante al atajo y volvé a tocar acá.",
      });
      return;
    }
    router.push(`/nuevo?comprobante=${encodeURIComponent(text)}`);
  }

  return (
    <button
      type="button"
      onClick={pasteReceipt}
      aria-label="Pegar comprobante"
      title="Pegar comprobante"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:shadow-md active:scale-95"
    >
      <ClipboardPaste className="h-4 w-4" />
    </button>
  );
}
