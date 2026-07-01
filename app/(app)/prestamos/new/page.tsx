import { LoanForm } from "@/components/loans/loan-form";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { BackButton } from "@/components/shared/back-button";
import { getGlobalExchangeRate } from "@/lib/exchange/server";

export const metadata = { title: "Nuevo préstamo" };

export default async function NewLoanPage() {
  const globalRate = await getGlobalExchangeRate();

  return (
    <div className="space-y-4">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <BackButton href="/prestamos" />
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
