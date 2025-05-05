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

// Hardcodăm valorile pentru a evita problemele cu variabilele de mediu în client
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

      // Încercăm mai întâi să obținem certificatele din blockchain
      let blockchainCertificates: Certificate[] = [];
      let blockchainError = null;

      try {
        // Inițializăm provider-ul cu URL-ul hardcodat
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        setDebug((prev) => prev + "\nProvider initialized");

        // Afișăm adresa contractului pentru debugging
        setDebug(
          (prev) => prev + `\nContract address: ${CERTIFICATE_CONTRACT_ADDRESS}`
        );

        // Inițializăm contractul cu adresa hardcodată
        const contract = new ethers.Contract(
          CERTIFICATE_CONTRACT_ADDRESS,
          CERTIFICATE_ABI,
          provider
        );
        setDebug((prev) => prev + "\nContract initialized");

        // Testăm conexiunea la blockchain
        try {
          const blockNumber = await provider.getBlockNumber();
          setDebug(
            (prev) => prev + `\nConnected to network, block: ${blockNumber}`
          );
        } catch (err) {
          setDebug((prev) => prev + `\nError connecting to network: ${err}`);
          throw new Error(`Nu s-a putut conecta la blockchain: ${err}`);
        }

        setDebug(
          (prev) => prev + `\nFetching certificates for user: ${userId}`
        );

        // Acum încercăm să obținem toate certificatele din blockchain
        const userCertificates = await contract.getCertificatesByOwner(userId);

        // Folosim funcția noastră personalizată pentru a serializa BigInt
        setDebug(
          (prev) =>
            prev +
            `\nCertificates received: ${stringifyWithBigInt(userCertificates)}`
        );

        // Formatăm certificatele pentru afișare
        blockchainCertificates = Array.isArray(userCertificates)
          ? userCertificates.map((cert: any) => ({
              courseId: cert.courseId,
              userId: cert.userId,
              timestamp:
                typeof cert.timestamp === "bigint"
                  ? Number(cert.timestamp)
                  : cert.timestamp,
              exists: cert.exists,
              source: "blockchain",
            }))
          : [];

        setDebug(
          (prev) =>
            prev +
            `\nFormatted blockchain certs: ${JSON.stringify(
              blockchainCertificates
            )}`
        );
      } catch (err) {
        console.error("Error fetching certificates from blockchain:", err);
        blockchainError = err;
        setDebug((prev) => prev + `\nBlockchain error: ${err}`);
      }

      // Acum încercăm să obținem certificatele din baza de date locală
      let localCertificates: any[] = [];
      try {
        // Folosim noul API pentru certificate locale
        const response = await fetch(`/api/certificates/user/${userId}`);
        if (response.ok) {
          localCertificates = await response.json();
          setDebug(
            (prev) =>
              prev +
              `\nLocal certificates loaded: ${JSON.stringify(
                localCertificates
              )}`
          );
        } else {
          throw new Error(
            `Eroare la încărcarea certificatelor locale: ${response.status}`
          );
        }
      } catch (err) {
        console.error("Error fetching certificates from local database:", err);
        setDebug((prev) => prev + `\nLocal database error: ${err}`);

        // Dacă avem și eroare de blockchain și eroare locală, afișăm eroarea
        if (blockchainError) {
          setError(`Nu s-au putut încărca certificatele: ${err}`);
          setLoading(false);
          return;
        }
      }

      // Combinăm certificatele din ambele surse, preferând pe cele din blockchain
      const combinedCertificates = [...blockchainCertificates];

      // Adăugăm certificatele din baza de date locală care nu există în blockchain
      for (const localCert of localCertificates) {
        const existsInBlockchain = blockchainCertificates.some(
          (bc) =>
            bc.courseId === localCert.courseId && bc.userId === localCert.userId
        );

        if (!existsInBlockchain) {
          const hasPendingTx = !!localCert.blockchainTx;
          combinedCertificates.push({
            courseId: localCert.courseId,
            userId: localCert.userId,
            timestamp: new Date(localCert.issuedAt).getTime() / 1000,
            exists: true,
            source: "local",
            blockchainTx: localCert.blockchainTx || null,
            pending: hasPendingTx, // Verificăm explicit dacă are tranzacție în așteptare
          });

          // Debug pentru a verifica starea certificatelor
          if (hasPendingTx) {
            setDebug(
              (prev) =>
                prev +
                `\nFound pending certificate: ${localCert.courseId} with tx: ${localCert.blockchainTx}`
            );
          }
        }
      }

      setDebug(
        (prev) =>
          prev +
          `\nCombined certificates: ${JSON.stringify(combinedCertificates)}`
      );

      setCertificates(combinedCertificates);

      // Obținem detaliile cursurilor pentru fiecare certificat
      if (combinedCertificates.length > 0) {
        await fetchCoursesDetails(combinedCertificates);
      }
    } catch (err) {
      console.error("Error fetching certificates:", err);
      setDebug((prev) => prev + `\nGeneral error: ${err}`);
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
      setDebug((prev) => prev + "\n\nIssuing test certificate...");

      // Inițializăm provider-ul
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

      // Creăm un signer cu cheia privată
      const signer = new ethers.Wallet(PRIVATE_KEY, provider);
      setDebug((prev) => prev + "\nSigner initialized");

      // Inițializăm contractul cu signer-ul
      const contract = new ethers.Contract(
        CERTIFICATE_CONTRACT_ADDRESS,
        CERTIFICATE_ABI,
        signer
      );
      setDebug((prev) => prev + "\nContract with signer initialized");

      // Emitem certificatul de test
      setDebug((prev) => prev + `\nIssuing certificate for user: ${userId}`);
      const tx = await contract.issueCertificate("testCourse", userId);
      setDebug((prev) => prev + `\nTransaction sent: ${tx.hash}`);

      // Așteptăm confirmarea tranzacției
      await tx.wait();
      setDebug((prev) => prev + "\nTransaction confirmed!");

      // Reîncărcăm certificatele
      await fetchCertificates();
    } catch (err) {
      console.error("Error issuing certificate:", err);
      setDebug((prev) => prev + `\nError issuing certificate: ${err}`);
      setError(`Couldn't issue certificate: ${err}`);
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
        const courseDetails = coursesDetails[certificate.courseId];
        setSelectedCertificate({ ...certificate, courseDetails });
      }
    }
  }, [highlightCourseId, certificates, coursesDetails]);

  if (!userId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Certificatele mele</h1>
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
      <h1 className="text-2xl font-bold mb-4">Certificatele mele</h1>
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
                    </div>
                  )}

                  {/* Statusul certificatului - Pending sau Confirmat */}
                  {cert.pending ? (
                    <div className="flex items-center mt-2">
                      <div className="h-4 w-4 rounded-full bg-yellow-400 animate-pulse mr-1"></div>
                      <span className="text-sm text-yellow-500">
                        În curs de procesare
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center mt-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-500">
                        Certificat verificat
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setSelectedCertificate({
                          ...cert,
                          courseDetails,
                          pending: cert.pending, // Asigurăm explicit transferul statusului pending
                          blockchainTx: cert.blockchainTx, // Asigurăm explicit transferul ID-ului tranzacției
                        })
                      }
                      className="text-sm text-blue-600 hover:underline"
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
              <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-medium mb-2">
                  Informații Blockchain
                </h4>

                {selectedCertificate.blockchainTx ? (
                  <>
                    <div className="mb-3">
                      <p className="text-sm text-gray-500">Transaction ID:</p>
                      <div className="flex items-center mt-1">
                        <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all max-w-full">
                          {selectedCertificate.blockchainTx}
                        </p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${selectedCertificate.blockchainTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600"
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {selectedCertificate.pending ? (
                        <>
                          <div className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse mr-2"></div>
                          <span className="text-sm text-yellow-600">
                            În curs de procesare pe blockchain
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-600">
                            Verificat și confirmat pe blockchain
                          </span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">Certificat verificat local</span>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  Contract verificare:{" "}
                  <a
                    href={`https://sepolia.etherscan.io/address/${CERTIFICATE_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {CERTIFICATE_CONTRACT_ADDRESS}
                  </a>
                </p>
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
                <div className="flex justify-center space-x-4 mb-4">
                  <Button
                    onClick={() => verifyCertificate(selectedCertificate)}
                    disabled={verifyingCertificate}
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
                        <Button variant="outline">
                          Vezi cursul
                          <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                </div>

                {/* Informații despre statusul certificatului */}
                {selectedCertificate.pending && (
                  <div className="p-4 rounded-lg bg-yellow-50 text-yellow-800 mb-4 flex items-center">
                    <div className="h-4 w-4 rounded-full bg-yellow-400 animate-pulse mr-2"></div>
                    <div>
                      <p className="font-medium">Certificat în așteptare</p>
                      <p className="text-sm">
                        Tranzacția pe blockchain este în curs de procesare
                      </p>
                      {selectedCertificate.blockchainTx && (
                        <div className="mt-2">
                          <p className="text-xs">Transaction ID:</p>
                          <div className="flex items-center">
                            <code className="text-xs bg-yellow-100 p-1 rounded break-all">
                              {selectedCertificate.blockchainTx}
                            </code>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${selectedCertificate.blockchainTx}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-yellow-700"
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedCertificate.pending &&
                  selectedCertificate.blockchainTx && (
                    <div className="p-4 rounded-lg bg-green-50 text-green-800 mb-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">
                          Certificat confirmat pe blockchain
                        </p>
                        <div className="mt-2">
                          <p className="text-xs">Transaction ID:</p>
                          <div className="flex items-center">
                            <code className="text-xs bg-green-100 p-1 rounded break-all">
                              {selectedCertificate.blockchainTx}
                            </code>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${selectedCertificate.blockchainTx}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-green-700"
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {verificationResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      verificationResult.isValid
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <p>{verificationResult.message}</p>
                    <p className="text-sm mt-2">
                      Adresa contractului: {CERTIFICATE_CONTRACT_ADDRESS}
                    </p>
                    <p className="text-sm mt-1">
                      <a
                        href={`https://sepolia.etherscan.io/address/${CERTIFICATE_CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center justify-center mt-2"
                      >
                        <span>Vezi pe Etherscan</span>
                        <ExternalLinkIcon className="h-3 w-3 ml-1" />
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
