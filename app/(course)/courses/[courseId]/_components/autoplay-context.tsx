"use client";

import { createContext, useContext, useState, useEffect } from "react";

type AutoplayContextType = {
  isAutoplayEnabled: boolean;
  toggleAutoplay: () => void;
};

const AutoplayContext = createContext<AutoplayContextType>({
  isAutoplayEnabled: false,
  toggleAutoplay: () => {},
});

export const useAutoplay = () => useContext(AutoplayContext);

export const AutoplayProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Inițializăm starea din localStorage dacă există, altfel default la false
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState<boolean>(false);

  // Încărcăm preferința salvată când componenta este montată
  useEffect(() => {
    const savedPreference = localStorage.getItem("courseAutoplay");
    setIsAutoplayEnabled(savedPreference === "true");
  }, []);

  // Actualizăm localStorage când se schimbă preferința
  useEffect(() => {
    localStorage.setItem("courseAutoplay", isAutoplayEnabled.toString());
  }, [isAutoplayEnabled]);

  const toggleAutoplay = () => {
    setIsAutoplayEnabled((prev) => !prev);
  };

  return (
    <AutoplayContext.Provider value={{ isAutoplayEnabled, toggleAutoplay }}>
      {children}
    </AutoplayContext.Provider>
  );
};
