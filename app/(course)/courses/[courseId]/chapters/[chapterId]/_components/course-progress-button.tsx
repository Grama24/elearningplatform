"use client";

import { Button } from "@/components/ui/button";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import axios from "axios";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCertificateModal } from "@/hooks/use-certificate-modal";
import Link from "next/link";
import { CourseCompleteButton } from "@/app/(course)/courses/[courseId]/_components/course-complete-button";
import { useAuth } from "@clerk/nextjs";

interface CourseProgressButtonProps {
  chapterId: string;
  courseId: string;
  nextChapterId?: string;
  isCompleted?: boolean;
  isLastChapter?: boolean;
  courseProgress?: number;
}

export const CourseProgressButton = ({
  chapterId,
  courseId,
  nextChapterId,
  isCompleted,
  isLastChapter,
  courseProgress = 0,
}: CourseProgressButtonProps) => {
  const router = useRouter();
  const confetti = useConfettiStore();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [updatedProgress, setUpdatedProgress] = useState(courseProgress);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const certificateModal = useCertificateModal();

  // Verificăm dacă există un certificat pentru acest curs
  useEffect(() => {
    const checkCertificate = async () => {
      if (
        !userId ||
        !isLastChapter ||
        !isCompleted ||
        updatedProgress !== 100
      ) {
        return;
      }

      try {
        // Verificăm certificatul în baza de date locală
        const response = await fetch(
          `/api/certificates/local?courseId=${courseId}&userId=${userId}`
        );
        if (response.ok) {
          setHasCertificate(true);
        }
      } catch (error) {
        console.error("Error checking certificate status:", error);
      }
    };

    checkCertificate();
  }, [courseId, isLastChapter, isCompleted, updatedProgress, userId]);

  const onClick = async () => {
    try {
      setIsLoading(true);

      await axios.put(
        `/api/courses/${courseId}/chapters/${chapterId}/progress`,
        {
          isCompleted: !isCompleted,
        }
      );

      // Obținem progresul actualizat după marcarea capitolului ca completat
      const response = await axios.get(`/api/courses/${courseId}/progress`);
      const progress = response.data.progress;
      setUpdatedProgress(progress);

      toast.success("Progress updated");
      router.refresh();

      if (!isCompleted && nextChapterId) {
        router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
      }

      if (!isCompleted && isLastChapter && progress === 100) {
        confetti.onOpen();
        setIsGeneratingCertificate(true);
        setShowCertificate(true);

        // Simulăm generarea certificatului
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsGeneratingCertificate(false);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = isCompleted ? CheckCircle : XCircle;

  // Verificăm dacă acest capitol este ultimul și dacă este completat
  const showCompleteButton =
    isLastChapter && isCompleted && updatedProgress === 100;

  return (
    <div className="flex items-center gap-x-2">
      <Button
        onClick={onClick}
        disabled={isLoading}
        type="button"
        variant={isCompleted ? "outline" : "success"}
        className="w-full md:w-auto"
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {isCompleted ? "Nu este completat" : "Marchează ca finalizat"}
        <Icon className="h-4 w-4 ml-2" />
      </Button>

      {showCompleteButton && (
        <CourseCompleteButton
          courseId={courseId}
          isCompleted={hasCertificate}
          variant="success"
        />
      )}

      <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {isGeneratingCertificate
                ? "Se generează certificatul..."
                : "Felicitări! 🎉"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isGeneratingCertificate ? (
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>Te rugăm să aștepți...</p>
                </div>
              ) : (
                "Ai terminat cu succes cursul! Poți vedea certificatul tău în secțiunea de certificate."
              )}
            </DialogDescription>
          </DialogHeader>
          {!isGeneratingCertificate && (
            <DialogFooter className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setShowCertificate(false);
                  certificateModal.onOpen();
                }}
                className="w-full"
              >
                Vezi certificatul
              </Button>
              <Button
                onClick={() => setShowCertificate(false)}
                variant="outline"
                className="w-full"
              >
                Închide
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
