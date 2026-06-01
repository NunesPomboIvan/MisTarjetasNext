import { BackButton } from "@/components/shared/back-button";
import { StickyPageHeader } from "@/components/shared/sticky-page-header";
import { SecurityClient } from "./security-client";

export const metadata = { title: "Privacidad y seguridad" };

export default function SecurityPage() {
  return (
    <div className="space-y-5">
      <StickyPageHeader>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-[24px] font-bold tracking-tight text-foreground">
            Privacidad y seguridad
          </h1>
        </div>
      </StickyPageHeader>
      <SecurityClient />
    </div>
  );
}
