"use client";

import { Play, Pause } from "lucide-react";
import { useAutoplay } from "./autoplay-context";
import { Button } from "@/components/ui/button";

export const AutoplayToggle = () => {
  const { isAutoplayEnabled, toggleAutoplay } = useAutoplay();

  return (
    <Button
      onClick={toggleAutoplay}
      variant="outline"
      size="sm"
      className="mr-2"
      title={
        isAutoplayEnabled
          ? "Dezactivează redarea automată a videoclipurilor între capitole"
          : "Activează redarea automată a videoclipurilor între capitole"
      }
    >
      {isAutoplayEnabled ? (
        <Pause className="h-4 w-4 mr-2" />
      ) : (
        <Play className="h-4 w-4 mr-2" />
      )}
      Autoplay: {isAutoplayEnabled ? "Pornit" : "Oprit"}
    </Button>
  );
};
