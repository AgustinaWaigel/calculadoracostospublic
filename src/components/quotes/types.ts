export interface QuoteProductOption {
  id: string;
  name: string;
  /** Precio sugerido (canal de referencia) por unidad, sin descuento por volumen. */
  price: string;
  /** Costo de hoy por unidad, para la ganancia estimada mientras armás el presupuesto. */
  cost: string;
  /** Parte del costo que es tu mano de obra (te queda a vos). */
  ownLabor: string;
}

/** Lo necesario para estimar la ganancia en el editor (canal de venta directa). */
export interface QuoteProfitContext {
  vatRate: string;
  channel: {
    name: string;
    commissionPercent: string;
    paymentFeePercent: string;
    installmentsPercent: string;
    fixedFee: string;
    shippingCost: string;
  } | null;
}

export interface QuoteFormValues {
  id?: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  notes: string | null;
  validUntil: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  discountPercent: string;
  paidAmount: string;
  deliveryDate: string | null;
  /** Descuentos por cantidad de este presupuesto (no los de Ajustes). */
  volumeTiers: { minQuantity: string; discountPercent: string }[];
  items: { productId: string | null; description: string; quantity: string; unitPrice: string }[];
}
