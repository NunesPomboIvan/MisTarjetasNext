import { describe, it, expect } from "vitest";
import { parseMercadoPagoReceipt, receiptNote } from "@/lib/receipts/mercadopago";

const ROTISERIA = `Comprobante de pago
Jueves, 19 de noviembre de 2026, 12:03 hs.
$ 8.700 00
Origen y destino
Ivan Nunes Pombo
CUIT: 20384870296
Mercado Pago
Rotiseria Rosario
CUIT: 23188971814
Mercado Pago
N.° de operación de Mercado Pago
189432148401`;

describe("parseMercadoPagoReceipt", () => {
  it("lee el comprobante de una transferencia", () => {
    expect(parseMercadoPagoReceipt(ROTISERIA)).toEqual({
      amount: 8700,
      merchant: "Rotiseria Rosario",
      date: "2026-11-19",
      time: "12:03",
      operationId: "189432148401",
    });
  });

  it("toma centavos con coma y número de operación en la misma línea", () => {
    const text = ROTISERIA.replace("$ 8.700 00", "$ 15.250,50")
      .replace("Rotiseria Rosario", "Farmacia Del Centro SRL")
      .replace("Mercado Pago\n189432148401", "Mercado Pago 189432148402");
    const r = parseMercadoPagoReceipt(text);
    expect(r?.amount).toBe(15250.5);
    expect(r?.merchant).toBe("Farmacia Del Centro SRL");
    expect(r?.operationId).toBe("189432148402");
  });

  it("acepta CRLF y espacios duros", () => {
    const r = parseMercadoPagoReceipt(ROTISERIA.replace(/\n/g, "\r\n").replace("$ ", "$ "));
    expect(r?.amount).toBe(8700);
    expect(r?.merchant).toBe("Rotiseria Rosario");
  });

  it("acepta fecha corta dd/mm/aaaa", () => {
    const r = parseMercadoPagoReceipt("Pagaste a Kiosco Juan\n$ 1.200\n05/03/2026");
    expect(r).toMatchObject({ amount: 1200, merchant: "Kiosco Juan", date: "2026-03-05" });
  });

  it("devuelve null si el texto no es un comprobante", () => {
    expect(parseMercadoPagoReceipt("")).toBeNull();
    expect(parseMercadoPagoReceipt("hola que tal")).toBeNull();
  });

  it("arma la nota con el n.° de operación", () => {
    expect(receiptNote("189432148401")).toBe("Mercado Pago · Op. 189432148401");
  });
});
