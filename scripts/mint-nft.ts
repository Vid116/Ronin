import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Minting test NFT card skins...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Please deploy contracts first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const nftAddress = deploymentInfo.contracts.RoninRumbleNFT.address;

  const [owner, player] = await ethers.getSigners();
  console.log("Minting as:", owner.address);
  console.log("Recipient:", player.address);
  console.log();

  const RoninRumbleNFT = await ethers.getContractFactory("RoninRumbleNFT");
  const nftContract = RoninRumbleNFT.attach(nftAddress);

  // Sample card skins to mint
  const cardSkins = [
    {
      name: "Dragon Warrior",
      cardType: "Warrior",
      rarity: 3, // LEGENDARY
      tokenURI: "dragon-warrior.json",
    },
    {
      name: "Phoenix Mage",
      cardType: "Mage",
      rarity: 2, // EPIC
      tokenURI: "phoenix-mage.json",
    },
    {
      name: "Shadow Archer",
      cardType: "Archer",
      rarity: 1, // RARE
      tokenURI: "shadow-archer.json",
    },
  ];

  console.log("Minting", cardSkins.length, "card skins...\n");

  for (let i = 0; i < cardSkins.length; i++) {
    const skin = cardSkins[i];
    console.log(`[${i + 1}/${cardSkins.length}] Minting ${skin.name}...`);

    const tx = await nftContract.mintCardSkin(
      player.address,
      skin.name,
      skin.cardType,
      skin.rarity,
      skin.tokenURI
    );

    const receipt = await tx.wait();

    // Find CardSkinMinted event
    const event = receipt?.logs.find(
      (log: any) => log.fragment && log.fragment.name === "CardSkinMinted"
    );

    if (event) {
      const tokenId = event.args[0];
      console.log("  Token ID:", tokenId.toString());
      console.log("  Rarity:", ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"][skin.rarity]);
      console.log("  Transaction:", receipt?.hash);
    }

    console.log();
  }

  // Get player's tokens
  const tokens = await nftContract.getTokensByOwner(player.address);
  console.log("Player now owns", tokens.length, "NFTs");

  // Display details
  console.log("\nNFT Details:");
  for (const tokenId of tokens) {
    const skin = await nftContract.getCardSkin(tokenId);
    console.log(`\nToken #${tokenId}:`);
    console.log("  Name:", skin.name);
    console.log("  Type:", skin.cardType);
    console.log("  Rarity:", ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"][skin.rarity]);
    console.log("  Equipped:", skin.isEquipped);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
