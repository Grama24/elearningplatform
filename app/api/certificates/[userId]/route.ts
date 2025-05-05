import { NextResponse } from "next/server";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

// Importăm direct fișierul JSON
const certificatePath = path.join(process.cwd(), "contracts", "Certificate.json");
const Certificate = JSON.parse(fs.readFileSync(certificatePath, "utf8"));

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  // Adăugăm header-uri CORS pentru a permite acces direct la API
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  console.log("API Request started for userId:", params.userId);
  
  try {
    console.log("Params userId:", params.userId);
    console.log("Contract address:", process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS);
    console.log("Sepolia RPC URL:", process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
    
    if (!params.userId) {
      console.log("Missing userId parameter");
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400, headers });
    }
    
    if (!process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS) {
      console.log("Missing contract address in environment variables");
      return NextResponse.json({ error: "Missing contract address in environment variables" }, { status: 500, headers });
    }
    
    if (!process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) {
      console.log("Missing Sepolia RPC URL in environment variables");
      return NextResponse.json({ error: "Missing Sepolia RPC URL in environment variables" }, { status: 500, headers });
    }
    
    console.log("Initializing provider...");
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
    
    // Verificăm conexiunea la provider
    try {
      console.log("Checking network connection...");
      const blockNumber = await provider.getBlockNumber();
      console.log("Connected to network, current block:", blockNumber);
    } catch (providerError) {
      console.error("Provider connection error:", providerError);
      return NextResponse.json({ error: "Failed to connect to Ethereum network: " + String(providerError) }, { status: 500, headers });
    }
    
    console.log("Initializing contract...");
    console.log("Contract ABI loaded:", !!Certificate.abi);
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS,
      Certificate.abi,
      provider
    );

    console.log("Attempting to call getCertificatesByOwner...");
    
    // Pentru testare, vom emite un certificat de test
    // Comentează acest bloc în producție
    try {
      // Obține un signer pentru a putea face tranzacții
      const privateKey = process.env.PRIVATE_KEY;
      if (privateKey) {
        console.log("Private key found, creating signer...");
        const signer = new ethers.Wallet(privateKey, provider);
        const contractWithSigner = contract.connect(signer);
        
        // Emite un certificat de test pentru userId
        console.log("Emitting test certificate...");
        try {
          // Verifică dacă certificatul există deja
          console.log("Checking if test certificate exists...");
          
          console.log("Contract methods:", Object.keys(contract.interface).join(', '));
          
          const existingCert = await contract.getCertificate("testCourse", params.userId);
          console.log("Existing certificate check result:", existingCert);
          
          if (!existingCert || !existingCert.exists) {
            console.log("Certificate does not exist, issuing new one...");
            // Folosim functia din contract
            const tx = await contractWithSigner.issueCertificate("testCourse", params.userId);
            await tx.wait();
            console.log("Test certificate issued:", tx.hash);
          } else {
            console.log("Test certificate already exists");
          }
        } catch (certError) {
          console.error("Error issuing test certificate:", certError);
        }
      } else {
        console.log("No private key found");
      }
    } catch (testError) {
      console.error("Error in test certificate issuance:", testError);
    }
    
    // Obținem toate certificatele pentru utilizatorul curent din blockchain
    console.log("Getting certificates for user:", params.userId);
    
    const certificates = await contract.getCertificatesByOwner(params.userId);
    
    console.log("Certificates received:", JSON.stringify(certificates, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    // Transformăm datele în format JSON-friendly
    const formattedCertificates = Array.isArray(certificates) 
      ? certificates.map((cert: any) => ({
          courseId: cert.courseId,
          userId: cert.userId,
          timestamp: Number(cert.timestamp),
          exists: cert.exists
        }))
      : [];
    
    console.log("Formatted certificates:", formattedCertificates);
    
    // Obținem detaliile suplimentare din baza de date locală
    const localCertificates = await db.certificate.findMany({
      where: {
        userId: params.userId
      },
      include: {
        course: {
          include: {
            category: true
          }
        }
      }
    });
    
    console.log("Local certificates found:", localCertificates.length);
    
    // Combinăm datele pentru a avea toate informațiile disponibile
    const enrichedCertificates = formattedCertificates.map(blockchainCert => {
      // Căutăm certificatul corespunzător în baza de date locală
      const localCert = localCertificates.find(
        lc => lc.courseId === blockchainCert.courseId && lc.userId === blockchainCert.userId
      );
      
      if (localCert) {
        // Combinăm informațiile dacă există în baza de date locală
        return {
          ...blockchainCert,
          courseName: localCert.courseName,
          categoryName: localCert.categoryName,
          courseDetails: {
            title: localCert.course.title,
            description: localCert.course.description,
            imageUrl: localCert.course.imageUrl,
            categoryName: localCert.course.category?.name,
            teacherId: localCert.course.userId
          }
        };
      }
      
      return blockchainCert;
    });
    
    return NextResponse.json(enrichedCertificates, { headers });
  } catch (error) {
    console.error("[CERTIFICATES_GET] Full error:", error);
    // Returnăm eroarea completă pentru debugging
    return NextResponse.json({ error: String(error) }, { status: 500, headers });
  }
} 