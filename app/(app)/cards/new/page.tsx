import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CardForm } from "@/components/cards/card-form";

export const metadata = { title: "Nueva tarjeta" };

export default function NewCardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/cards"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nueva tarjeta</h1>
          <p className="text-sm text-muted-foreground">Completá los datos de tu tarjeta</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <CardForm />
      </div>
    </div>
  );
}
