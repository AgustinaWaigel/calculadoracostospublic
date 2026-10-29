"use client";

import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { useAction } from "@/components/shared/use-action";
import { confirmSupplyPrice, deleteSupply } from "@/actions/supplies";

export function SupplyActions({ id, stale }: { id: string; stale: boolean }) {
  const router = useRouter();
  const confirm = useAction();

  return (
    <>
      {stale && (
        <Button
          variant="outline"
          disabled={confirm.pending}
          onClick={() => confirm.run(() => confirmSupplyPrice(id), () => router.refresh())}
        >
          <CheckIcon /> El precio sigue igual
        </Button>
      )}
      <ConfirmDelete
        title="¿Eliminar este insumo?"
        description="Se borra también su historial de precios. Si algún producto lo usa, no se puede eliminar."
        label="Eliminar"
        onConfirm={() => deleteSupply(id)}
        onDone={() => router.push("/insumos")}
      />
    </>
  );
}
