import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPeriodTimeline, type CardForPeriod } from "@/lib/periods/calculate";

// Cierra el 23, vence el 10 del mes siguiente.
const CARD: CardForPeriod = { close_date: "2026-01-23", due_date: "2026-01-10" };

describe("getPeriodTimeline", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hitos: último vencimiento, cierre y vencimiento del período", () => {
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0)); // 15/sep, período actual cierra 23/sep
    const t = getPeriodTimeline(CARD, 0);
    // Último vencimiento = vencimiento del período anterior (10/sep).
    expect(t.lastDue).not.toBeNull();
    expect(t.lastDue!.getMonth()).toBe(8);
    expect(t.lastDue!.getDate()).toBe(10);
    // Cierre actual 23/sep, vencimiento actual 10/oct.
    expect(t.close.getMonth()).toBe(8);
    expect(t.close.getDate()).toBe(23);
    expect(t.due.getMonth()).toBe(9);
    expect(t.due.getDate()).toBe(10);
  });

  it("antes del cierre → cuenta al cierre, avance entre últ. venc. y cierre", () => {
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
    const t = getPeriodTimeline(CARD, 0);
    expect(t.lastDueReached).toBe(true);
    expect(t.closeReached).toBe(false);
    expect(t.dueReached).toBe(false);
    expect(t.closePct).toBeGreaterThanOrEqual(34);
    expect(t.closePct).toBeLessThanOrEqual(66);
    expect(t.progressPct).toBeGreaterThan(0);
    expect(t.progressPct).toBeLessThan(t.closePct);
    expect(t.statusText).toBe("Cierra en 8 días");
  });

  it("día exacto del cierre → 'Cierra hoy', avance junto al nodo de cierre", () => {
    vi.setSystemTime(new Date(2026, 8, 23, 12, 0, 0)); // 23/sep
    const t = getPeriodTimeline(CARD, 0);
    expect(t.closeReached).toBe(false);
    expect(t.statusText).toBe("Cierra hoy");
    expect(t.progressPct).toBeGreaterThan(0);
    expect(t.progressPct).toBeLessThanOrEqual(t.closePct);
  });

  it("período viejo, entre cierre y vencimiento → avance > closePct, cuenta al vencimiento", () => {
    // hoy 1/oct; actual = 2026-10 (cierra 23/oct). offset -1 = 2026-09.
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0));
    const t = getPeriodTimeline(CARD, -1);
    expect(t.closeReached).toBe(true);
    expect(t.dueReached).toBe(false);
    expect(t.progressPct).toBeGreaterThan(t.closePct);
    expect(t.progressPct).toBeLessThan(100);
    expect(t.statusText).toBe("Vence en 9 días");
  });

  it("período viejo ya vencido → avance 100 y 'Período cerrado'", () => {
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0)); // 15/oct; offset -1 = 2026-09 venció 10/oct
    const t = getPeriodTimeline(CARD, -1);
    expect(t.dueReached).toBe(true);
    expect(t.progressPct).toBe(100);
    expect(t.statusText).toBe("Período cerrado");
  });

  it("sin período anterior → lastDue null y primer hito pendiente", () => {
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
    const t = getPeriodTimeline(CARD, 0, { firstPeriodKey: "2026-09" });
    expect(t.lastDue).toBeNull();
    expect(t.lastDueReached).toBe(false);
    // El eje sigue siendo válido y el cierre queda acotado.
    expect(t.closePct).toBeGreaterThanOrEqual(34);
    expect(t.closePct).toBeLessThanOrEqual(66);
    expect(t.statusText).toBe("Cierra en 8 días");
  });

  it("las flechas recalculan los hitos por período (offset)", () => {
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
    const actual = getPeriodTimeline(CARD, 0);
    const siguiente = getPeriodTimeline(CARD, 1);
    // El vencimiento del período siguiente es el "último vencimiento" del que le sigue.
    expect(siguiente.lastDue!.getTime()).toBe(actual.due.getTime());
    expect(siguiente.close.getMonth()).toBe(9); // cierra 23/oct
  });
});
