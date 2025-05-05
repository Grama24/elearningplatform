const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Certificate = await hre.ethers.getContractFactory("Certificate");
  const certificate = await Certificate.deploy();
  await certificate.waitForDeployment();

  const contractAddress = await certificate.getAddress();
  console.log("Certificate contract deployed to:", contractAddress);

  // Adăugăm adresa contractului în .env
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
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