import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { RoninRumbleMain, RoninRumbleNFT } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RoninRumbleMain", function () {
  // Entry fee tiers
  const TIER_1 = ethers.parseEther("2");
  const TIER_2 = ethers.parseEther("10");
  const TIER_3 = ethers.parseEther("50");

  async function deployContractsFixture() {
    const [owner, gameServer, player1, player2, player3, player4, player5, player6, player7] =
      await ethers.getSigners();

    const RoninRumbleMain = await ethers.getContractFactory("RoninRumbleMain");
    const mainContract = await RoninRumbleMain.deploy(gameServer.address);

    const RoninRumbleNFT = await ethers.getContractFactory("RoninRumbleNFT");
    const nftContract = await RoninRumbleNFT.deploy("https://api.roninrumble.com/metadata/");

    return {
      mainContract,
      nftContract,
      owner,
      gameServer,
      players: [player1, player2, player3, player4, player5, player6],
      player7
    };
  }

  describe("Deployment", function () {
    it("Should set the correct game server", async function () {
      const { mainContract, gameServer } = await loadFixture(deployContractsFixture);
      expect(await mainContract.gameServer()).to.equal(gameServer.address);
    });

    it("Should set the correct owner", async function () {
      const { mainContract, owner } = await loadFixture(deployContractsFixture);
      expect(await mainContract.owner()).to.equal(owner.address);
    });

    it("Should start with nextMatchId = 1", async function () {
      const { mainContract } = await loadFixture(deployContractsFixture);
      expect(await mainContract.nextMatchId()).to.equal(1);
    });

    it("Should revert if game server is zero address", async function () {
      const RoninRumbleMain = await ethers.getContractFactory("RoninRumbleMain");
      await expect(
        RoninRumbleMain.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid game server address");
    });
  });

  describe("Match Creation", function () {
    it("Should allow game server to create a match", async function () {
      const { mainContract, gameServer } = await loadFixture(deployContractsFixture);

      await expect(mainContract.connect(gameServer).createMatch(TIER_1))
        .to.emit(mainContract, "MatchCreated")
        .withArgs(1, TIER_1, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      const match = await mainContract.getMatch(1);
      expect(match.entryFee).to.equal(TIER_1);
    });

    it("Should reject invalid entry fees", async function () {
      const { mainContract, gameServer } = await loadFixture(deployContractsFixture);

      await expect(
        mainContract.connect(gameServer).createMatch(ethers.parseEther("5"))
      ).to.be.revertedWith("Invalid entry fee tier");
    });

    it("Should only allow game server to create matches", async function () {
      const { mainContract, owner } = await loadFixture(deployContractsFixture);

      await expect(
        mainContract.connect(owner).createMatch(TIER_1)
      ).to.be.revertedWith("Only game server can call this");
    });
  });

  describe("Joining Matches", function () {
    it("Should allow players to join a match with correct fee", async function () {
      const { mainContract, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);

      await expect(mainContract.connect(players[0]).joinMatch(1, { value: TIER_1 }))
        .to.emit(mainContract, "PlayerJoinedMatch")
        .withArgs(1, players[0].address, TIER_1);

      const match = await mainContract.getMatch(1);
      expect(match.players[0]).to.equal(players[0].address);
      expect(match.prizePool).to.equal(TIER_1);
    });

    it("Should allow 6 players to join a match", async function () {
      const { mainContract, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_2);

      for (let i = 0; i < 6; i++) {
        await mainContract.connect(players[i]).joinMatch(1, { value: TIER_2 });
      }

      const match = await mainContract.getMatch(1);
      expect(match.prizePool).to.equal(TIER_2 * BigInt(6));

      for (let i = 0; i < 6; i++) {
        expect(match.players[i]).to.equal(players[i].address);
      }
    });

    it("Should reject if match is full", async function () {
      const { mainContract, gameServer, players, player7 } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);

      for (let i = 0; i < 6; i++) {
        await mainContract.connect(players[i]).joinMatch(1, { value: TIER_1 });
      }

      await expect(
        mainContract.connect(player7).joinMatch(1, { value: TIER_1 })
      ).to.be.revertedWith("Match is full");
    });

    it("Should reject incorrect entry fee", async function () {
      const { mainContract, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);

      await expect(
        mainContract.connect(players[0]).joinMatch(1, { value: TIER_2 })
      ).to.be.revertedWith("Incorrect entry fee");
    });

    it("Should reject if player already in match", async function () {
      const { mainContract, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);
      await mainContract.connect(players[0]).joinMatch(1, { value: TIER_1 });

      await expect(
        mainContract.connect(players[0]).joinMatch(1, { value: TIER_1 })
      ).to.be.revertedWith("Already in this match");
    });

    it("Should reject joining finalized match", async function () {
      const { mainContract, gameServer, players, player7 } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);

      // Fill match
      for (let i = 0; i < 6; i++) {
        await mainContract.connect(players[i]).joinMatch(1, { value: TIER_1 });
      }

      // Finalize
      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];
      await mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements);

      await expect(
        mainContract.connect(player7).joinMatch(1, { value: TIER_1 })
      ).to.be.revertedWith("Match already finalized");
    });
  });

  describe("Match Finalization", function () {
    async function createFullMatchFixture() {
      const fixture = await deployContractsFixture();
      const { mainContract, gameServer, players } = fixture;

      await mainContract.connect(gameServer).createMatch(TIER_2);

      for (let i = 0; i < 6; i++) {
        await mainContract.connect(players[i]).joinMatch(1, { value: TIER_2 });
      }

      return fixture;
    }

    it("Should finalize match with valid results", async function () {
      const { mainContract, gameServer, players } = await loadFixture(createFullMatchFixture);

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await expect(mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements))
        .to.emit(mainContract, "MatchFinalized");

      const match = await mainContract.getMatch(1);
      expect(match.finalized).to.be.true;
    });

    it("Should correctly distribute prizes", async function () {
      const { mainContract, gameServer, players } = await loadFixture(createFullMatchFixture);

      const prizePool = TIER_2 * BigInt(6); // 60 ETH
      const platformFee = (prizePool * BigInt(83)) / BigInt(1000); // 8.3%
      const distributionPool = prizePool - platformFee;

      const expectedFirstPrize = (distributionPool * BigInt(720)) / BigInt(1000); // 72%
      const expectedSecondPrize = (distributionPool * BigInt(180)) / BigInt(1000); // 18%
      const expectedThirdPrize = (distributionPool * BigInt(100)) / BigInt(1000); // 10%

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements);

      expect(await mainContract.playerBalances(players[0].address)).to.equal(expectedFirstPrize);
      expect(await mainContract.playerBalances(players[1].address)).to.equal(expectedSecondPrize);
      expect(await mainContract.playerBalances(players[2].address)).to.equal(expectedThirdPrize);
      expect(await mainContract.playerBalances(players[3].address)).to.equal(0);
      expect(await mainContract.totalPlatformFees()).to.equal(platformFee);
    });

    it("Should reject invalid placements (duplicate)", async function () {
      const { mainContract, gameServer, players } = await loadFixture(createFullMatchFixture);

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 1, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await expect(
        mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements)
      ).to.be.revertedWith("Duplicate placement");
    });

    it("Should reject invalid placements (out of range)", async function () {
      const { mainContract, gameServer, players } = await loadFixture(createFullMatchFixture);

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [0, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await expect(
        mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements)
      ).to.be.revertedWith("Invalid placement");
    });

    it("Should reject if player not in match", async function () {
      const { mainContract, gameServer, players, player7 } = await loadFixture(createFullMatchFixture);

      const playerAddresses = [...players.slice(0, 5).map(p => p.address), player7.address] as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await expect(
        mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements)
      ).to.be.revertedWith("Player not in match");
    });

    it("Should reject double finalization", async function () {
      const { mainContract, gameServer, players } = await loadFixture(createFullMatchFixture);

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements);

      await expect(
        mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements)
      ).to.be.revertedWith("Match already finalized");
    });

    it("Should only allow game server to submit results", async function () {
      const { mainContract, owner, players } = await loadFixture(createFullMatchFixture);

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];

      await expect(
        mainContract.connect(owner).submitMatchResults(1, playerAddresses, placements)
      ).to.be.revertedWith("Only game server can call this");
    });
  });

  describe("Reward Claiming", function () {
    async function finalizedMatchFixture() {
      const fixture = await deployContractsFixture();
      const { mainContract, gameServer, players } = fixture;

      await mainContract.connect(gameServer).createMatch(TIER_2);

      for (let i = 0; i < 6; i++) {
        await mainContract.connect(players[i]).joinMatch(1, { value: TIER_2 });
      }

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];
      await mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements);

      return fixture;
    }

    it("Should allow players to claim rewards", async function () {
      const { mainContract, players } = await loadFixture(finalizedMatchFixture);

      const balance = await mainContract.playerBalances(players[0].address);
      const initialBalance = await ethers.provider.getBalance(players[0].address);

      const tx = await mainContract.connect(players[0]).claimRewards();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(players[0].address);

      expect(await mainContract.playerBalances(players[0].address)).to.equal(0);
      expect(finalBalance).to.equal(initialBalance + balance - gasUsed);
    });

    it("Should emit RewardClaimed event", async function () {
      const { mainContract, players } = await loadFixture(finalizedMatchFixture);

      const balance = await mainContract.playerBalances(players[0].address);

      await expect(mainContract.connect(players[0]).claimRewards())
        .to.emit(mainContract, "RewardClaimed")
        .withArgs(players[0].address, balance);
    });

    it("Should reject if no rewards to claim", async function () {
      const { mainContract, players } = await loadFixture(finalizedMatchFixture);

      await expect(
        mainContract.connect(players[3]).claimRewards()
      ).to.be.revertedWith("No rewards to claim");
    });

    it("Should allow withdrawBalance (alias for claimRewards)", async function () {
      const { mainContract, players } = await loadFixture(finalizedMatchFixture);

      const balance = await mainContract.playerBalances(players[1].address);

      await expect(mainContract.connect(players[1]).withdrawBalance())
        .to.emit(mainContract, "BalanceWithdrawn")
        .withArgs(players[1].address, balance);

      expect(await mainContract.playerBalances(players[1].address)).to.equal(0);
    });
  });

  describe("Platform Fees", function () {
    async function finalizedMatchFixture() {
      const fixture = await deployContractsFixture();
      const { mainContract, gameServer, players } = fixture;

      await mainContract.connect(gameServer).createMatch(TIER_2);

      for (let i = 0; i < 6; i++) {
        await mainContract.connect(players[i]).joinMatch(1, { value: TIER_2 });
      }

      const playerAddresses = players.map(p => p.address) as [string, string, string, string, string, string];
      const placements = [1, 2, 3, 4, 5, 6] as [number, number, number, number, number, number];
      await mainContract.connect(gameServer).submitMatchResults(1, playerAddresses, placements);

      return fixture;
    }

    it("Should allow owner to withdraw platform fees", async function () {
      const { mainContract, owner } = await loadFixture(finalizedMatchFixture);

      const platformFees = await mainContract.totalPlatformFees();
      expect(platformFees).to.be.gt(0);

      await expect(mainContract.connect(owner).withdrawPlatformFees())
        .to.emit(mainContract, "PlatformFeesWithdrawn")
        .withArgs(owner.address, platformFees);

      expect(await mainContract.totalPlatformFees()).to.equal(0);
    });

    it("Should reject if no fees to withdraw", async function () {
      const { mainContract, owner } = await loadFixture(deployContractsFixture);

      await expect(
        mainContract.connect(owner).withdrawPlatformFees()
      ).to.be.revertedWith("No fees to withdraw");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set game server", async function () {
      const { mainContract, owner, players } = await loadFixture(deployContractsFixture);

      await expect(mainContract.connect(owner).setGameServer(players[0].address))
        .to.emit(mainContract, "GameServerUpdated");

      expect(await mainContract.gameServer()).to.equal(players[0].address);
    });

    it("Should allow owner to pause", async function () {
      const { mainContract, owner } = await loadFixture(deployContractsFixture);

      await mainContract.connect(owner).pause();
      expect(await mainContract.paused()).to.be.true;
    });

    it("Should reject operations when paused", async function () {
      const { mainContract, owner, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);
      await mainContract.connect(owner).pause();

      await expect(
        mainContract.connect(players[0]).joinMatch(1, { value: TIER_1 })
      ).to.be.revertedWithCustomError(mainContract, "EnforcedPause");
    });

    it("Should allow owner to unpause", async function () {
      const { mainContract, owner } = await loadFixture(deployContractsFixture);

      await mainContract.connect(owner).pause();
      await mainContract.connect(owner).unpause();

      expect(await mainContract.paused()).to.be.false;
    });
  });

  describe("View Functions", function () {
    it("Should return correct match details", async function () {
      const { mainContract, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_2);
      await mainContract.connect(players[0]).joinMatch(1, { value: TIER_2 });

      const match = await mainContract.getMatch(1);
      expect(match.entryFee).to.equal(TIER_2);
      expect(match.players[0]).to.equal(players[0].address);
      expect(match.prizePool).to.equal(TIER_2);
      expect(match.finalized).to.be.false;
    });

    it("Should check if player is in match", async function () {
      const { mainContract, gameServer, players } = await loadFixture(deployContractsFixture);

      await mainContract.connect(gameServer).createMatch(TIER_1);
      await mainContract.connect(players[0]).joinMatch(1, { value: TIER_1 });

      expect(await mainContract.isPlayerInMatch(1, players[0].address)).to.be.true;
      expect(await mainContract.isPlayerInMatch(1, players[1].address)).to.be.false;
    });

    it("Should return player balance", async function () {
      const { mainContract, players } = await loadFixture(deployContractsFixture);

      expect(await mainContract.getPlayerBalance(players[0].address)).to.equal(0);
    });
  });
});

