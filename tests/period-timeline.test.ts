import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPeriodTimeline, type CardForPeriod } from "@/lib/periods/calculate";

// Cierra el 23, vence el 10 del mes siguiente.
const CARD: CardForPeriod = { close_date: "2026-01-23", due_date: "2026-01-10" };

describe("getPeriodTimeline", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("antes del cierre → progreso 0, cuenta al cierre", () => {
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0)); // 15/sep, periodo actual cierra 23/sep
    const t = getPeriodTimeline(CARD, 0);
    expect(t.progressPct).toBe(0);
    expect(t.closeReached).toBe(false);
    expect(t.duePct).toBeGreaterThan(0);
    expect(t.duePct).toBeLessThan(100);
    expect(t.statusText).toBe("Faltan 8 días para el cierre.");
  });

  it("día exacto del cierre → 'El cierre es hoy.'", () => {
    vi.setSystemTime(new Date(2026, 8, 23, 12, 0, 0)); // 23/sep
    const t = getPeriodTimeline(CARD, 0);
    expect(t.closeReached).toBe(false);
    expect(t.progressPct).toBe(0);
    expect(t.statusText).toBe("El cierre es hoy.");
  });

  it("período viejo, entre cierre y vencimiento → avance < duePct", () => {
    // hoy 1/oct; actual = 2026-10 (cierra 23/oct). offset -1 = 2026-09.
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0));
    const t = getPeriodTimeline(CARD, -1);
    expect(t.closeReached).toBe(true);
    expect(t.dueReached).toBe(false);
    expect(t.progressPct).toBeGreaterThan(0);
    expect(t.progressPct).toBeLessThan(t.duePct);
    expect(t.statusText).toBe("Faltan 9 días para el vencimiento.");
  });

  it("período viejo, entre vencimiento y próximo cierre → avance > duePct", () => {
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0)); // 15/oct; offset -1 = 2026-09
    const t = getPeriodTimeline(CARD, -1);
    expect(t.dueReached).toBe(true);
    expect(t.nextCloseReached).toBe(false);
    expect(t.progressPct).toBeGreaterThan(t.duePct);
    expect(t.progressPct).toBeLessThan(100);
    expect(t.statusText).toBe("Faltan 8 días para el próximo cierre.");
  });

  it("período viejo ya cerrado → 100 y 'Período cerrado.'", () => {
    vi.setSystemTime(new Date(2026, 11, 15, 12, 0, 0)); // 15/dic; actual = 2026-12
    const t = getPeriodTimeline(CARD, -2); // 2026-10: próx cierre 23/nov ya pasó
    expect(t.nextCloseReached).toBe(true);
    expect(t.progressPct).toBe(100);
    expect(t.statusText).toBe("Período cerrado.");
  });
});
