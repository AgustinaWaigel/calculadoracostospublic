"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  Loader2Icon,
  MessageCircleIcon,
  ReceiptIcon,
  ReceiptTextIcon,
  Share2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { useAction } from "@/components/shared/use-action";
import { deleteQuote, duplicateQuote, setQuoteStatus } from "@/actions/quotes";
import { QUOTE_STATUS_LABELS, productionStatuses, quoteStatuses } from "@/lib/schemas";
import { ProductionSelect } from "./production-select";

export function QuoteActions({
  id,
  status,
  production,
  hasPayment,
  fileName,
  whatsappHref,
}: {
  id: string;
  status: (typeof quoteStatuses)[number];
  production: (typeof productionStatuses)[number];
  /** Si ya pagó algo, se puede sacar el recibo. */
  hasPayment: boolean;
  /** Nombre del PDF del ticket al compartirlo. */
  fileName: string;
  whatsappHref: string;
}) {
  const router = useRouter();
  const statusAction = useAction();
  const duplicateAction = useAction();
  const [sharing, setSharing] = useState(false);
  const ticketUrl = `/api/presupuestos/${id}/pdf?ticket`;

  /** Manda el ticket como archivo (WhatsApp, mail…) desde el celu. Si el navegador no puede, lo descarga. */
  async function shareTicket() {
    setSharing(true);
    try {
      const res = await fetch(ticketUrl);
      if (!res.ok) throw new Error("No se pudo generar el ticket");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Este navegador no deja compartir archivos: te bajé el ticket para que lo mandes.");
      }
      if (status === "DRAFT") statusAction.run(() => setQuoteStatus(id, "SENT"), () => router.refresh());
    } catch (e) {
      // Cerrar el menú de compartir no es un error.
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error("No pudimos compartir el ticket.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <Select
        value={status}
        disabled={statusAction.pending}
        onValueChange={(v) => statusAction.run(() => setQuoteStatus(id, v), () => router.refresh())}
      >
        <SelectTrigger className="w-36" aria-label="Estado">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {quoteStatuses.map((s) => (
            <SelectItem key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status === "ACCEPTED" && <ProductionSelect id={id} value={production} />}
      <Button asChild variant="outline">
        <a href={`/api/presupuestos/${id}/pdf?ver`} target="_blank" rel="noreferrer">
          <EyeIcon /> Ver PDF
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={`${ticketUrl}&ver`} target="_blank" rel="noreferrer">
          <ReceiptTextIcon /> Ticket del pedido
        </a>
      </Button>
      <Button variant="outline" onClick={shareTicket} disabled={sharing}>
        {sharing ? <Loader2Icon className="animate-spin" /> : <Share2Icon />} Compartir ticket
      </Button>
      <Button asChild className="bg-[#25D366] text-white hover:bg-[#1ebe5b]">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            if (status === "DRAFT") statusAction.run(() => setQuoteStatus(id, "SENT"), () => router.refresh());
          }}
        >
          <MessageCircleIcon /> Enviar por WhatsApp
        </a>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Más opciones">
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/api/presupuestos/${id}/pdf`} download>
              <DownloadIcon /> Descargar PDF
            </a>
          </DropdownMenuItem>
          {hasPayment && (
            <DropdownMenuItem asChild>
              <a href={`/api/presupuestos/${id}/pdf?recibo&ver`} target="_blank" rel="noreferrer">
                <ReceiptIcon /> Recibo de pago
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={duplicateAction.pending}
            onClick={() => duplicateAction.run(() => duplicateQuote(id), (data) => router.push(`/presupuestos/${data.id}`))}
          >
            <CopyIcon /> Duplicar presupuesto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDelete
        title="¿Eliminar este presupuesto?"
        onConfirm={() => deleteQuote(id)}
        onDone={() => router.push("/presupuestos")}
      />
    </>
  );
}
