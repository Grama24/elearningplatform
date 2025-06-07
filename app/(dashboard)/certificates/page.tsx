import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Componenta client-side fără server-side rendering
const CertificatesClientPage = dynamic(() => import("./page-client"), {
  ssr: false,
  loading: () => <div className="p-6">Se încarcă certificatele...</div>,
});

// Componenta pentru erori de încărcare
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <div className="p-6">{children}</div>
    </div>
  );
};

const CertificatesPage = async () => {
  const { userId } = auth();

  if (!userId) {
    return redirect("/");
  }

  // Folosim Suspense și ErrorBoundary pentru a gestiona mai bine încărcarea și erorile
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Se încarcă...</div>}>
        <CertificatesClientPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default CertificatesPage;
