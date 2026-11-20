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

  it("toma los miles aunque vengan con coma o espacio", () => {
    for (const raw of ["$ 12.580", "$ 12,580", "$ 12 580", "$12.580", "$ 12.580,00", "$ 12,580 00"]) {
      const r = parseMercadoPagoReceipt(ROTISERIA.replace("$ 8.700 00", raw));
      expect(r?.amount, raw).toBe(12580);
    }
    expect(parseMercadoPagoReceipt(ROTISERIA.replace("$ 8.700 00", "$ 1.234.567,89"))?.amount).toBe(
      1234567.89,
    );
  });

  it("lee el texto real del PDF, con los centavos pegados al importe", () => {
    const pdf = `Comprobante de pago
Jueves, 19 de noviembre de 2026, 19:41 hs.

$ 12.58000
Origen y destino

Ivan Nunes Pombo
CUIT: 20384870296
Mercado Pago

DIA
CUIT: 30685849751
Mercado Pago

N.° de operación de Mercado Pago

190605700184`;
    expect(parseMercadoPagoReceipt(pdf)).toEqual({
      amount: 12580,
      merchant: "DIA",
      date: "2026-11-19",
      time: "19:41",
      operationId: "190605700184",
    });
    expect(parseMercadoPagoReceipt(pdf.replace("$ 12.58000", "$ 4.60000"))?.amount).toBe(4600);
    expect(parseMercadoPagoReceipt(pdf.replace("$ 12.58000", "$ 1.234.56750"))?.amount).toBe(
      1234567.5,
    );
  });

  it("lee el comprobante de transferencia en imagen (texto reconocido)", () => {
    const img = `mercado
pago
Comprobante de transferencia
19/noviembre/2026 a las 22:21.
$ 37.800
Motivo: Varios
Origen y destino
Ivan Nunes Pombo
Mercado Pago
CVU: 0000003100051871641290
CUIT/CUIL: 20-38487029-6
Martin Acuña
Mercado Pago
CVU: 0000003100085186396165
CUIT/CUIL: 20-35976005-2
N.° de operación de Mercado Pago
189550450163
Mago, tu asistente
Hacé pagos y
transferencias por
mensaje o audio
Transferí $ 3.00
para Alejandra
Enviado!`;
    expect(parseMercadoPagoReceipt(img)).toEqual({
      amount: 37800,
      merchant: "Martin Acuña",
      date: "2026-11-19",
      time: "22:21",
      operationId: "189550450163",
    });
  });

  it("devuelve null si el texto no es un comprobante", () => {
    expect(parseMercadoPagoReceipt("")).toBeNull();
    expect(parseMercadoPagoReceipt("hola que tal")).toBeNull();
  });

  it("arma la nota con el n.° de operación", () => {
    expect(receiptNote("189432148401")).toBe("Mercado Pago · Op. 189432148401");
  });
});
