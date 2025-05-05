import { create } from "zustand";

interface CertificateModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useCertificateModal = create<CertificateModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
})); 