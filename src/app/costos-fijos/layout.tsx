import { PaidSection } from "@/components/billing/paid-section";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PaidSection path="/costos-fijos" title="Costos fijos">
      {children}
    </PaidSection>
  );
}
