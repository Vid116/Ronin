import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting contract verification...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Please deploy contracts first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const mainAddress = deploymentInfo.contracts.RoninRumbleMain.address;
  const nftAddress = deploymentInfo.contracts.RoninRumbleNFT.address;
  const gameServer = deploymentInfo.contracts.RoninRumbleMain.gameServer;
  const nftBaseURI = process.env.NFT_BASE_URI || "https://api.roninrumble.com/metadata/";

  console.log("Verifying RoninRumbleMain at:", mainAddress);

  try {
    await run("verify:verify", {
      address: mainAddress,
      constructorArguments: [gameServer],
    });
    console.log("RoninRumbleMain verified successfully\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("RoninRumbleMain already verified\n");
    } else {
      console.error("Error verifying RoninRumbleMain:", error.message);
    }
  }

  console.log("Verifying RoninRumbleNFT at:", nftAddress);

  try {
    await run("verify:verify", {
      address: nftAddress,
      constructorArguments: [nftBaseURI],
    });
    console.log("RoninRumbleNFT verified successfully\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("RoninRumbleNFT already verified\n");
    } else {
      console.error("Error verifying RoninRumbleNFT:", error.message);
    }
  }

  console.log("Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
