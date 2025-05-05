"use client";

import { useEffect, useRef } from "react";
import { useCertificateModal } from "@/hooks/use-certificate-modal";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { useRouter } from "next/navigation";

interface CourseCompletionHandlerProps {
  courseId: string;
  progressPercentage: number;
}

export const CourseCompletionHandler = ({
  courseId,
  progressPercentage,
}: CourseCompletionHandlerProps) => {
  const router = useRouter();
  const certificateModal = useCertificateModal();
  const confetti = useConfettiStore();
  const hasShownModal = useRef(false);

  useEffect(() => {
    // Verificăm dacă modalul a fost deja afișat pentru a preveni bucla infinită
    if (progressPercentage === 100 && !hasShownModal.current) {
      // Marcăm modalul ca fiind deja afișat
      hasShownModal.current = true;

      // Afișăm confetti
      confetti.onOpen();

      // Afișăm modalul de certificat
      certificateModal.onOpen();

      // Nu mai facem refresh pentru a evita bucla infinită
      // router.refresh();
    }
  }, [progressPercentage, confetti, certificateModal, router]);

  return null;
};
