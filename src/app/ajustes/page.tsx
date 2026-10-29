import { PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/ui-bits";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { BusinessForm } from "@/components/settings/business-form";
import { ChannelDialog } from "@/components/settings/channel-dialog";
import { VolumeTiersForm } from "@/components/settings/volume-tiers-form";
import { BackupCard } from "@/components/settings/backup-card";
import { deleteChannel } from "@/actions/settings";
import { userDb } from "@/lib/db";
import { getBusiness } from "@/server/costing";
import { formatMoney, formatPercent, toInputString } from "@/lib/money";
import { CHANNEL_LABELS } from "@/lib/schemas";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const db = await userDb();
  const [business, channels, tiers] = await Promise.all([
    getBusiness(),
    db.salesChannel.findMany({ orderBy: { sortOrder: "asc" } }),
    db.volumeTier.findMany({ orderBy: { minQuantity: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-6">
        <BusinessForm
          defaults={{
            name: business.name,
            logoUrl: business.logoUrl,
            phone: business.phone ?? "",
            email: business.email ?? "",
            instagram: business.instagram ?? "",
            address: business.address ?? "",
            taxCondition: business.taxCondition,
            ivaPercent: toInputString(business.ivaPercent),
            monthlyUnitsEstimate: business.monthlyUnitsEstimate,
            defaultMarginPercent: toInputString(business.defaultMarginPercent),
            pricingMode: business.pricingMode,
            roundTo: toInputString(business.roundTo),
            quoteValidityDays: business.quoteValidityDays }}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card id="canales" className="gap-0 self-start py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Canales de venta</CardTitle>
            </CardHeader>
            <ul className="divide-y">
              {channels.map((c) => {
                const parts = [
                  !c.commissionPercent.isZero() && `comisión ${formatPercent(c.commissionPercent)}`,
                  !c.paymentFeePercent.isZero() && `pasarela ${formatPercent(c.paymentFeePercent)}`,
                  !c.installmentsPercent.isZero() && `cuotas ${formatPercent(c.installmentsPercent)}`,
                  !c.fixedFee.isZero() && `fijo ${formatMoney(c.fixedFee, "ARS", 0)}`,
                  !c.shippingCost.isZero() && `envío ${formatMoney(c.shippingCost, "ARS", 0)}`,
                  !c.priceAdjustPercent.isZero() && `ajuste ${formatPercent(c.priceAdjustPercent)}`,
                ].filter(Boolean);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                        {c.name}
                        <Badge variant="secondary">{CHANNEL_LABELS[c.type]}</Badge>
                        {!c.active && <Badge variant="outline">Inactivo</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{parts.length ? parts.join(" · ") : "Sin costos extra"}</p>
                    </div>
                    <ChannelDialog
                      channel={{
                        id: c.id,
                        name: c.name,
                        type: c.type,
                        commissionPercent: c.commissionPercent.toString(),
                        fixedFee: c.fixedFee.toString(),
                        shippingCost: c.shippingCost.toString(),
                        paymentFeePercent: c.paymentFeePercent.toString(),
                        installmentsPercent: c.installmentsPercent.toString(),
                        priceAdjustPercent: c.priceAdjustPercent.toString(),
                        applyIva: c.applyIva,
                        active: c.active }}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <ConfirmDelete title={`¿Eliminar “${c.name}”?`} onConfirm={deleteChannel.bind(null, c.id)} />
                  </li>
                );
              })}
            </ul>
            <div className="border-t p-3">
              <ChannelDialog
                trigger={
                  <Button variant="secondary" size="sm">
                    <PlusIcon /> Agregar canal
                  </Button>
                }
              />
            </div>
          </Card>
          <VolumeTiersForm
            tiers={tiers.map((t) => ({ minQuantity: t.minQuantity, discountPercent: t.discountPercent.toString() }))}
          />
        </div>

        <BackupCard />
      </div>
    </>
  );
}
