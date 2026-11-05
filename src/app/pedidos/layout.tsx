import { PaidSection } from "@/components/billing/paid-section";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PaidSection path="/pedidos" title="Pedidos">
      {children}
    </PaidSection>
  );
}
