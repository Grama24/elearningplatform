"use client";

import { useEffect, useRef } from "react";
import { useConfettiStore } from "@/hooks/use-confetti-store";

const ClientConfetti = () => {
  const confetti = useConfettiStore();
  const hasRun = useRef(false);

  useEffect(() => {
    // Verificăm dacă efectul a fost deja executat pentru a evita buclele infinite
    if (!hasRun.current) {
      // Marcăm că am executat efectul
      hasRun.current = true;

      // Declanșăm confetti
      confetti.onOpen();
    }

    // Nu mai folosim cleanup pentru a închide confetti
    // Lăsăm să fie închis de utilizator sau alt eveniment
  }, [confetti]);

  return null;
};

export default ClientConfetti;
