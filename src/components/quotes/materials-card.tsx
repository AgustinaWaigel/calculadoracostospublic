import Link from "next/link";
import { PackageIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { formatNumber, sum } from "@/lib/money";
import type { MaterialRow } from "@/server/quote-summary";

/** Materiales que hay que tener para uno o varios pedidos. La merma se prende con ?merma=1. */
export function MaterialsCard({
  title,
  materials,
  withWaste,
  basePath,
  empty,
}: {
  title: string;
  materials: MaterialRow[];
  withWaste: boolean;
  basePath: string;
  empty: string;
}) {
  const total = sum(materials.map((m) => m.cost));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="size-4" /> {title}
        </CardTitle>
        <CardDescription>
          {withWaste ? "Incluye la merma de cada producto." : "Según la receta de cada producto, sin la merma."}
        </CardDescription>
        <CardAction>
          <Link
            href={withWaste ? basePath : `${basePath}?merma=1`}
            scroll={false}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            {withWaste ? "Sin merma" : "Sumar merma"}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Usás</TableHead>
                <TableHead className="text-right">Paquetes</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(m.needed)} {m.usageUnit}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {m.packs} {m.purchaseUnit}
                    <span className="block text-xs">de {formatNumber(m.packQuantity)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={m.cost} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">
                  Total en materiales
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <Money value={total.toString()} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
