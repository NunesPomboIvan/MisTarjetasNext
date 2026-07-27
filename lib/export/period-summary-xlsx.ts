/**
 * lib/export/period-summary-xlsx.ts
 *
 * Genera el workbook (.xlsx) del resumen de período de una o varias
 * tarjetas. Función pura — no accede a la base de datos; recibe los
 * expenses ya consultados y un período ya resuelto por tarjeta.
 * La usan tanto el detalle de tarjeta como Ajustes generales (misma
 * lógica, evita duplicar el formato del Excel en dos lugares).
 */
import ExcelJS from "exceljs";
import {
  expenseFallsInPeriod,
  getInstallmentIndexInPeriod,
  getInstallmentAmountForIndex,
  getAmountInPeriodArs,
  parseLocalDate,
  type Period,
} from "@/lib/periods/calculate";
import type { Card, ExpenseWithCategory } from "@/lib/supabase/database.types";

export interface PeriodSummarySection {
  card: Pick<Card, "name" | "bank" | "last_four">;
  period: Period;
  expenses: ExpenseWithCategory[];
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};
const CURRENCY_FMT = '"$" #,##0.00';
const DATE_FMT = "dd/mm/yyyy";

const COLUMNS = [
  { header: "Fecha", align: "left" as const },
  { header: "Descripción", align: "left" as const },
  { header: "Categoría", align: "left" as const },
  { header: "Cuota", align: "center" as const },
  { header: "Moneda", align: "center" as const },
  { header: "Monto", align: "right" as const },
];

function cardLabel(card: Pick<Card, "name" | "bank" | "last_four">): string {
  const bank = card.bank || card.name;
  return `${bank} ••••${card.last_four}`;
}

/** Excel prohíbe : \ / ? * [ ] en nombres de hoja y limita a 31 caracteres. */
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, "").trim();
  return cleaned.slice(0, 31) || "Resumen";
}

function formatShort(date: Date): string {
  return parseLocalDate(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  ).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function buildPeriodSummaryWorkbook(sections: PeriodSummarySection[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mis Tarjetas";
  workbook.created = new Date();

  const usedNames = new Set<string>();

  for (const section of sections) {
    const { card, period, expenses } = section;

    let sheetName = sanitizeSheetName(cardLabel(card));
    let suffix = 2;
    while (usedNames.has(sheetName)) {
      sheetName = sanitizeSheetName(`${cardLabel(card)} (${suffix})`);
      suffix++;
    }
    usedNames.add(sheetName);

    const sheet = workbook.addWorksheet(sheetName);
    const colCount = COLUMNS.length;

    // Fila 1: título con el rango del período
    sheet.mergeCells(1, 1, 1, colCount);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `${cardLabel(card)} — ${period.label} (${formatShort(period.start)} al ${formatShort(period.end)})`;
    titleCell.font = { bold: true, size: 13 };
    titleCell.alignment = { vertical: "middle" };
    sheet.getRow(1).height = 24;

    // Fila 2: encabezados
    const headerRow = sheet.getRow(2);
    COLUMNS.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle", horizontal: col.align };
    });
    headerRow.height = 20;

    // Filas de datos
    const periodExpenses = expenses.filter((e) => expenseFallsInPeriod(e, period));
    const maxLens = COLUMNS.map((c) => c.header.length);
    let total = 0;
    let rowIndex = 3;

    for (const expense of periodExpenses) {
      const instIdx = getInstallmentIndexInPeriod(expense, period);
      const installmentAmount =
        instIdx >= 0 ? getInstallmentAmountForIndex(expense, instIdx) : 0;
      const amountArs = getAmountInPeriodArs(expense, period);
      total += amountArs;

      const cuotaLabel = expense.recurring
        ? "Fijo"
        : expense.installments > 1
          ? `${instIdx + 1}/${expense.installments}`
          : "Única";

      const categoria = expense.category?.name ?? "Sin categoría";
      const fecha = parseLocalDate(expense.expense_date);

      const row = sheet.getRow(rowIndex);
      const values: (string | number | Date)[] = [
        fecha,
        expense.description,
        categoria,
        cuotaLabel,
        expense.currency,
        installmentAmount,
      ];

      values.forEach((value, i) => {
        const cell = row.getCell(i + 1);
        cell.value = value;
        cell.border = THIN_BORDER;
        cell.alignment = { vertical: "middle", horizontal: COLUMNS[i].align };
        if (i === 0) cell.numFmt = DATE_FMT;
        if (i === 5) cell.numFmt = CURRENCY_FMT;
        const len = value instanceof Date ? 10 : String(value).length;
        if (len > maxLens[i]) maxLens[i] = len;
      });
      rowIndex++;
    }

    // Fila de subtotal
    const totalRow = sheet.getRow(rowIndex);
    sheet.mergeCells(rowIndex, 1, rowIndex, colCount - 1);
    const totalLabelCell = totalRow.getCell(1);
    totalLabelCell.value =
      periodExpenses.length === 0 ? "Sin consumos en este período" : "Total del período";
    totalLabelCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: "right" };
    totalLabelCell.border = THIN_BORDER;

    const totalValueCell = totalRow.getCell(colCount);
    totalValueCell.value = total;
    totalValueCell.font = { bold: true };
    totalValueCell.numFmt = CURRENCY_FMT;
    totalValueCell.border = THIN_BORDER;
    totalValueCell.alignment = { horizontal: "right" };

    // Ancho de columna aproximado al contenido más largo (exceljs no autofitea)
    COLUMNS.forEach((_, i) => {
      sheet.getColumn(i + 1).width = maxLens[i] + 2;
    });
  }

  return workbook;
}
