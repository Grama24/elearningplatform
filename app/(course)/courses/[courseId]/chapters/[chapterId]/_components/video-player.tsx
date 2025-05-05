"use client";

import axios from "axios";
import MuxPlayer from "@mux/mux-player-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Loader2, Lock, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { useAutoplay } from "../../../_components/autoplay-context";

interface VideoPlayerProps {
  playbackId: string;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  isLocked: boolean;
  completeOnEnd: boolean;
  title: string;
}

export const VideoPlayer = ({
  playbackId,
  courseId,
  chapterId,
  nextChapterId,
  isLocked,
  completeOnEnd,
  title,
}: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const router = useRouter();
  const confetti = useConfettiStore();
  const { isAutoplayEnabled } = useAutoplay();

  const onEnd = async () => {
    try {
      if (completeOnEnd) {
        await axios.put(
          `/api/courses/${courseId}/chapters/${chapterId}/progress`,
          {
            isCompleted: true,
          }
        );

        if (!nextChapterId) {
          confetti.onOpen();
        }

        toast.success("Progress updated");
        router.refresh();

        if (nextChapterId && isAutoplayEnabled) {
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
        }
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const isPlaybackIdValid = playbackId && playbackId.trim() !== "";

  return (
    <div className="relative aspect-video">
      {!isReady && !isLocked && isPlaybackIdValid && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      )}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
          <Lock className="h-8 w-8" />
          <p className="text-sm">This chapter is locked!</p>
        </div>
      )}
      {!isLocked && !isPlaybackIdValid && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">Video is currently unavailable</p>
        </div>
      )}
      {!isLocked && hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">
            Something went wrong while loading the video
          </p>
        </div>
      )}
      {!isLocked && isPlaybackIdValid && (
        <MuxPlayer
          title={title}
          className={cn(!isReady && "hidden")}
          onCanPlay={() => setIsReady(true)}
          onError={() => setHasError(true)}
          onEnded={onEnd}
          autoPlay={isAutoplayEnabled}
          playbackId={playbackId}
        />
      )}
    </div>
  );
};
