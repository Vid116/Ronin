// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoninRumbleMain
 * @dev Main contract for Ronin Rumble auto battler game
 * Handles entry fees, match results, prize distribution, and player balances
 */
contract RoninRumbleMain is ReentrancyGuard, Pausable, Ownable {
    // Constants
    uint256 public constant PLAYERS_PER_MATCH = 6;
    uint256 public constant PLATFORM_FEE_PERCENT = 83; // 8.3% (multiply by 10 for precision)
    uint256 public constant FIRST_PLACE_PERCENT = 720; // 72%
    uint256 public constant SECOND_PLACE_PERCENT = 180; // 18%
    uint256 public constant THIRD_PLACE_PERCENT = 100; // 10%
    uint256 public constant PERCENT_DIVISOR = 1000; // For percentage calculations
    uint256 public constant MATCH_TIMEOUT = 24 hours; // Time before match can be cancelled
    uint256 public constant MIN_PRIZE_POOL = 1000 wei; // Minimum prize pool to prevent dust

    // Valid entry fee tiers (in wei)
    uint256 public constant TIER_1 = 0.001 ether; // 0.001 RON
    uint256 public constant TIER_2 = 0.005 ether; // 0.005 RON
    uint256 public constant TIER_3 = 0.01 ether; // 0.01 RON

    // State variables
    uint256 public nextMatchId;
    address public gameServer;
    uint256 public totalPlatformFees;

    // Structs
    struct Match {
        uint256 entryFee;
        address[PLAYERS_PER_MATCH] players;
        uint8[PLAYERS_PER_MATCH] placements;
        bool finalized;
        uint256 prizePool;
        uint256 timestamp;
    }

    // Mappings
    mapping(uint256 => Match) public matches;
    mapping(address => uint256) public playerBalances;
    mapping(uint256 => mapping(address => bool)) public playerInMatch;

    // Events
    event MatchCreated(uint256 indexed matchId, uint256 entryFee, uint256 timestamp);
    event PlayerJoinedMatch(uint256 indexed matchId, address indexed player, uint256 entryFee);
    event MatchFinalized(
        uint256 indexed matchId,
        address[PLAYERS_PER_MATCH] players,
        uint8[PLAYERS_PER_MATCH] placements,
        uint256 prizePool
    );
    event RewardClaimed(address indexed player, uint256 amount);
    event BalanceWithdrawn(address indexed player, uint256 amount);
    event GameServerUpdated(address indexed oldServer, address indexed newServer);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
    event MatchCancelled(uint256 indexed matchId, uint256 refundedAmount, uint256 timestamp);

    // Modifiers
    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Only game server can call this");
        _;
    }

    modifier validEntryFee(uint256 _entryFee) {
        require(
            _entryFee == TIER_1 || _entryFee == TIER_2 || _entryFee == TIER_3,
            "Invalid entry fee tier"
        );
        _;
    }

    constructor(address _gameServer) Ownable(msg.sender) {
        require(_gameServer != address(0), "Invalid game server address");
        gameServer = _gameServer;
        nextMatchId = 1;
    }

    /**
     * @dev Creates a new match with specified entry fee
     * @param _entryFee The entry fee tier for the match
     * @return matchId The ID of the created match
     */
    function createMatch(uint256 _entryFee)
        external
        onlyGameServer
        validEntryFee(_entryFee)
        returns (uint256)
    {
        uint256 matchId = nextMatchId++;

        Match storage newMatch = matches[matchId];
        newMatch.entryFee = _entryFee;
        newMatch.timestamp = block.timestamp;

        emit MatchCreated(matchId, _entryFee, block.timestamp);

        return matchId;
    }

    /**
     * @dev Allows a player to join a match by paying the entry fee
     * @param _matchId The ID of the match to join
     */
    function joinMatch(uint256 _matchId)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        Match storage matchData = matches[_matchId];

        require(matchData.entryFee > 0, "Match does not exist");
        require(!matchData.finalized, "Match already finalized");
        require(msg.value == matchData.entryFee, "Incorrect entry fee");
        require(!playerInMatch[_matchId][msg.sender], "Already in this match");

        // Find empty slot
        bool joined = false;
        for (uint256 i = 0; i < PLAYERS_PER_MATCH; i++) {
            if (matchData.players[i] == address(0)) {
                matchData.players[i] = msg.sender;
                playerInMatch[_matchId][msg.sender] = true;
                joined = true;
                break;
            }
        }

        require(joined, "Match is full");

        matchData.prizePool += msg.value;

        emit PlayerJoinedMatch(_matchId, msg.sender, msg.value);
    }

    /**
     * @dev Submits match results and distributes prizes
     * @param _matchId The ID of the match
     * @param _players Array of player addresses in order
     * @param _placements Array of placements (1-6) for each player
     */
    function submitMatchResults(
        uint256 _matchId,
        address[PLAYERS_PER_MATCH] calldata _players,
        uint8[PLAYERS_PER_MATCH] calldata _placements
    )
        external
        onlyGameServer
        nonReentrant
    {
        Match storage matchData = matches[_matchId];

        require(matchData.entryFee > 0, "Match does not exist");
        require(!matchData.finalized, "Match already finalized");
        require(matchData.prizePool > 0, "No prize pool");
        require(matchData.prizePool >= MIN_PRIZE_POOL, "Prize pool too small");

        // Validate players and placements
        _validateMatchData(_matchId, _players, _placements);

        // Mark match as finalized
        matchData.players = _players;
        matchData.placements = _placements;
        matchData.finalized = true;

        // Calculate and distribute prizes
        _distributePrizes(_matchId, _players, _placements, matchData.prizePool);

        emit MatchFinalized(_matchId, _players, _placements, matchData.prizePool);
    }

    /**
     * @dev Validates match data before finalizing
     */
    function _validateMatchData(
        uint256 _matchId,
        address[PLAYERS_PER_MATCH] calldata _players,
        uint8[PLAYERS_PER_MATCH] calldata _placements
    ) private view {
        bool[PLAYERS_PER_MATCH] memory placementUsed;

        for (uint256 i = 0; i < PLAYERS_PER_MATCH; i++) {
            // Validate player address
            require(_players[i] != address(0), "Invalid player address");
            require(playerInMatch[_matchId][_players[i]], "Player not in match");

            // Validate placement (1-6, unique)
            require(_placements[i] >= 1 && _placements[i] <= PLAYERS_PER_MATCH, "Invalid placement");
            require(!placementUsed[_placements[i] - 1], "Duplicate placement");
            placementUsed[_placements[i] - 1] = true;
        }
    }

    /**
     * @dev Distributes prizes to players based on placements
     */
    function _distributePrizes(
        uint256 _matchId,
        address[PLAYERS_PER_MATCH] calldata _players,
        uint8[PLAYERS_PER_MATCH] calldata _placements,
        uint256 _prizePool
    ) private {
        // Calculate platform fee
        uint256 platformFee = (_prizePool * PLATFORM_FEE_PERCENT) / PERCENT_DIVISOR;
        totalPlatformFees += platformFee;

        // Remaining pool for distribution
        uint256 distributionPool = _prizePool - platformFee;

        // Calculate prizes
        uint256 firstPrize = (distributionPool * FIRST_PLACE_PERCENT) / PERCENT_DIVISOR;
        uint256 secondPrize = (distributionPool * SECOND_PLACE_PERCENT) / PERCENT_DIVISOR;
        uint256 thirdPrize = (distributionPool * THIRD_PLACE_PERCENT) / PERCENT_DIVISOR;

        // Distribute to players
        for (uint256 i = 0; i < PLAYERS_PER_MATCH; i++) {
            if (_placements[i] == 1) {
                playerBalances[_players[i]] += firstPrize;
            } else if (_placements[i] == 2) {
                playerBalances[_players[i]] += secondPrize;
            } else if (_placements[i] == 3) {
                playerBalances[_players[i]] += thirdPrize;
            }
        }
    }

    /**
     * @dev Claims accumulated rewards for the caller
     */
    function claimRewards() external nonReentrant whenNotPaused {
        uint256 balance = playerBalances[msg.sender];
        require(balance > 0, "No rewards to claim");

        playerBalances[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, balance);
    }

    /**
     * @dev Withdraws player balance (same as claimRewards, for compatibility)
     */
    function withdrawBalance() external nonReentrant whenNotPaused {
        uint256 balance = playerBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        playerBalances[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");

        emit BalanceWithdrawn(msg.sender, balance);
    }

    /**
     * @dev Owner withdraws accumulated platform fees
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 fees = totalPlatformFees;
        require(fees > 0, "No fees to withdraw");

        totalPlatformFees = 0;

        (bool success, ) = owner().call{value: fees}("");
        require(success, "Transfer failed");

        emit PlatformFeesWithdrawn(owner(), fees);
    }

    /**
     * @dev Updates the game server address
     * @param _newGameServer The new game server address
     */
    function setGameServer(address _newGameServer) external onlyOwner {
        require(_newGameServer != address(0), "Invalid address");
        address oldServer = gameServer;
        gameServer = _newGameServer;
        emit GameServerUpdated(oldServer, _newGameServer);
    }

    /**
     * @dev Pauses the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Gets match details
     * @param _matchId The ID of the match
     */
    function getMatch(uint256 _matchId)
        external
        view
        returns (
            uint256 entryFee,
            address[PLAYERS_PER_MATCH] memory players,
            uint8[PLAYERS_PER_MATCH] memory placements,
            bool finalized,
            uint256 prizePool,
            uint256 timestamp
        )
    {
        Match storage matchData = matches[_matchId];
        return (
            matchData.entryFee,
            matchData.players,
            matchData.placements,
            matchData.finalized,
            matchData.prizePool,
            matchData.timestamp
        );
    }

    /**
     * @dev Checks if a player is in a specific match
     * @param _matchId The ID of the match
     * @param _player The player address
     */
    function isPlayerInMatch(uint256 _matchId, address _player) external view returns (bool) {
        return playerInMatch[_matchId][_player];
    }

    /**
     * @dev Gets player balance
     * @param _player The player address
     */
    function getPlayerBalance(address _player) external view returns (uint256) {
        return playerBalances[_player];
    }

    /**
     * @dev Cancels a stale match and refunds all players
     * @param _matchId The ID of the match to cancel
     * Can be called by anyone if match is older than MATCH_TIMEOUT and not finalized
     */
    function cancelStaleMatch(uint256 _matchId) external nonReentrant {
        Match storage matchData = matches[_matchId];

        require(matchData.entryFee > 0, "Match does not exist");
        require(!matchData.finalized, "Match already finalized");
        require(block.timestamp >= matchData.timestamp + MATCH_TIMEOUT, "Match not stale yet");

        uint256 refundAmount = matchData.prizePool;
        require(refundAmount > 0, "No funds to refund");

        // Refund all players who joined to their claimable balances
        for (uint256 i = 0; i < PLAYERS_PER_MATCH; i++) {
            address player = matchData.players[i];
            if (player != address(0)) {
                playerBalances[player] += matchData.entryFee;
            }
        }

        // Mark match as finalized and clear prize pool
        matchData.finalized = true;
        matchData.prizePool = 0;

        emit MatchCancelled(_matchId, refundAmount, block.timestamp);
    }

    receive() external payable {
        revert("Direct transfers not allowed");
    }
}
