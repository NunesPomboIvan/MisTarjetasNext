/**
 * Lectura de comprobantes de Mercado Pago.
 *
 * El Atajo de iOS "Cargar en Tarjetas" extrae el texto del PDF del comprobante
 * y abre la app con `?comprobante=<texto>`. Acá se interpreta ese texto para
 * precargar el alta de consumo (importe, comercio, fecha y n.° de operación).
 */

export interface ParsedReceipt {
  /** Importe en pesos. */
  amount: number | null;
  /** Comercio / destinatario del pago. */
  merchant: string | null;
  /** Fecha del pago en formato YYYY-MM-DD. */
  date: string | null;
  /** Hora del pago (HH:mm), si figura. */
  time: string | null;
  /** N.° de operación de Mercado Pago. */
  operationId: string | null;
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

// Los miles pueden venir separados por punto, coma o espacio (el texto
// reconocido de una imagen a veces cambia "12.580" por "12,580" o "12 580"):
// un grupo de exactamente 3 dígitos siempre es de miles. Los centavos pueden
// venir tras coma, espacio, salto de línea o pegados sin separador (en el PDF
// van en superíndice y el texto queda "$ 12.58000"), pero no si son el
// comienzo de una fecha ("05/03/2026").
const AMOUNT_RE = /\$\s*(\d{1,3}(?:[., ]\d{3})+|\d+)(?:[,\s]?(\d{2}))?(?![\d/])/;
// "19 de noviembre de 2026, 12:03 hs." (pago) o "19/noviembre/2026 a las
// 22:21." (transferencia).
const LONG_DATE_RE =
  /(\d{1,2})(?:\s+de\s+|\s*\/\s*)([a-záéíóú]+)(?:\s+de\s+|\s*\/\s*)(\d{4})(?:,?\s*(?:a\s+las\s+)?(\d{1,2}:\d{2}))?/i;
const SHORT_DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/;
const OPERATION_RE = /operaci[oó]n[^\d]{0,40}(\d{6,})/i;
const ID_LINE_RE = /^(CUIT|CUIL|CVU|CBU|DNI|Alias)\b/i;

const pad = (n: number | string) => String(n).padStart(2, "0");

/** Interpreta el texto de un comprobante. Devuelve null si no reconoce nada. */
export function parseMercadoPagoReceipt(rawText: string | null | undefined): ParsedReceipt | null {
  if (!rawText) return null;
  const text = rawText.replace(/\r/g, "").replace(/[ \t ]+/g, " ");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ParsedReceipt = {
    amount: null,
    merchant: null,
    date: null,
    time: null,
    operationId: null,
  };

  // Importe: "$ 8.700,00", "$ 8.700 00" (centavos como superíndice) o "$8.700".
  const amountMatch = text.match(AMOUNT_RE);
  if (amountMatch) {
    const whole = parseInt(amountMatch[1].replace(/[., ]/g, ""), 10);
    const cents = amountMatch[2] ? parseInt(amountMatch[2], 10) / 100 : 0;
    if (Number.isFinite(whole)) result.amount = whole + cents;
  }

  // Fecha: "19 de noviembre de 2026, 12:03 hs." o "19/11/2026".
  const longDate = text.match(LONG_DATE_RE);
  const month = longDate ? MONTHS[longDate[2].toLowerCase()] : undefined;
  if (longDate && month) {
    result.date = `${longDate[3]}-${pad(month)}-${pad(longDate[1])}`;
    result.time = longDate[4] ?? null;
  } else {
    const shortDate = text.match(SHORT_DATE_RE);
    if (shortDate) result.date = `${shortDate[3]}-${shortDate[2]}-${shortDate[1]}`;
  }

  // N.° de operación.
  const op = text.match(OPERATION_RE);
  if (op) result.operationId = op[1];

  // Comercio: en "Origen y destino" el primer titular es quien paga y el
  // segundo, el destinatario.
  const originIdx = lines.findIndex((l) => /origen y destino/i.test(l));
  if (originIdx >= 0) {
    const names: string[] = [];
    for (let i = originIdx + 1; i < lines.length && names.length < 2; i++) {
      const line = lines[i];
      if (ID_LINE_RE.test(line) || /mercado pago/i.test(line) || /operaci[oó]n/i.test(line)) {
        continue;
      }
      if (/[a-záéíóúñ]/i.test(line) && !line.startsWith("$")) names.push(line);
    }
    result.merchant = names[1] ?? names[0] ?? null;
  }
  if (!result.merchant) {
    const alt = text.match(/(?:pagaste a|destino:?)\s+([^\n]+)/i);
    if (alt) result.merchant = alt[1].trim();
  }
  if (result.merchant) result.merchant = result.merchant.slice(0, 200);

  return result.amount || result.merchant || result.operationId ? result : null;
}

/** Nota que se guarda en el consumo para identificar el comprobante. */
export function receiptNote(operationId: string): string {
  return `Mercado Pago · Op. ${operationId}`;
}
