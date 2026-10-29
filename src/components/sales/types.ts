export interface SaleProductOption {
  id: string;
  name: string;
  /** Costo de hoy por unidad. */
  cost: string;
  /** Precio sugerido del canal de referencia (null si no se pudo calcular). */
  price: string | null;
  /** Precio sugerido por canal (id del canal → precio). */
  prices: Record<string, string>;
}

export interface SaleChannelOption {
  id: string;
  name: string;
  type: string;
  commissionPercent: string;
  paymentFeePercent: string;
  installmentsPercent: string;
  fixedFee: string;
  shippingCost: string;
  applyIva: boolean;
}

export interface SaleFormValues {
  id?: string;
  date: string;
  clientName: string | null;
  channelId: string | null;
  discountPercent: string;
  notes: string | null;
  items: {
    productId: string | null;
    description: string;
    quantity: string;
    unitPrice: string;
    unitCost: string;
  }[];
}
