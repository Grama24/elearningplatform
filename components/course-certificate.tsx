"use client";

import { useState, useEffect } from "react";
import { BlockchainService } from "@/lib/blockchain";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { format } from "date-fns";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { db } from "@/lib/db";
import { ethers } from "ethers";

interface CourseCertificateProps {
  courseId: string;
  userId: string;
  courseName: string;
}

// Interfață pentru rezultatul emiterii certificatului
interface IssuanceResult {
  success: boolean;
  txHash?: string;
  confirmed?: boolean;
  error?: string;
  errorMessage?: string;
}

export const CourseCertificate = ({
  courseId,
  userId,
  courseName,
}: CourseCertificateProps) => {
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Încercăm mai întâi să obținem certificatul din blockchain
      const blockchainService = new BlockchainService();
      let foundCertificate = false;

      try {
        const cert = await blockchainService.getCertificate(courseId, userId);

        if (cert?.exists) {
          setCertificate(cert);
          setIsPending(false);
          setTxHash(null);
          foundCertificate = true;
        }
      } catch (blockchainError) {
        console.error(
          "Error fetching certificate from blockchain:",
          blockchainError
        );
        // Continuăm cu încercarea de a găsi certificatul în baza de date locală
      }

      // Dacă nu am găsit certificatul în blockchain, verificăm în baza de date locală
      if (!foundCertificate) {
        try {
          const response = await fetch(
            `/api/certificates/local?courseId=${courseId}&userId=${userId}`
          );
          if (response.ok) {
            const localCert = await response.json();
            if (localCert && localCert.issuedAt) {
              // Am găsit un certificat local, îl folosim ca rezervă
              setCertificate({
                courseId: localCert.courseId,
                userId: localCert.userId,
                timestamp: new Date(localCert.issuedAt),
                exists: true,
              });

              // Verificăm dacă este în așteptare pe blockchain
              if (localCert.blockchainTx) {
                setTxHash(localCert.blockchainTx);
                setIsPending(true);

                // Verificăm statusul tranzacției
                checkTransactionStatus(localCert.blockchainTx);

                foundCertificate = true;
              } else {
                setIsPending(false);
                setTxHash(null);
                foundCertificate = true;
              }
            }
          }
        } catch (localError) {
          console.error(
            "Error fetching certificate from local DB:",
            localError
          );
        }
      }

      // Dacă am ajuns aici și nu am găsit certificatul nici în blockchain, nici în DB
      if (!foundCertificate) {
        setError(
          "Nu s-a putut încărca certificatul. Vă rugăm să verificați configurația blockchain."
        );
      }
    } catch (error: any) {
      console.error("General certificate error:", error);
      setError(
        "Nu s-a putut încărca certificatul. Vă rugăm să verificați configurația blockchain."
      );
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru verificarea statusului unei tranzacții
  const checkTransactionStatus = async (txHash: string) => {
    try {
      if (!txHash) return;

      console.log(`Checking transaction status for: ${txHash}`);
      const provider = new ethers.JsonRpcProvider(
        process.env.SEPOLIA_RPC_URL ||
          "https://sepolia.infura.io/v3/e85d8dc1b2ed4ec79641e3f99c5fb128"
      );
      const txReceipt = await provider.getTransactionReceipt(txHash);

      if (txReceipt) {
        if (txReceipt.status === 1) {
          // Tranzacție confirmată cu succes
          console.log("Transaction confirmed successfully");

          // Actualizăm statusul în baza de date
          try {
            await fetch(`/api/certificates/update-status`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                courseId,
                userId,
                confirmed: true,
              }),
            });
          } catch (updateErr) {
            console.error("Error updating certificate status:", updateErr);
          }

          // Reîncărcăm certificatul pentru a vedea noua stare din blockchain
          await fetchCertificate();
          setIsPending(false);
        } else if (txReceipt.status === 0) {
          // Tranzacție eșuată
          console.error("Transaction failed");
          setError(
            "Tranzacția blockchain a eșuat. Vă rugăm să încercați din nou."
          );
          setIsPending(false);
        }
      } else {
        // Tranzacția este încă în așteptare
        console.log("Transaction still pending");
      }
    } catch (error) {
      console.error("Error checking transaction status:", error);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [courseId, userId, lastRefresh]);

  // Efect pentru verificarea periodică a certificatului în starea de pending
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPending && txHash) {
      console.log(`Setting up interval for tx: ${txHash}`);
      // Verificăm imediat statusul
      checkTransactionStatus(txHash);

      // Apoi setăm intervalul pentru verificări periodice
      interval = setInterval(() => {
        console.log(`Checking tx in interval: ${txHash}`);
        checkTransactionStatus(txHash);
      }, 15000); // Verifică la fiecare 15 secunde
    }

    return () => {
      if (interval) {
        console.log("Clearing interval");
        clearInterval(interval);
      }
    };
  }, [isPending, txHash]);

  const handleGenerateCertificate = async () => {
    try {
      setIsIssuing(true);
      setError(null);
      setIsPending(false);
      setTxHash(null);

      const blockchainService = new BlockchainService();

      // Emitem certificatul și capturăm rezultatul
      const result = await blockchainService.issueCertificate(courseId, userId);

      // Stocăm informațiile despre certificat în baza de date locală
      // indiferent de rezultatul blockchain (pentru a avea un backup)
      try {
        // Obținem detaliile cursului din API
        const response = await fetch(`/api/courses/${courseId}`);
        if (response.ok) {
          const courseData = await response.json();

          // Determinăm hash-ul tranzacției blockchain dacă există
          let blockchainTx = null;
          if (typeof result === "object" && result.success && result.txHash) {
            blockchainTx = result.txHash;
          }

          // Salvăm certificatul în baza de date locală
          await fetch("/api/certificates/store", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              courseId,
              userId,
              courseName,
              categoryName: courseData.category?.name || null,
              blockchainTx,
            }),
          });

          // Dacă am întâmpinat o eroare cu blockchain dar am salvat local, arătăm un mesaj specific
          if (
            typeof result === "object" &&
            !result.success &&
            result.error === "INSUFFICIENT_FUNDS"
          ) {
            toast.success("Certificat generat și salvat local!");
            toast.error(
              "Nu s-a putut emite pe blockchain - fonduri insuficiente"
            );

            // Reîncărcăm certificatul din baza de date locală
            fetchCertificate();
            return;
          }
        }
      } catch (dbError) {
        console.error("Error storing certificate in local DB:", dbError);
      }

      // Verificăm tipul rezultatului
      if (typeof result === "object") {
        const issuanceResult = result as IssuanceResult;

        if (issuanceResult.success && issuanceResult.txHash) {
          // Dacă primim un hash de tranzacție și succes, atunci tranzacția este în așteptare
          setTxHash(issuanceResult.txHash);
          setIsPending(true);
          toast.success(
            "Certificatul este în curs de procesare pe blockchain!"
          );
        } else if (issuanceResult.error) {
          // Dacă avem o eroare în rezultat
          if (issuanceResult.error === "INSUFFICIENT_FUNDS") {
            // Eroare de fonduri insuficiente - deja gestionată mai sus
            return;
          }
          throw new Error(issuanceResult.errorMessage || issuanceResult.error);
        } else {
          // Caz necunoscut
          throw new Error("Rezultat necunoscut de la blockchain");
        }
      } else if (result === true) {
        // Dacă primim true, atunci certificatul a fost deja emis și confirmat
        toast.success("Certificat generat cu succes!");
        // Reîncărcăm certificatul
        fetchCertificate();
      } else {
        throw new Error("Nu s-a putut genera certificatul");
      }
    } catch (error: any) {
      console.error("Failed to issue certificate:", error);

      // Verificăm dacă eroarea este legată de fonduri insuficiente
      const errorMessage = error.message || String(error);
      if (errorMessage.includes("insufficient funds")) {
        setError(
          "Fonduri insuficiente în contul blockchain. Certificatul a fost salvat local."
        );
        toast.error(
          "Fonduri insuficiente pentru a emite certificatul pe blockchain"
        );
      } else {
        setError(
          "Nu s-a putut genera certificatul. Încercați din nou mai târziu."
        );
        toast.error("Eroare la generarea certificatului");
      }

      setIsPending(false);
      setTxHash(null);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRefresh = () => {
    setLastRefresh(Date.now());
    toast.success("Se reîncarcă informațiile certificatului...");
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Se încarcă certificatul...</span>
      </div>
    );
  }

  if (isPending && txHash) {
    return (
      <Card className="p-6 mt-4">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Certificat în procesare</h2>
          <p className="mb-4">
            Tranzacția a fost trimisă pe blockchain și este în curs de
            procesare. Acest lucru poate dura câteva minute.
          </p>
          <div className="bg-gray-100 p-3 rounded-md mb-4">
            <p className="text-xs mb-1 text-gray-500">Hash tranzacție:</p>
            <div className="flex items-center justify-center">
              <p className="text-xs font-mono break-all">{txHash}</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verifică statusul
            </Button>
            <Button
              onClick={() =>
                window.open(
                  `https://sepolia.etherscan.io/tx/${txHash}`,
                  "_blank"
                )
              }
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Vezi pe Etherscan
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 mt-4">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
          </div>
          <div className="text-red-500 mb-4">{error}</div>
          <div className="flex justify-center gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reîncarcă
            </Button>
            {txHash && (
              <Button
                onClick={() =>
                  window.open(
                    `https://sepolia.etherscan.io/tx/${txHash}`,
                    "_blank"
                  )
                }
                variant="link"
              >
                Vezi tranzacția
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (!certificate?.exists) {
    return (
      <Card className="p-6 mt-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Generează certificat</h2>
          <p className="mb-4">
            Felicitări pentru finalizarea cursului! Generează un certificat
            pentru a marca această realizare.
          </p>
          <Button
            onClick={handleGenerateCertificate}
            disabled={isIssuing}
            className="w-full"
          >
            {isIssuing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se generează...
              </>
            ) : (
              "Generează certificat"
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mt-4">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Certificat de Absolvire</h2>
        <p className="text-lg mb-2">
          Acest certificat confirmă că utilizatorul cu ID-ul {userId}
        </p>
        <p className="text-lg mb-4">
          a finalizat cu succes cursul &quot;{courseName}&quot;
        </p>
        <p className="text-sm text-muted-foreground">
          Data finalizării: {format(certificate.timestamp, "dd/MM/yyyy HH:mm")}
        </p>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Certificat verificat pe blockchain
        </p>

        {txHash && (
          <div className="mb-4 mt-2">
            <p className="text-sm text-muted-foreground">ID Tranzacție:</p>
            <div className="flex items-center justify-center mt-1">
              <p className="text-xs font-mono bg-gray-100 p-1 rounded overflow-hidden overflow-ellipsis max-w-xs">
                {txHash}
              </p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        <Link
          href="/certificates"
          className="inline-flex items-center text-blue-600 hover:underline"
        >
          <span>Vezi toate certificatele</span>
          <ExternalLink className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </Card>
  );
};
