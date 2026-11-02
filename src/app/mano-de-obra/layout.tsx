import { PaidSection } from "@/components/billing/paid-section";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PaidSection path="/mano-de-obra" title="Mano de obra">
      {children}
    </PaidSection>
  );
}
