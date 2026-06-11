import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoanForm } from "@/components/loans/loan-form";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { getGlobalExchangeRate } from "@/lib/exchange/server";

export const metadata = { title: "Nuevo préstamo" };

export default async function NewLoanPage() {
  const globalRate = await getGlobalExchangeRate();

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <Link
            href="/prestamos"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Nuevo préstamo</h1>
            <p className="text-sm text-muted-foreground">
              Elegí entre monto total dividido o cargar cada cuota a mano
            </p>
          </div>
        </div>
      </StickyPageHeader>

      <div className="rounded-2xl border border-border bg-card p-5">
        <LoanForm globalRate={globalRate?.rate ?? null} />
      </div>
    </div>
  );
}
