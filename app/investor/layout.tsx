import InvestorSidebar from "@/components/layout/investor-sidebar";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 flex-shrink-0">
        <InvestorSidebar className="w-full h-full" />
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}