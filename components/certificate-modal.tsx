"use client";

import { useCertificateModal } from "@/hooks/use-certificate-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const CertificateModal = () => {
  const { isOpen, onClose } = useCertificateModal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Felicitări! 🎉</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground">
            Ai finalizat cu succes cursul! Poți vedea certificatul tău în
            secțiunea de certificări.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Închide
            </Button>
            <Button asChild>
              <Link href="/certificates">Vezi Certificatul</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
