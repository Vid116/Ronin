// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RoninRumbleNFT
 * @dev NFT contract for Ronin Rumble card skins
 * Allows players to own unique cosmetic skins for their game cards
 */
contract RoninRumbleNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, Pausable {
    using Strings for uint256;

    // State variables
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    address public gameContract;

    // Skin rarity levels
    enum Rarity { COMMON, RARE, EPIC, LEGENDARY, MYTHIC }

    // Structs
    struct CardSkin {
        string name;
        string cardType; // "Warrior", "Mage", "Archer", etc.
        Rarity rarity;
        uint256 mintedAt;
        bool isEquipped;
    }

    // Mappings
    mapping(uint256 => CardSkin) public cardSkins;
    mapping(address => mapping(string => uint256)) public equippedSkins; // player => cardType => tokenId

    // Mint limits per rarity
    mapping(Rarity => uint256) public rarityMintLimits;
    mapping(Rarity => uint256) public rarityMintCount;

    // Events
    event CardSkinMinted(
        uint256 indexed tokenId,
        address indexed to,
        string name,
        string cardType,
        Rarity rarity
    );
    event SkinEquipped(address indexed player, string cardType, uint256 indexed tokenId);
    event SkinUnequipped(address indexed player, string cardType, uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);
    event GameContractUpdated(address indexed newGameContract);

    constructor(string memory baseTokenURI) ERC721("Ronin Rumble Card Skins", "RRCS") Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
        _nextTokenId = 1;

        // Set mint limits per rarity
        rarityMintLimits[Rarity.COMMON] = 10000;
        rarityMintLimits[Rarity.RARE] = 5000;
        rarityMintLimits[Rarity.EPIC] = 2000;
        rarityMintLimits[Rarity.LEGENDARY] = 500;
        rarityMintLimits[Rarity.MYTHIC] = 100;
    }

    /**
     * @dev Mints a new card skin NFT
     * @param to The address to mint to
     * @param name The name of the skin
     * @param cardType The type of card (Warrior, Mage, etc.)
     * @param rarity The rarity level of the skin
     * @param uri The metadata URI for the NFT
     */
    function mintCardSkin(
        address to,
        string memory name,
        string memory cardType,
        Rarity rarity,
        string memory uri
    ) public onlyOwner whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid address");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(cardType).length > 0, "Card type cannot be empty");
        require(
            rarityMintCount[rarity] < rarityMintLimits[rarity],
            "Rarity mint limit reached"
        );

        uint256 tokenId = _nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        cardSkins[tokenId] = CardSkin({
            name: name,
            cardType: cardType,
            rarity: rarity,
            mintedAt: block.timestamp,
            isEquipped: false
        });

        rarityMintCount[rarity]++;

        emit CardSkinMinted(tokenId, to, name, cardType, rarity);

        return tokenId;
    }

    /**
     * @dev Batch mints multiple card skins
     * @param recipients Array of recipient addresses
     * @param names Array of skin names
     * @param cardTypes Array of card types
     * @param rarities Array of rarity levels
     * @param uris Array of metadata URIs
     */
    function batchMintCardSkins(
        address[] calldata recipients,
        string[] calldata names,
        string[] calldata cardTypes,
        Rarity[] calldata rarities,
        string[] calldata uris
    ) external onlyOwner whenNotPaused {
        require(
            recipients.length == names.length &&
            names.length == cardTypes.length &&
            cardTypes.length == rarities.length &&
            rarities.length == uris.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            mintCardSkin(recipients[i], names[i], cardTypes[i], rarities[i], uris[i]);
        }
    }

    /**
     * @dev Equips a card skin for a specific card type
     * @param tokenId The ID of the skin to equip
     */
    function equipSkin(uint256 tokenId) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");

        CardSkin storage skin = cardSkins[tokenId];
        string memory cardType = skin.cardType;

        // Unequip previously equipped skin
        uint256 previousTokenId = equippedSkins[msg.sender][cardType];
        if (previousTokenId != 0) {
            cardSkins[previousTokenId].isEquipped = false;
            emit SkinUnequipped(msg.sender, cardType, previousTokenId);
        }

        // Equip new skin
        equippedSkins[msg.sender][cardType] = tokenId;
        skin.isEquipped = true;

        emit SkinEquipped(msg.sender, cardType, tokenId);
    }

    /**
     * @dev Unequips a card skin
     * @param cardType The type of card to unequip
     */
    function unequipSkin(string memory cardType) external whenNotPaused {
        uint256 tokenId = equippedSkins[msg.sender][cardType];
        require(tokenId != 0, "No skin equipped");

        cardSkins[tokenId].isEquipped = false;
        delete equippedSkins[msg.sender][cardType];

        emit SkinUnequipped(msg.sender, cardType, tokenId);
    }

    /**
     * @dev Gets the equipped skin for a player's card type
     * @param player The player address
     * @param cardType The card type
     */
    function getEquippedSkin(address player, string memory cardType)
        external
        view
        returns (uint256)
    {
        return equippedSkins[player][cardType];
    }

    /**
     * @dev Gets all token IDs owned by an address
     * @param owner The owner address
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokens;
    }

    /**
     * @dev Gets card skin details
     * @param tokenId The token ID
     */
    function getCardSkin(uint256 tokenId)
        external
        view
        returns (
            string memory name,
            string memory cardType,
            Rarity rarity,
            uint256 mintedAt,
            bool isEquipped,
            address owner
        )
    {
        CardSkin memory skin = cardSkins[tokenId];
        return (
            skin.name,
            skin.cardType,
            skin.rarity,
            skin.mintedAt,
            skin.isEquipped,
            ownerOf(tokenId)
        );
    }

    /**
     * @dev Updates the base token URI
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Updates the game contract address
     * @param _gameContract The new game contract address
     */
    function setGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid address");
        gameContract = _gameContract;
        emit GameContractUpdated(_gameContract);
    }

    /**
     * @dev Updates mint limit for a rarity
     * @param rarity The rarity level
     * @param limit The new limit
     */
    function setRarityMintLimit(Rarity rarity, uint256 limit) external onlyOwner {
        require(limit >= rarityMintCount[rarity], "Limit below current count");
        rarityMintLimits[rarity] = limit;
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

    // Override required functions
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
