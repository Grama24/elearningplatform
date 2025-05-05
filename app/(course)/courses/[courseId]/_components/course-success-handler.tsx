"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CourseSuccessHandlerProps {
  courseId: string;
}

export const CourseSuccessHandler = ({
  courseId,
}: CourseSuccessHandlerProps) => {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const verifyPurchase = async () => {
      try {
        setIsProcessing(true);
        // Încearcă să creeze/verifice achiziția
        await axios.post(`/api/courses/${courseId}/check-purchase`);

        // Afișăm un mesaj de succes
        toast.success("Felicitări! Cursul a fost deblocat!");

        // Reîncarcă pagina pentru a actualiza starea
        router.refresh();
      } catch (error: any) {
        console.error("Failed to verify purchase:", error);

        // Dacă avem un răspuns de la server, folosim mesajul său
        if (error.response) {
          // Eroare cu răspuns de la server (400, 500, etc)
          toast.error(
            `Eroare: ${
              error.response.data || "Verifică consola pentru detalii"
            }`
          );
        } else if (error.request) {
          // Cererea a fost făcută dar nu s-a primit răspuns
          toast.error(
            "Nu s-a putut contacta serverul. Verifică conexiunea la internet."
          );
        } else {
          // Altă eroare
          toast.error(
            "A apărut o eroare la procesarea plății. Te rugăm să contactezi suportul."
          );
        }
      } finally {
        setIsProcessing(false);
      }
    };

    if (isProcessing) {
      verifyPurchase();
    }
  }, [courseId, router, isProcessing]);

  // Componenta nu afișează nimic
  return null;
};