describe("RoninRumbleNFT", function () {
  async function deployNFTFixture() {
    const [owner, player1, player2] = await ethers.getSigners();

    const RoninRumbleNFT = await ethers.getContractFactory("RoninRumbleNFT");
    const nftContract = await RoninRumbleNFT.deploy("https://api.roninrumble.com/metadata/");

    return { nftContract, owner, player1, player2 };
  }

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      const { nftContract } = await loadFixture(deployNFTFixture);

      expect(await nftContract.name()).to.equal("Ronin Rumble Card Skins");
      expect(await nftContract.symbol()).to.equal("RRCS");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint card skin", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await expect(
        nftContract.connect(owner).mintCardSkin(
          player1.address,
          "Dragon Warrior",
          "Warrior",
          0, // COMMON
          "dragon-warrior.json"
        )
      ).to.emit(nftContract, "CardSkinMinted");

      expect(await nftContract.ownerOf(1)).to.equal(player1.address);
    });

    it("Should track rarity limits", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Mythic Mage",
        "Mage",
        4, // MYTHIC
        "mythic-mage.json"
      );

      expect(await nftContract.rarityMintCount(4)).to.equal(1);
      expect(await nftContract.rarityMintLimits(4)).to.equal(100);
    });

    it("Should reject minting beyond rarity limit", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      // Set limit to 1
      await nftContract.connect(owner).setRarityMintLimit(4, 1);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Mythic Mage 1",
        "Mage",
        4,
        "mythic-1.json"
      );

      await expect(
        nftContract.connect(owner).mintCardSkin(
          player1.address,
          "Mythic Mage 2",
          "Mage",
          4,
          "mythic-2.json"
        )
      ).to.be.revertedWith("Rarity mint limit reached");
    });
  });

  describe("Equipping Skins", function () {
    it("Should allow owner to equip skin", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Dragon Warrior",
        "Warrior",
        0,
        "dragon.json"
      );

      await expect(nftContract.connect(player1).equipSkin(1))
        .to.emit(nftContract, "SkinEquipped")
        .withArgs(player1.address, "Warrior", 1);

      expect(await nftContract.getEquippedSkin(player1.address, "Warrior")).to.equal(1);
    });

    it("Should unequip previous skin when equipping new one", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Dragon Warrior",
        "Warrior",
        0,
        "dragon.json"
      );

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Phoenix Warrior",
        "Warrior",
        2,
        "phoenix.json"
      );

      await nftContract.connect(player1).equipSkin(1);

      await expect(nftContract.connect(player1).equipSkin(2))
        .to.emit(nftContract, "SkinUnequipped")
        .withArgs(player1.address, "Warrior", 1);

      expect(await nftContract.getEquippedSkin(player1.address, "Warrior")).to.equal(2);
    });

    it("Should allow unequipping skin", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Dragon Warrior",
        "Warrior",
        0,
        "dragon.json"
      );

      await nftContract.connect(player1).equipSkin(1);

      await expect(nftContract.connect(player1).unequipSkin("Warrior"))
        .to.emit(nftContract, "SkinUnequipped");

      expect(await nftContract.getEquippedSkin(player1.address, "Warrior")).to.equal(0);
    });
  });

  describe("View Functions", function () {
    it("Should return tokens by owner", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Skin 1",
        "Warrior",
        0,
        "1.json"
      );

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Skin 2",
        "Mage",
        1,
        "2.json"
      );

      const tokens = await nftContract.getTokensByOwner(player1.address);
      expect(tokens.length).to.equal(2);
      expect(tokens[0]).to.equal(1);
      expect(tokens[1]).to.equal(2);
    });

    it("Should return card skin details", async function () {
      const { nftContract, owner, player1 } = await loadFixture(deployNFTFixture);

      await nftContract.connect(owner).mintCardSkin(
        player1.address,
        "Dragon Warrior",
        "Warrior",
        3, // LEGENDARY
        "dragon.json"
      );

      const skin = await nftContract.getCardSkin(1);
      expect(skin.name).to.equal("Dragon Warrior");
      expect(skin.cardType).to.equal("Warrior");
      expect(skin.rarity).to.equal(3);
      expect(skin.isEquipped).to.be.false;
      expect(skin.owner).to.equal(player1.address);
    });
  });
});
