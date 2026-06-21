import PastDueBanner from "@/components/PastDueBanner";

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PastDueBanner />
      {children}
    </>
  );
}
