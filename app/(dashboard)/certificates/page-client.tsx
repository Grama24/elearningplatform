"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarIcon,
  BookOpenIcon,
  GraduationCapIcon,
  CheckCircleIcon,
  UserIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
} from "lucide-react";

// Importăm ABI-ul direct aici pentru a evita problemele cu fs
const CERTIFICATE_ABI = [
  "function getCertificatesByOwner(string memory userId) public view returns (tuple(string courseId, string userId, uint256 timestamp, bool exists)[] memory)",
  "function getCertificate(string memory courseId, string memory userId) public view returns (tuple(string courseId, string userId, uint256 timestamp, bool exists))",
  "function issueCertificate(string memory courseId, string memory userId) public",
];

const CERTIFICATE_CONTRACT_ADDRESS =
  "0x665f60d20B7ad409F04AEaC85A1e6DEC6A242439";
const SEPOLIA_RPC_URL =
  "https://sepolia.infura.io/v3/e85d8dc1b2ed4ec79641e3f99c5fb128";
const PRIVATE_KEY =
  "0xa67b422761789befa84625e2b62b39d720989745267708ba0b1b6dd703360780";

// Funcție ajutătoare pentru serializarea valorilor BigInt
const stringifyWithBigInt = (obj: any) => {
  return JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
};

// Interfața pentru detaliile cursului
interface CourseDetails {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  categoryName?: string;
  teacherId?: string;
  teacherName?: string;
}

// Definim o interfață pentru un certificat
interface Certificate {
  courseId: string;
  userId: string;
  timestamp: number;
  exists: boolean;
  source?: string;
  blockchainTx?: string;
  pending?: boolean;
  txStatus?:
    | "pending"
    | "confirmed"
    | "failed"
    | "insufficient_gas"
    | "not_started";
  txError?: string;
}

