import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log("🚀 Deploying RoninRumble1v1 contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "RON\n");

  // Game server address (defaults to deployer if not specified)
  const gameServerAddress = process.env.GAME_SERVER_ADDRESS || deployer.address;
  console.log("Game server address:", gameServerAddress);

  // Deploy RoninRumble1v1
  console.log("\n📜 Deploying RoninRumble1v1...");
  const RoninRumble1v1 = await ethers.getContractFactory("RoninRumble1v1");
  const roninRumble1v1 = await RoninRumble1v1.deploy(gameServerAddress);
  await roninRumble1v1.waitForDeployment();

  const contractAddress = await roninRumble1v1.getAddress();
  console.log("✅ RoninRumble1v1 deployed to:", contractAddress);

  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contract: {
      RoninRumble1v1: {
        address: contractAddress,
        gameServer: gameServerAddress,
      }
    },
    entryFees: {
      tier1: "0.001 RON",
      tier2: "0.005 RON",
      tier3: "0.01 RON"
    },
    prizeDistribution: {
      platformFee: "8.3%",
      winner: "91.7%",
    }
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment1v1.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to deployment1v1.json");

  // Generate contract ABI
  const abiPath = path.join(__dirname, '..', 'contract-abis-1v1.json');
  const contractAbi = {
    RoninRumble1v1: {
      address: contractAddress,
      abi: JSON.parse(roninRumble1v1.interface.formatJson())
    }
  };
  fs.writeFileSync(abiPath, JSON.stringify(contractAbi, null, 2));
  console.log("💾 Contract ABI saved to contract-abis-1v1.json");

  // Contract summary
  console.log("\n📊 Deployment Summary:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Contract:", contractAddress);
  console.log("Game Server:", gameServerAddress);
  console.log("\nEntry Fee Tiers:");
  console.log("  Tier 1: 0.001 RON");
  console.log("  Tier 2: 0.005 RON");
  console.log("  Tier 3: 0.01 RON");
  console.log("\nPrize Distribution (1v1):");
  console.log("  Platform Fee: 8.3%");
  console.log("  Winner: 91.7% of prize pool");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("✨ Deployment complete!\n");
  console.log("Next steps:");
  console.log("1. Verify contract on explorer:");
  console.log(`   npx hardhat verify --network ${network.name} ${contractAddress} ${gameServerAddress}`);
  console.log("2. Update .env with new contract address:");
  console.log(`   NEXT_PUBLIC_RONIN_RUMBLE_1V1_ADDRESS=${contractAddress}`);
  console.log("3. Fund game server wallet with RON for gas");
  console.log("4. Test the 1v1 matches!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
