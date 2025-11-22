import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting deployment to Ronin Chain...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "RON\n");

  // Configuration
  const GAME_SERVER_ADDRESS = process.env.GAME_SERVER_ADDRESS || deployer.address;
  const NFT_BASE_URI = process.env.NFT_BASE_URI || "https://api.roninrumble.com/metadata/";

  console.log("Configuration:");
  console.log("- Game Server:", GAME_SERVER_ADDRESS);
  console.log("- NFT Base URI:", NFT_BASE_URI);
  console.log();

  // Deploy RoninRumbleMain
  console.log("Deploying RoninRumbleMain...");
  const RoninRumbleMain = await ethers.getContractFactory("RoninRumbleMain");
  const mainContract = await RoninRumbleMain.deploy(GAME_SERVER_ADDRESS);
  await mainContract.waitForDeployment();
  const mainAddress = await mainContract.getAddress();

  console.log("RoninRumbleMain deployed to:", mainAddress);
  console.log("Transaction hash:", mainContract.deploymentTransaction()?.hash);
  console.log();

  // Deploy RoninRumbleNFT
  console.log("Deploying RoninRumbleNFT...");
  const RoninRumbleNFT = await ethers.getContractFactory("RoninRumbleNFT");
  const nftContract = await RoninRumbleNFT.deploy(NFT_BASE_URI);
  await nftContract.waitForDeployment();
  const nftAddress = await nftContract.getAddress();

  console.log("RoninRumbleNFT deployed to:", nftAddress);
  console.log("Transaction hash:", nftContract.deploymentTransaction()?.hash);
  console.log();

  // Link NFT contract to Main contract
  console.log("Linking NFT contract to Main contract...");
  const setGameContractTx = await nftContract.setGameContract(mainAddress);
  await setGameContractTx.wait();
  console.log("NFT contract linked successfully");
  console.log();

  // Verify contract settings
  console.log("Verifying deployments...");
  const gameServer = await mainContract.gameServer();
  const nftGameContract = await nftContract.gameContract();

  console.log("Main contract game server:", gameServer);
  console.log("NFT contract game contract:", nftGameContract);
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      RoninRumbleMain: {
        address: mainAddress,
        transactionHash: mainContract.deploymentTransaction()?.hash,
        gameServer: gameServer,
      },
      RoninRumbleNFT: {
        address: nftAddress,
        transactionHash: nftContract.deploymentTransaction()?.hash,
        baseURI: NFT_BASE_URI,
        gameContract: nftGameContract,
      },
    },
    entryFees: {
      tier1: ethers.formatEther(await mainContract.TIER_1()) + " RON",
      tier2: ethers.formatEther(await mainContract.TIER_2()) + " RON",
      tier3: ethers.formatEther(await mainContract.TIER_3()) + " RON",
    },
    prizeDistribution: {
      platformFee: "8.3%",
      firstPlace: "72%",
      secondPlace: "18%",
      thirdPlace: "10%",
    },
  };

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment info saved to:", deploymentPath);
  console.log();

  // Generate contract ABIs
  console.log("Generating contract ABIs...");

  const mainABI = [
    "function createMatch(uint256 _entryFee) external returns (uint256)",
    "function joinMatch(uint256 _matchId) external payable",
    "function submitMatchResults(uint256 _matchId, address[6] calldata _players, uint8[6] calldata _placements) external",
    "function claimRewards() external",
    "function withdrawBalance() external",
    "function getMatch(uint256 _matchId) external view returns (uint256 entryFee, address[6] memory players, uint8[6] memory placements, bool finalized, uint256 prizePool, uint256 timestamp)",
    "function getPlayerBalance(address _player) external view returns (uint256)",
    "function isPlayerInMatch(uint256 _matchId, address _player) external view returns (bool)",
    "event MatchCreated(uint256 indexed matchId, uint256 entryFee, uint256 timestamp)",
    "event PlayerJoinedMatch(uint256 indexed matchId, address indexed player, uint256 entryFee)",
    "event MatchFinalized(uint256 indexed matchId, address[6] players, uint8[6] placements, uint256 prizePool)",
    "event RewardClaimed(address indexed player, uint256 amount)",
  ];

  const nftABI = [
    "function mintCardSkin(address to, string memory name, string memory cardType, uint8 rarity, string memory tokenURI) external returns (uint256)",
    "function equipSkin(uint256 tokenId) external",
    "function unequipSkin(string memory cardType) external",
    "function getEquippedSkin(address player, string memory cardType) external view returns (uint256)",
    "function getTokensByOwner(address owner) external view returns (uint256[] memory)",
    "function getCardSkin(uint256 tokenId) external view returns (string memory name, string memory cardType, uint8 rarity, uint256 mintedAt, bool isEquipped, address owner)",
    "event CardSkinMinted(uint256 indexed tokenId, address indexed to, string name, string cardType, uint8 rarity)",
    "event SkinEquipped(address indexed player, string cardType, uint256 indexed tokenId)",
    "event SkinUnequipped(address indexed player, string cardType, uint256 indexed tokenId)",
  ];

  const abiInfo = {
    RoninRumbleMain: {
      address: mainAddress,
      abi: mainABI,
    },
    RoninRumbleNFT: {
      address: nftAddress,
      abi: nftABI,
    },
  };

  const abiPath = path.join(__dirname, "..", "contract-abis.json");
  fs.writeFileSync(abiPath, JSON.stringify(abiInfo, null, 2));

  console.log("Contract ABIs saved to:", abiPath);
  console.log();

  // Deployment summary
  console.log("==================================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("==================================================");
  console.log("RoninRumbleMain:", mainAddress);
  console.log("RoninRumbleNFT:", nftAddress);
  console.log();
  console.log("Entry Fees:");
  console.log("- Tier 1:", ethers.formatEther(await mainContract.TIER_1()), "RON");
  console.log("- Tier 2:", ethers.formatEther(await mainContract.TIER_2()), "RON");
  console.log("- Tier 3:", ethers.formatEther(await mainContract.TIER_3()), "RON");
  console.log();
  console.log("Prize Distribution:");
  console.log("- Platform Fee: 8.3%");
  console.log("- 1st Place: 72%");
  console.log("- 2nd Place: 18%");
  console.log("- 3rd Place: 10%");
  console.log("==================================================");
  console.log();

  console.log("Next steps:");
  console.log("1. Update .env with contract addresses");
  console.log("2. Configure game server with GAME_SERVER_ADDRESS");
  console.log("3. Import contract ABIs into frontend");
  console.log("4. Test contract interactions on testnet");
  console.log("5. Verify contracts on Ronin Explorer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
