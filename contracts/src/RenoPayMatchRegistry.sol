// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/** A single event sale. It never holds funds after a successful purchase. */
contract MatchSale {
    error InvalidQuantity();
    error SoldOut();
    error WalletLimit();
    error TransferFailed();

    uint32 public constant MAX_PER_WALLET = 4;
    IERC20 public immutable usdt;
    address public immutable club;
    uint128 public immutable priceAtomic;
    uint32 public immutable capacity;
    uint32 public sold;
    mapping(address => uint32) public purchased;

    event TicketsPurchased(address indexed buyer, uint32 quantity, uint32 sold, uint256 amountAtomic);

    constructor(IERC20 usdt_, address club_, uint128 priceAtomic_, uint32 capacity_) {
        usdt = usdt_;
        club = club_;
        priceAtomic = priceAtomic_;
        capacity = capacity_;
    }

    function remaining() external view returns (uint32) { return capacity - sold; }

    function buy(uint32 quantity) external {
        if (quantity == 0) revert InvalidQuantity();
        if (quantity > MAX_PER_WALLET - purchased[msg.sender]) revert WalletLimit();
        if (quantity > capacity - sold) revert SoldOut();
        uint256 amount = uint256(priceAtomic) * quantity;
        // State changes precede external calls; any failure reverts them atomically.
        purchased[msg.sender] += quantity;
        sold += quantity;
        if (!usdt.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        if (!usdt.transfer(club, amount)) revert TransferFailed();
        emit TicketsPurchased(msg.sender, quantity, sold, amount);
    }
}

/** Permissionless event registry: logs are the fan map's decentralized index. */
contract RenoPayMatchRegistry {
    error InvalidCapacity();
    error InvalidPrice();
    error InvalidCoordinates();
    error InvalidStartTime();

    IERC20 public immutable usdt;
    uint256 public matchCount;

    struct MatchInput {
        string eventName;
        string homeTeam;
        string awayTeam;
        string venue;
        int32 latitudeE6;
        int32 longitudeE6;
        uint64 startAt;
        uint128 priceAtomic;
        uint32 capacity;
    }

    event MatchPosted(
        bytes32 indexed matchId,
        address indexed sale,
        address indexed club,
        string eventName,
        string homeTeam,
        string awayTeam,
        string venue,
        int32 latitudeE6,
        int32 longitudeE6,
        uint64 startAt,
        uint128 priceAtomic,
        uint32 capacity
    );

    constructor(IERC20 usdt_) { usdt = usdt_; }

    function createMatch(MatchInput calldata input) external returns (bytes32 matchId, address sale) {
        if (input.capacity == 0) revert InvalidCapacity();
        if (input.priceAtomic == 0) revert InvalidPrice();
        if (input.latitudeE6 < -90_000_000 || input.latitudeE6 > 90_000_000 || input.longitudeE6 < -180_000_000 || input.longitudeE6 > 180_000_000) revert InvalidCoordinates();
        if (input.startAt <= block.timestamp) revert InvalidStartTime();
        matchId = keccak256(abi.encode(block.chainid, address(this), msg.sender, matchCount++));
        sale = address(new MatchSale(usdt, msg.sender, input.priceAtomic, input.capacity));
        emit MatchPosted(matchId, sale, msg.sender, input.eventName, input.homeTeam, input.awayTeam, input.venue, input.latitudeE6, input.longitudeE6, input.startAt, input.priceAtomic, input.capacity);
    }
}
