import { ethers } from "hardhat";

async function main() {
  const Certificate = await ethers.getContractFactory("Certificate");
  const certificate = await Certificate.deploy();
  await certificate.waitForDeployment();

  console.log("Certificate contract deployed to:", await certificate.getAddress());

  // Adăugăm adresa contractului în .env
  const fs = require('fs');
  const envPath = '.env';
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const contractAddress = await certificate.getAddress();
  
  if (!envContent.includes('NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS')) {
    fs.appendFileSync(envPath, `\nNEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    const updatedEnv = envContent.replace(
      /NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS=${contractAddress}`
    );
    fs.writeFileSync(envPath, updatedEnv);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 