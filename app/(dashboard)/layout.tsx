import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";

export const metadata = {
  title: "QuickLearn Dashboard",
  description: "Learn faster, learn better",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-[70px] md:pl-72 fixed inset-y-0 w-full z-50">
        <Navbar />
      </div>
      <div className="hidden md:flex h-full w-72 flex-col fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      <main className="md:pl-72 pt-[70px] min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