export default function CertificatesClientPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const highlightCourseId = searchParams.get("highlight");

  const [certificates, setCertificates] = useState<any[]>([]);
  const [coursesDetails, setCoursesDetails] = useState<
    Record<string, CourseDetails>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>("");
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [verifyingCertificate, setVerifyingCertificate] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const fetchCertificates = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      setDebug("Started fetching certificates...");

      // Obținem certificatele din API
      const response = await fetch(`/api/certificates/user/${userId}`);
      if (!response.ok) {
        throw new Error(`Error fetching certificates: ${response.status}`);
      }

      const certificates = await response.json();
      console.log("Fetched certificates:", certificates);

      // Verificăm statusul tranzacțiilor pentru certificatele cu blockchainTx
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const updatedCertificates = await Promise.all(
        certificates.map(async (cert: any) => {
          if (cert.blockchainTx) {
            try {
              const txReceipt = await provider.getTransactionReceipt(
                cert.blockchainTx
              );
              console.log(
                `Transaction receipt for ${cert.blockchainTx}:`,
                txReceipt
              );

              if (txReceipt) {
                const newStatus =
                  txReceipt.status === 1 ? "confirmed" : "failed";
                if (newStatus !== cert.txStatus) {
                  // Actualizăm statusul în baza de date
                  await fetch("/api/certificates/update-status", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      courseId: cert.courseId,
                      userId: cert.userId,
                      blockchainTx: cert.blockchainTx,
                      txStatus: newStatus,
                      pending: false,
                    }),
                  });

                  return {
                    ...cert,
                    txStatus: newStatus,
                    pending: false,
                  };
                }
              }
            } catch (error) {
              console.error(
                `Error checking transaction ${cert.blockchainTx}:`,
                error
              );
            }
          }
          return cert;
        })
      );

      // Procesăm certificatele pentru a include toate informațiile necesare
      const processedCertificates = updatedCertificates.map((cert: any) => {
        // Asigurăm consistența între blockchainTx și txStatus
        let txStatus = "not_started";
        let pending = false;

        if (cert.blockchainTx) {
          txStatus = cert.txStatus || "pending";
          pending = cert.pending || false;
        } else {
          // Dacă nu există blockchainTx, resetăm și celelalte câmpuri legate de blockchain
          txStatus = "not_started";
          pending = false;
        }

        console.log("Processing certificate:", {
          courseId: cert.courseId,
          originalStatus: cert.txStatus,
          originalTx: cert.blockchainTx,
          newStatus: txStatus,
          pending: pending,
        });

        return {
          ...cert,
          blockchainTx: cert.blockchainTx || null,
          txStatus,
          pending,
          timestamp: new Date(cert.issuedAt).getTime() / 1000,
        };
      });

      setCertificates(processedCertificates);

      // Obținem detaliile cursurilor
      if (processedCertificates.length > 0) {
        await fetchCoursesDetails(processedCertificates);
      }
    } catch (err) {
      console.error("Error fetching certificates:", err);
      setError(`Nu s-au putut încărca certificatele: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Funcție pentru obținerea detaliilor cursurilor
  const fetchCoursesDetails = async (certs: any[]) => {
    try {
      const courseIds = certs
        .map((cert) => cert.courseId)
        .filter((id) => id !== "testCourse");

      if (courseIds.length === 0) return;

      // Obținem detaliile pentru fiecare curs
      const coursesData: Record<string, CourseDetails> = {};

      for (const courseId of courseIds) {
        try {
          // Folosim API-ul nou pentru a obține detaliile cursului
          const response = await axios.get(`/api/courses/${courseId}`);
          const courseData = response.data;

          coursesData[courseId] = {
            id: courseData.id,
            title: courseData.title,
            description: courseData.description || "Descriere indisponibilă",
            imageUrl: courseData.imageUrl || "/placeholder.png",
            categoryName: courseData.category?.name,
            teacherId: courseData.userId,
            teacherName: courseData.teacher?.name || "Profesor",
          };
        } catch (error) {
          console.warn(`Couldn't fetch details for course ${courseId}:`, error);

          // Folosim date generice dacă nu putem obține detaliile reale
          coursesData[courseId] = {
            id: courseId,
            title: `Curs ${courseId}`,
            description: "Informații indisponibile momentan",
            imageUrl: "/placeholder.png",
            teacherId: "unknown",
            teacherName: "Profesor",
          };
        }
      }

      setCoursesDetails(coursesData);
    } catch (error) {
      console.error("Error fetching course details:", error);
    }
  };

  const issueTestCertificate = async () => {
    if (!userId) return;

    try {
      setIssuingCertificate(true);
      setDebug((prev) => prev + "\n\nEmitere certificat de test...");

      // Inițializăm provider-ul
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

      // Verificăm soldul pentru debugging
      const wallet = new ethers.Wallet(PRIVATE_KEY);
      const walletAddress = wallet.address;
      const balance = await provider.getBalance(walletAddress);
      setDebug(
        (prev) =>
          prev + `\nSold curent portofel: ${ethers.formatEther(balance)} ETH`
      );

      // Pas 1: Creăm inițial un certificat local
      try {
        console.log("Creating initial local certificate...");
        const localResponse = await fetch("/api/certificates/store", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId: "testCourse",
            courseName: "Test Course",
            txStatus: "pending",
          }),
        });

        if (!localResponse.ok) {
          const errorText = await localResponse.text();
          console.error("Failed to store local certificate:", errorText);
          throw new Error(
            `Eroare la salvarea certificatului local: ${localResponse.status}`
          );
        }

        const localCertificate = await localResponse.json();
        console.log("Local certificate created:", localCertificate);

        setDebug((prev) => prev + "\nCertificat local creat");
      } catch (storeErr) {
        console.error("Error storing local certificate:", storeErr);
        setDebug(
          (prev) =>
            prev + `\nEroare la salvarea certificatului local: ${storeErr}`
        );
        throw storeErr;
      }

      // Pas 2: Încercăm emiterea pe blockchain
      try {
        // Creăm un signer cu cheia privată
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        console.log("Signer created with address:", signer.address);

        // Inițializăm contractul cu signer-ul
        const contract = new ethers.Contract(
          CERTIFICATE_CONTRACT_ADDRESS,
          CERTIFICATE_ABI,
          signer
        );
        console.log("Contract initialized at:", CERTIFICATE_CONTRACT_ADDRESS);

        // Estimăm gazul necesar
        const gasEstimate = await contract.issueCertificate.estimateGas(
          "testCourse",
          userId
        );
        console.log("Gas estimated:", gasEstimate.toString());

        // Obținem prețul gazului și calculăm parametrii EIP-1559
        const feeData = await provider.getFeeData();
        console.log("Fee data:", {
          maxFeePerGas: feeData.maxFeePerGas
            ? ethers.formatUnits(feeData.maxFeePerGas, "gwei")
            : "N/A",
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
            ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei")
            : "N/A",
        });

        // Calculăm valorile reduse pentru EIP-1559
        const reducedMaxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * BigInt(25)) / BigInt(100)
          : undefined;

        const reducedMaxPriorityFeePerGas = feeData.maxPriorityFeePerGas
          ? (feeData.maxPriorityFeePerGas * BigInt(25)) / BigInt(100)
          : undefined;

        console.log("Sending transaction with params:", {
          gasLimit: gasEstimate.toString(),
          maxFeePerGas: reducedMaxFeePerGas?.toString(),
          maxPriorityFeePerGas: reducedMaxPriorityFeePerGas?.toString(),
        });

        const tx = await contract.issueCertificate("testCourse", userId, {
          gasLimit: gasEstimate,
          maxFeePerGas: reducedMaxFeePerGas,
          maxPriorityFeePerGas: reducedMaxPriorityFeePerGas,
        });

        console.log("Transaction sent:", tx);
        console.log("Transaction hash:", tx.hash);
        setDebug((prev) => prev + `\nTranzacție trimisă: ${tx.hash}`);

        // Actualizăm imediat hash-ul tranzacției în baza de date
        console.log("Updating transaction hash in database:", {
          courseId: "testCourse",
          userId,
          blockchainTx: tx.hash,
          txStatus: "pending",
        });

        const updateResponse = await fetch("/api/certificates/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId: "testCourse",
            userId,
            blockchainTx: tx.hash,
            txStatus: "pending",
          }),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(
            "Failed to update transaction hash in database:",
            errorText
          );
        } else {
          const updatedCert = await updateResponse.json();
          console.log("Certificate updated with hash:", updatedCert);
        }

        // Așteptăm confirmarea tranzacției
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);

        if (receipt.status === 1) {
          // Tranzacția a fost confirmată cu succes
          console.log("Transaction confirmed successfully");
          const confirmUpdateResponse = await fetch(
            "/api/certificates/update-status",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                courseId: "testCourse",
                userId,
                blockchainTx: tx.hash,
                txStatus: "confirmed",
                confirmed: true,
              }),
            }
          );

          if (!confirmUpdateResponse.ok) {
            console.error(
              "Failed to update confirmation status:",
              await confirmUpdateResponse.text()
            );
          } else {
            console.log(
              "Confirmation status updated:",
              await confirmUpdateResponse.json()
            );
          }
        }

        // Deschidem modalul certificatului după generare
        const newCertificate = {
          courseId: "testCourse",
          userId: userId,
          timestamp: Math.floor(Date.now() / 1000),
          exists: true,
          source: "local",
          blockchainTx: tx.hash,
          pending: true,
          txStatus: "pending",
          courseDetails: {
            id: "testCourse",
            title: "Test Course",
            description: "Certificat de test",
            imageUrl: "/placeholder.png",
            teacherName: "Sistem",
          },
        };

        // Setăm certificatul selectat înainte de a reîncărca lista
        setSelectedCertificate(newCertificate);
        console.log("Setting selected certificate with tx hash:", tx.hash);

        // Reîncărcăm certificatele pentru a reflecta starea actualizată
        await fetchCertificates();

        // Informăm utilizatorul că procesul blockchain este în curs
        setDebug(
          (prev) =>
            prev + `\nCertificat creat și tranzacție blockchain inițiată!`
        );
      } catch (txError) {
        // Gestionarea erorilor blockchain
        let errorStatus = "failed";
        let errorMessage = String(txError);

        setDebug((prev) => prev + `\nEroare blockchain: ${txError}`);

        if (errorMessage.includes("insufficient funds")) {
          errorStatus = "insufficient_gas";
          errorMessage = `Fonduri insuficiente în portofel (${wallet.address}). Pentru a realiza emisiile de certificate pe blockchain, vă rugăm să obțineți ETH de la un faucet Sepolia.`;
        }

        // Actualizăm starea certificatului local cu informații despre eroare
        await fetch("/api/certificates/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId: "testCourse",
            userId,
            txStatus: errorStatus,
            txError: errorMessage.substring(0, 500),
          }),
        });

        // Indicăm că certificatul este disponibil local, chiar dacă blockchain a eșuat
        setDebug(
          (prev) =>
            prev +
            `\nCertificat creat local, dar tranzacția blockchain a eșuat: ${errorMessage}`
        );

        // Reîncărcăm certificatele pentru a vedea starea actualizată
        await fetchCertificates();
      }
    } catch (err) {
      console.error("Eroare în procesul de emitere a certificatului:", err);
      setDebug((prev) => prev + `\nEroare generală: ${err}`);
      setError(
        `Nu s-a putut finaliza procesul de emitere a certificatului: ${err}`
      );
    } finally {
      setIssuingCertificate(false);
    }
  };

  const verifyCertificate = async (certificate: any) => {
    try {
      setVerifyingCertificate(true);
      setVerificationResult(null);

      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(
        CERTIFICATE_CONTRACT_ADDRESS,
        CERTIFICATE_ABI,
        provider
      );

      const result = await contract.getCertificate(
        certificate.courseId,
        certificate.userId
      );

      if (result.exists) {
        setVerificationResult({
          isValid: true,
          message: "Certificatul a fost verificat cu succes pe blockchain!",
        });
      } else {
        setVerificationResult({
          isValid: false,
          message: "Certificatul nu a fost găsit pe blockchain.",
        });
      }
    } catch (error) {
      setVerificationResult({
        isValid: false,
        message: `Eroare la verificare: ${error}`,
      });
    } finally {
      setVerifyingCertificate(false);
    }
  };

  // Adăugăm verificarea statusului tranzacțiilor în așteptare
  const checkPendingTransactions = async () => {
    try {
      // Debug pentru a verifica câte certificate sunt în așteptare
      const pendingCertificates = certificates.filter(
        (cert) => cert.pending === true && cert.blockchainTx
      );
      setDebug(
        (prev) =>
          prev + `\nChecking ${pendingCertificates.length} pending certificates`
      );

      if (pendingCertificates.length === 0) return;

      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

      for (const cert of pendingCertificates) {
        try {
          setDebug(
            (prev) => prev + `\nChecking transaction: ${cert.blockchainTx}`
          );
          const txReceipt = await provider.getTransactionReceipt(
            cert.blockchainTx!
          );

          // Obținem tranzacția completă pentru a verifica detalii despre gas
          const transaction = await provider.getTransaction(cert.blockchainTx!);

          if (txReceipt && txReceipt.status === 1) {
            // Tranzacția a fost confirmată cu succes
            setDebug(
              (prev) =>
                prev +
                `\nTransaction ${cert.blockchainTx} confirmed successfully`
            );

            // Actualizăm certificatul în baza de date locală pentru a marca că nu mai este în așteptare
            try {
              await fetch(`/api/certificates/update-status`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  courseId: cert.courseId,
                  userId: cert.userId,
                  confirmed: true,
                  txStatus: "confirmed",
                  txError: null,
                }),
              });
            } catch (updateErr) {
              console.error("Error updating certificate status:", updateErr);
            }

            // Reîmprospătăm lista de certificate pentru a reflecta noua stare
            fetchCertificates();
            return;
          } else if (txReceipt && txReceipt.status === 0) {
            // Tranzacția a eșuat
            setDebug(
              (prev) => prev + `\nTransaction ${cert.blockchainTx} failed`
            );

            // Verificăm dacă a eșuat din cauza gazului insuficient
            let txStatus = "failed";
            let txError = "Tranzacția a eșuat pe blockchain";

            if (transaction && transaction.gasLimit && txReceipt.gasUsed) {
              if (
                txReceipt.gasUsed.toString() === transaction.gasLimit.toString()
              ) {
                txStatus = "insufficient_gas";
                txError = "Tranzacția a eșuat din cauza gazului insuficient";
              }
            }

            // Actualizăm statusul în baza de date
            try {
              await fetch(`/api/certificates/update-status`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  courseId: cert.courseId,
                  userId: cert.userId,
                  confirmed: false,
                  txStatus,
                  txError,
                }),
              });
            } catch (updateErr) {
              console.error("Error updating certificate status:", updateErr);
            }

            // Reîmprospătăm lista de certificate
            fetchCertificates();
          } else {
            // Tranzacția este încă în așteptare
            setDebug(
              (prev) =>
                prev + `\nTransaction ${cert.blockchainTx} still pending`
            );
          }
        } catch (err) {
          console.error(
            `Error checking transaction ${cert.blockchainTx}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error("Error checking pending transactions:", err);
    }
  };

  // Adăugăm o funcție pentru a corecta statusul în baza de date
  const correctCertificateStatus = async (cert: any) => {
    try {
      console.log("Correcting certificate status for:", cert.courseId);

      // Determinăm statusul corect
      let txStatus = "not_started";
      let pending = false;

      if (cert.blockchainTx) {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const txReceipt = await provider.getTransactionReceipt(
          cert.blockchainTx
        );

        if (txReceipt) {
          txStatus = txReceipt.status === 1 ? "confirmed" : "failed";
          pending = false;
        } else {
          txStatus = "pending";
          pending = true;
        }
      }

      // Actualizăm în baza de date doar dacă statusul este diferit
      if (txStatus !== cert.txStatus || pending !== cert.pending) {
        console.log("Updating certificate status in database:", {
          courseId: cert.courseId,
          oldStatus: cert.txStatus,
          newStatus: txStatus,
          oldPending: cert.pending,
          newPending: pending,
        });

        await fetch("/api/certificates/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId: cert.courseId,
            userId: cert.userId,
            blockchainTx: cert.blockchainTx,
            txStatus,
            pending,
          }),
        });
      }
    } catch (error) {
      console.error("Error correcting certificate status:", error);
    }
  };

  // Adăugăm un efect pentru a corecta statusurile incorecte
  useEffect(() => {
    if (certificates.length > 0) {
      certificates.forEach((cert) => {
        // Verificăm dacă certificatul are un status inconsistent
        if (
          (!cert.blockchainTx && cert.txStatus !== "not_started") ||
          (!cert.blockchainTx && cert.pending === true)
        ) {
          correctCertificateStatus(cert);
        }
      });
    }
  }, [certificates]);

  useEffect(() => {
    fetchCertificates();

    // Configurăm o verificare periodică a certificatelor și tranzacțiilor în așteptare
    const intervalId = setInterval(() => {
      fetchCertificates();
      checkPendingTransactions();
    }, 30000); // Verificăm la fiecare 30 de secunde

    return () => {
      clearInterval(intervalId);
    };
  }, [userId]);

  // Efect pentru a evidenția certificatul specificat în URL
  useEffect(() => {
    if (highlightCourseId && certificates.length > 0) {
      const certificate = certificates.find(
        (cert) => cert.courseId === highlightCourseId
      );
      if (certificate) {
        console.log("Found certificate to highlight:", certificate);
        const courseDetails = coursesDetails[certificate.courseId];

        // Creăm un obiect complet pentru certificatul selectat
        const selectedCert = {
          ...certificate,
          courseDetails,
          blockchainTx: certificate.blockchainTx || null,
          txStatus: certificate.txStatus || "pending",
          pending: certificate.pending || true,
        };

        console.log("Setting selected certificate with:", selectedCert);
        setSelectedCertificate(selectedCert);
      }
    }
  }, [highlightCourseId, certificates, coursesDetails]);

  // Adăugăm un nou efect pentru a verifica și actualiza statusul certificatului selectat
  useEffect(() => {
    const checkSelectedCertificateStatus = async () => {
      if (selectedCertificate?.blockchainTx) {
        try {
          const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
          const txReceipt = await provider.getTransactionReceipt(
            selectedCertificate.blockchainTx
          );

          if (txReceipt) {
            const newStatus = txReceipt.status === 1 ? "confirmed" : "failed";
            console.log("Transaction receipt found:", {
              txHash: selectedCertificate.blockchainTx,
              newStatus,
              receipt: txReceipt,
            });

            if (newStatus !== selectedCertificate.txStatus) {
              console.log("Updating certificate status:", {
                courseId: selectedCertificate.courseId,
                userId,
                blockchainTx: selectedCertificate.blockchainTx,
                txStatus: newStatus,
                pending: false,
              });

              // Actualizăm și în baza de date
              const updateResponse = await fetch(
                "/api/certificates/update-status",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    courseId: selectedCertificate.courseId,
                    userId,
                    blockchainTx: selectedCertificate.blockchainTx,
                    txStatus: newStatus,
                    pending: false,
                  }),
                }
              );

              console.log("Status update response:", {
                status: updateResponse.status,
                ok: updateResponse.ok,
                data: await updateResponse.json().catch(() => null),
              });
            }
          }
        } catch (error) {
          console.error("Error checking transaction status:", error);
        }
      }
    };

    if (selectedCertificate?.blockchainTx) {
      checkSelectedCertificateStatus();
      const intervalId = setInterval(checkSelectedCertificateStatus, 10000);
      return () => clearInterval(intervalId);
    }
  }, [selectedCertificate?.blockchainTx, userId]);

  // Efect pentru a verifica certificatele cu blockchainTx
  useEffect(() => {
    if (certificates.length > 0) {
      console.log("Checking certificates with blockchainTx:");
      certificates.forEach((cert) => {
        if (cert.blockchainTx) {
          console.log("Certificate with tx:", {
            courseId: cert.courseId,
            blockchainTx: cert.blockchainTx,
            txStatus: cert.txStatus,
          });
        }
      });
    }
  }, [certificates]);

  // Adăugăm useEffect pentru a actualiza informațiile blockchain
  useEffect(() => {
    const fetchBlockchainInfo = async (courseId: string, userId: string) => {
      try {
        console.log("Fetching blockchain info for:", { courseId, userId });
        const response = await fetch(
          `/api/certificates/local?courseId=${courseId}&userId=${userId}`
        );
        if (!response.ok) {
          throw new Error(
            `Error fetching certificate info: ${response.status}`
          );
        }
        const data = await response.json();
        console.log("Received certificate data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching blockchain info:", error);
        return null;
      }
    };

    if (selectedCertificate?.courseId && selectedCertificate?.userId) {
      fetchBlockchainInfo(
        selectedCertificate.courseId,
        selectedCertificate.userId
      )
        .then((data) => {
          if (data) {
            setSelectedCertificate((prev: Certificate | null) => {
              if (!prev) return null;
              return {
                ...prev,
                blockchainTx: data.blockchainTx,
                txStatus: data.txStatus || "pending",
                pending: data.pending,
              };
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching blockchain info:", error);
        });
    }
  }, [selectedCertificate?.courseId, selectedCertificate?.userId]);

  const openCertificateModal = async (cert: any) => {
    console.log("Opening certificate with details:", cert);
    console.log("Current blockchain info:", {
      blockchainTx: cert.blockchainTx,
      txStatus: cert.txStatus,
      pending: cert.pending,
    });

    try {
      // Verificăm mai întâi dacă certificatul există pe blockchain
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(
        CERTIFICATE_CONTRACT_ADDRESS,
        CERTIFICATE_ABI,
        provider
      );

      console.log("Checking certificate on blockchain for:", {
        courseId: cert.courseId,
        userId: cert.userId,
      });

      const blockchainCert = await contract.getCertificate(
        cert.courseId,
        cert.userId
      );
      console.log("Blockchain certificate response:", blockchainCert);

      const existsOnBlockchain = blockchainCert && blockchainCert.exists;
      console.log("Exists on blockchain:", existsOnBlockchain);

      // Facem un fetch pentru a obține detaliile actualizate ale certificatului
      const response = await fetch(
        `/api/certificates/local?courseId=${cert.courseId}&userId=${cert.userId}`
      );
      const updatedCert = await response.json();

      console.log("Received updated certificate from API:", updatedCert);

      // Determinăm statusul corect
      let txStatus;
      if (existsOnBlockchain) {
        txStatus = "confirmed";
        console.log(
          "Certificate exists on blockchain, setting status to confirmed"
        );
      } else if (updatedCert.blockchainTx) {
        // Verificăm statusul tranzacției
        const txReceipt = await provider.getTransactionReceipt(
          updatedCert.blockchainTx
        );
        console.log("Transaction receipt:", txReceipt);

        if (txReceipt) {
          if (txReceipt.status === 1) {
            txStatus = "confirmed";
            console.log("Transaction confirmed successfully");
          } else {
            txStatus = "failed";
            console.log("Transaction failed");
          }
        } else {
          txStatus = updatedCert.txStatus || "pending";
          console.log("Transaction still pending or status unknown");
        }
      } else {
        txStatus = "not_started";
        console.log("Certificate not yet on blockchain");
      }

      console.log("Final status determination:", {
        existsOnBlockchain,
        updatedCertTxHash: updatedCert.blockchainTx,
        decidedStatus: txStatus,
        txReceipt: txStatus !== "not_started" ? "checked" : "not_applicable",
      });

      if (updatedCert) {
        const mergedCertificate = {
          ...cert,
          courseDetails: cert.courseDetails,
          blockchainTx: updatedCert.blockchainTx,
          txStatus: txStatus,
          existsOnBlockchain: existsOnBlockchain,
          pending:
            !existsOnBlockchain && updatedCert.blockchainTx
              ? updatedCert.pending || false
              : false,
          txError: updatedCert.txError,
        };

        console.log(
          "Setting selected certificate with merged data:",
          mergedCertificate
        );
        setSelectedCertificate(mergedCertificate);
      } else {
        console.log("No updated certificate received, using original:", cert);
        setSelectedCertificate({
          ...cert,
          txStatus: txStatus,
          existsOnBlockchain: existsOnBlockchain,
          pending:
            !existsOnBlockchain && cert.blockchainTx
              ? cert.pending || false
              : false,
        });
      }
    } catch (error) {
      console.error("Error checking certificate:", error);
      console.log("Using original certificate data due to error:", cert);
      setSelectedCertificate({
        ...cert,
        txStatus: cert.blockchainTx
          ? cert.txStatus || "pending"
          : "not_started",
        pending: cert.blockchainTx ? cert.pending || false : false,
      });
    }
  };

  if (!userId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">My certificates</h1>
        <div className="border rounded-lg p-4">
          <p className="text-gray-500">
            Vă rugăm să vă autentificați pentru a vedea certificatele
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My certificates</h1>
      {loading ? (
        <div className="flex justify-center">
          <p>Se încarcă certificatele...</p>
        </div>
      ) : error ? (
        <div className="border rounded-lg p-4">
          <p className="text-red-500">
            Eroare la încărcarea certificatelor. Vă rugăm să încercați mai
            târziu.
          </p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <pre className="text-xs bg-gray-100 p-2 mt-2 rounded max-h-60 overflow-auto">
            {debug}
          </pre>
        </div>
      ) : certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert, index) => {
            const courseDetails = coursesDetails[cert.courseId] || {
              title: cert.courseId,
              description: "Informații indisponibile",
              imageUrl: "/placeholder.png",
              teacherName: "Profesor",
            };

            return (
              <div
                key={index}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-video relative bg-gray-100">
                  {courseDetails.imageUrl && (
                    <Image
                      src={courseDetails.imageUrl}
                      alt={courseDetails.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {courseDetails.title || cert.courseId}
                  </h3>
                  {courseDetails.categoryName && (
                    <div className="flex items-center text-sm text-blue-500 mt-1">
                      <BookOpenIcon className="h-3 w-3 mr-1" />
                      <span>{courseDetails.categoryName}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>
                      Emis la:{" "}
                      {new Date(cert.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span>{courseDetails.teacherName}</span>
                  </div>

                  {/* Afișăm ID-ul tranzacției blockchain dacă există */}
                  {cert.blockchainTx && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Transaction ID:</p>
                      <div className="flex items-center">
                        <p className="text-xs font-mono overflow-hidden text-ellipsis w-28">
                          {cert.blockchainTx.substring(0, 14)}...
                        </p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${cert.blockchainTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600"
                        >
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      </div>
                      {cert.txStatus === "pending" && (
                        <div className="flex items-center mt-1">
                          <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse mr-1"></div>
                          <span className="text-xs text-yellow-600">
                            În așteptare
                          </span>
                        </div>
                      )}
                      {cert.txStatus === "insufficient_gas" && (
                        <div className="flex items-center mt-1">
                          <div className="h-2 w-2 rounded-full bg-red-400 mr-1"></div>
                          <span className="text-xs text-red-600">
                            Gas insuficient
                          </span>
                        </div>
                      )}
                      {cert.txStatus === "failed" && (
                        <div className="flex items-center mt-1">
                          <div className="h-2 w-2 rounded-full bg-red-400 mr-1"></div>
                          <span className="text-xs text-red-600">Eșuat</span>
                        </div>
                      )}
                      {cert.txStatus === "confirmed" && (
                        <div className="flex items-center mt-1">
                          <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">
                            Confirmat
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => openCertificateModal(cert)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Vezi certificatul
                    </button>

                    {courseDetails.id && courseDetails.id !== "testCourse" && (
                      <Link
                        href={`/courses/${courseDetails.id}`}
                        className="flex items-center text-sm text-blue-600 hover:underline"
                      >
                        <span>Vezi cursul</span>
                        <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <p className="text-gray-500 mb-4">Nu aveți încă certificate</p>

          <Button
            onClick={issueTestCertificate}
            disabled={issuingCertificate}
            className="mb-4"
          >
            {issuingCertificate
              ? "Se emite certificatul de test..."
              : "Emite certificat de test"}
          </Button>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-blue-500">
              Arată informații de depanare
            </summary>
            <pre className="text-xs bg-gray-100 p-2 mt-2 rounded max-h-60 overflow-auto">
              {debug}
            </pre>
          </details>
        </div>
      )}

      {selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Certificat</h2>
              <button
                onClick={() => {
                  setSelectedCertificate(null);
                  setVerificationResult(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="border-2 border-gray-200 p-6 rounded-lg">
              {selectedCertificate.courseDetails?.imageUrl && (
                <div className="mb-6 flex justify-center">
                  <div className="relative h-40 w-full max-w-sm">
                    <Image
                      src={selectedCertificate.courseDetails.imageUrl}
                      alt={selectedCertificate.courseDetails.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">
                  {selectedCertificate.courseDetails?.title ||
                    selectedCertificate.courseId}
                </h3>
                <p className="text-gray-600">Certificat de participare</p>
                {selectedCertificate.courseDetails?.categoryName && (
                  <p className="text-sm text-blue-500 mt-1 inline-flex items-center justify-center">
                    <BookOpenIcon className="h-4 w-4 mr-1" />
                    {selectedCertificate.courseDetails.categoryName}
                  </p>
                )}
              </div>

              {selectedCertificate.courseDetails?.description && (
                <div className="mb-4 text-center">
                  <p className="text-gray-700">
                    {selectedCertificate.courseDetails.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Data emiterii</p>
                  <p className="font-medium">
                    {new Date(
                      selectedCertificate.timestamp * 1000
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ID Certificat</p>
                  <p className="font-medium">{`${selectedCertificate.courseId}-${selectedCertificate.userId}`}</p>
                </div>
              </div>

              {/* Informații blockchain */}
              <div className="mb-6">
                <p className="text-sm font-medium mb-2">
                  Informații Blockchain
                </p>
                {(() => {
                  console.log(
                    "Rendering blockchain info section. Certificate:",
                    selectedCertificate
                  );
                  return null;
                })()}

                {selectedCertificate.existsOnBlockchain ? (
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">
                      Certificat verificat pe blockchain
                    </span>
                  </div>
                ) : selectedCertificate.blockchainTx ? (
                  <>
                    <div className="flex items-center mb-2">
                      {selectedCertificate.txStatus === "pending" ? (
                        <>
                          <div className="h-4 w-4 rounded-full bg-yellow-400 animate-pulse mr-2"></div>
                          <span className="text-sm">
                            Certificat în curs de procesare pe blockchain. Hash
                            tranzacție: {selectedCertificate.blockchainTx}
                          </span>
                        </>
                      ) : selectedCertificate.txStatus ===
                        "insufficient_gas" ? (
                        <div className="h-4 w-4 rounded-full bg-red-400 mr-2"></div>
                      ) : selectedCertificate.txStatus === "failed" ? (
                        <div className="h-4 w-4 rounded-full bg-red-400 mr-2"></div>
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-gray-400 mr-2"></div>
                      )}
                      <span className="text-sm">
                        {selectedCertificate.txStatus === "pending"
                          ? "Tranzacția este în curs de procesare pe blockchain"
                          : selectedCertificate.txStatus === "insufficient_gas"
                          ? "Eroare: Gas insuficient pentru finalizarea tranzacției"
                          : selectedCertificate.txStatus === "failed"
                          ? "Eroare: Tranzacția a eșuat pe blockchain"
                          : "Status necunoscut"}
                      </span>
                    </div>

                    <div className="mb-2 text-sm">
                      <span className="text-gray-500">Hash Tranzacție:</span>
                      <div className="font-mono text-xs break-all mt-1">
                        {selectedCertificate.blockchainTx}
                      </div>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${selectedCertificate.blockchainTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs flex items-center mt-1"
                      >
                        <span>Vezi pe Etherscan</span>
                        <ExternalLinkIcon className="h-3 w-3 ml-1" />
                      </a>
                    </div>

                    {selectedCertificate.txError && (
                      <div className="mt-2 text-sm text-red-500">
                        <p>Eroare: {selectedCertificate.txError}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Se verifică statusul certificatului pe blockchain...
                  </p>
                )}
              </div>

              {selectedCertificate.courseDetails?.teacherName && (
                <div className="mb-6 text-center">
                  <p className="text-sm text-gray-500 mb-1">Emis de</p>
                  <p className="font-medium">
                    {selectedCertificate.courseDetails.teacherName}
                  </p>
                </div>
              )}

              <div className="text-center mt-6">
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => verifyCertificate(selectedCertificate)}
                    disabled={verifyingCertificate}
                    className="bg-blue-800 hover:bg-blue-900"
                  >
                    {verifyingCertificate
                      ? "Se verifică..."
                      : "Verifică pe Blockchain"}
                  </Button>

                  {selectedCertificate.courseDetails?.id &&
                    selectedCertificate.courseDetails?.id !== "testCourse" && (
                      <Link
                        href={`/courses/${selectedCertificate.courseDetails.id}`}
                      >
                        <Button variant="outline">Vezi cursul</Button>
                      </Link>
                    )}
                </div>
              </div>

              {/* Mesaj de verificare */}
              {verificationResult && verificationResult.isValid && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0 text-green-500" />
                    <div>
                      <p className="font-medium text-green-800">
                        Certificatul a fost verificat cu succes pe blockchain!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Adresa contractului:{" "}
                        <span className="font-mono break-all text-xs">
                          {CERTIFICATE_CONTRACT_ADDRESS}
                        </span>
                      </p>
                      <a
                        href={`https://sepolia.etherscan.io/address/${CERTIFICATE_CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center mt-1"
                      >
                        <span>Vezi pe Etherscan</span>
                        <ExternalLinkIcon className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {verificationResult && !verificationResult.isValid && (
                <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-red-800">{verificationResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
