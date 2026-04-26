// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title MetaSignalRegistry
 * @author AegisForge
 * @notice Append-only on-chain log of arbitrary string signals, each bound to the
 *         sender's address and a block timestamp.
 * @dev Signals are stored in a dynamic array; indices are permanent once written.
 *      Read access is unrestricted. Write access is open to any EOA or contract.
 */
contract MetaSignalRegistry {
    // ─── Types ────────────────────────────────────────────────────────────────

    struct Signal {
        address sender;
        string  message;
        uint256 timestamp;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    Signal[] private _signals;

    // ─── Events ───────────────────────────────────────────────────────────────

    event SignalLogged(
        uint256 indexed index,
        address indexed sender,
        string          message,
        uint256         timestamp
    );

    // ─── Write ────────────────────────────────────────────────────────────────

    /**
     * @notice Append a new signal to the registry.
     * @param _message The signal payload (must be non-empty).
     * @return index The index at which the signal was stored.
     */
    function logSignal(string calldata _message) external returns (uint256 index) {
        require(bytes(_message).length > 0, "MetaSignalRegistry: empty message");
        index = _signals.length;
        _signals.push(Signal({
            sender:    msg.sender,
            message:   _message,
            timestamp: block.timestamp
        }));
        emit SignalLogged(index, msg.sender, _message, block.timestamp);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /**
     * @notice Retrieve a stored signal by index.
     * @param index Zero-based position in the registry.
     */
    function getSignal(uint256 index) external view returns (Signal memory) {
        require(index < _signals.length, "MetaSignalRegistry: index out of bounds");
        return _signals[index];
    }

    /**
     * @notice Total number of signals ever logged.
     */
    function totalSignals() external view returns (uint256) {
        return _signals.length;
    }
}
