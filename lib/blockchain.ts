import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS || '';
const CONTRACT_ABI = [
  "function issueCertificate(string courseId, string userId) public",
  "function getCertificate(string courseId, string userId) public view returns (tuple(string courseId, string userId, uint256 timestamp, bool exists))"
];

// Tipuri de rezultate pentru emiterea certificatelor
interface CertificateIssuanceResult {
  success: boolean;
  txHash?: string;
  confirmed?: boolean;
  error?: string;
  errorMessage?: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;

  constructor() {
    if (!process.env.SEPOLIA_RPC_URL) {
      throw new Error('SEPOLIA_RPC_URL is not defined in environment variables');
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY is not defined in environment variables');
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS is not defined in environment variables');
    }

    // Verificăm dacă cheia privată începe cu 0x
    const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
      ? process.env.PRIVATE_KEY 
      : `0x${process.env.PRIVATE_KEY}`;

    try {
      this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
    } catch (error) {
      console.error('Error initializing blockchain service:', error);
      throw error;
    }
  }

  async issueCertificate(courseId: string, userId: string): Promise<boolean | CertificateIssuanceResult> {
    try {
      // Obținem adresa walletului
      const walletAddress = await this.wallet.getAddress();
      
      // Verificăm balanța înainte de a încerca tranzacția
      const balance = await this.provider.getBalance(walletAddress);
      console.log(`Current wallet balance: ${ethers.formatEther(balance)} ETH`);
      
      // Verificăm mai întâi dacă certificatul există deja
      const existingCert = await this.getCertificate(courseId, userId);
      if (existingCert?.exists) {
        console.log("Certificate already exists, no need to issue a new one");
        return true;
      }
      
      // Estimăm gas-ul necesar pentru tranzacție
      const gasEstimate = await this.contract.issueCertificate.estimateGas(courseId, userId);
      console.log(`Estimated gas: ${gasEstimate}`);
      
      // Obținem prețul gas-ului din rețea și-l reducem cu 30% (în loc de 20%)
      const gasPrice = await this.provider.getFeeData();
      const adjustedGasPrice = gasPrice.gasPrice ? 
        (gasPrice.gasPrice * BigInt(70)) / BigInt(100) : 
        undefined;
      
      console.log(`Gas price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} gwei`);
      console.log(`Adjusted gas price: ${adjustedGasPrice ? ethers.formatUnits(adjustedGasPrice, 'gwei') : 'N/A'} gwei`);
      
      // Calculăm costul estimat al tranzacției și adăugăm o marjă de siguranță mai mică
      const gasBuffer = (gasEstimate * BigInt(5)) / BigInt(100); // 5% buffer în loc de 10%
      const estimatedGas = gasEstimate + gasBuffer;
      const estimatedCost = estimatedGas * (adjustedGasPrice || gasPrice.gasPrice || BigInt(0));
      console.log(`Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
      
      // Verificăm dacă avem fonduri suficiente, cu o marjă de 5%
      if (balance < estimatedCost) {
        console.error(`Insufficient funds: have ${ethers.formatEther(balance)} ETH, need ${ethers.formatEther(estimatedCost)} ETH`);
        
        // Returnăm un rezultat specific pentru fonduri insuficiente
        return {
          success: false,
          error: "INSUFFICIENT_FUNDS",
          errorMessage: `Insufficient funds for transaction. Have: ${ethers.formatEther(balance)} ETH, Need: ${ethers.formatEther(estimatedCost)} ETH`
        };
      }

      // Trimitem tranzacția cu parametri optimizați
      const tx = await this.contract.issueCertificate(courseId, userId, {
        gasLimit: estimatedGas,
        gasPrice: adjustedGasPrice, // Folosim prețul redus
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      
      // Returnăm rezultatul cu hash-ul tranzacției fără a aștepta confirmarea
      return {
        success: true,
        txHash: tx.hash,
        confirmed: false
      };
      
      /* 
      // În loc să așteptăm confirmarea, lăsăm UI-ul să facă polling
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
      
      return {
        success: true,
        txHash: tx.hash,
        confirmed: true
      };
      */
    } catch (error: any) {
      console.error('Error issuing certificate:', error);
      
      // Verificăm dacă eroarea este legată de fonduri insuficiente
      if (error.message && error.message.includes("insufficient funds")) {
        return {
          success: false,
          error: "INSUFFICIENT_FUNDS",
          errorMessage: error.message
        };
      }
      
      // Returnăm un obiect cu informații despre eroare
      return {
        success: false,
        error: error.message || String(error)
      };
    }
  }

  async getCertificate(courseId: string, userId: string) {
    try {
      console.log("Getting certificate from blockchain for:", { courseId, userId });
      const certificate = await this.contract.getCertificate(courseId, userId);
      console.log("Raw blockchain certificate response:", certificate);
      
      // Verificăm dacă avem un răspuns valid
      if (!certificate || (typeof certificate === 'object' && Object.keys(certificate).length === 0)) {
        console.log("Invalid or empty certificate response");
        return null;
      }
      
      // Verificăm dacă certificatul există și are toate câmpurile necesare
      const exists = certificate.exists === true;
      if (!exists || !certificate.courseId || !certificate.userId || !certificate.timestamp) {
        console.log("Certificate exists check failed:", {
          exists,
          hasFields: {
            courseId: !!certificate.courseId,
            userId: !!certificate.userId,
            timestamp: !!certificate.timestamp
          }
        });
        return {
          courseId,
          userId,
          timestamp: new Date(),
          exists: false
        };
      }
      
      const result = {
        courseId: certificate.courseId,
        userId: certificate.userId,
        timestamp: new Date(Number(certificate.timestamp) * 1000),
        exists: true
      };
      
      console.log("Processed certificate result:", result);
      return result;
    } catch (error) {
      console.error('Error getting certificate:', error);
      return null;
    }
  }
} 