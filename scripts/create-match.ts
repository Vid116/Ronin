import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Creating a test match...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Please deploy contracts first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const mainAddress = deploymentInfo.contracts.RoninRumbleMain.address;

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  const RoninRumbleMain = await ethers.getContractFactory("RoninRumbleMain");
  const mainContract = RoninRumbleMain.attach(mainAddress);

  // Get entry fee tiers
  const tier1 = await mainContract.TIER_1();
  const tier2 = await mainContract.TIER_2();
  const tier3 = await mainContract.TIER_3();

  console.log("Entry Fee Tiers:");
  console.log("- Tier 1:", ethers.formatEther(tier1), "RON");
  console.log("- Tier 2:", ethers.formatEther(tier2), "RON");
  console.log("- Tier 3:", ethers.formatEther(tier3), "RON");
  console.log();

  // Create a match with Tier 1 entry fee
  console.log("Creating match with Tier 1 entry fee...");

  const tx = await mainContract.createMatch(tier1);
  const receipt = await tx.wait();

  // Find MatchCreated event
  const event = receipt?.logs.find(
    (log: any) => log.fragment && log.fragment.name === "MatchCreated"
  );

  if (event) {
    const matchId = event.args[0];
    console.log("Match created successfully!");
    console.log("Match ID:", matchId.toString());
    console.log("Transaction hash:", receipt?.hash);
    console.log();

    // Get match details
    const match = await mainContract.getMatch(matchId);
    console.log("Match Details:");
    console.log("- Entry Fee:", ethers.formatEther(match.entryFee), "RON");
    console.log("- Prize Pool:", ethers.formatEther(match.prizePool), "RON");
    console.log("- Finalized:", match.finalized);
    console.log("- Players Joined:", match.players.filter((p: string) => p !== ethers.ZeroAddress).length, "/ 6");
  } else {
    console.log("Match created but event not found in receipt");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
