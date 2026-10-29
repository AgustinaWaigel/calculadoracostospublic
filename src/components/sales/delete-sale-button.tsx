"use client";

import { useRouter } from "next/navigation";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { deleteSale } from "@/actions/sales";

export function DeleteSaleButton({ id, fromQuote }: { id: string; fromQuote: boolean }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      title="¿Eliminar esta venta?"
      description={
        fromQuote
          ? "El presupuesto sigue como aceptado. Si lo pasás a otro estado y lo volvés a aceptar, se registra de nuevo."
          : undefined
      }
      label="Eliminar"
      onConfirm={() => deleteSale(id)}
      onDone={() => router.push("/ventas")}
    />
  );
}
