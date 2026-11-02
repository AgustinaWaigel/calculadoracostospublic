import { PaidSection } from "@/components/billing/paid-section";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PaidSection path="/ventas" title="Ventas">
      {children}
    </PaidSection>
  );
}
