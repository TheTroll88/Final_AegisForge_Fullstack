// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MetaSignal.sol";

/**
 * @title Watcher
 * @author AegisForge
 * @notice A permissioned proxy over MetaSignalRegistry that restricts writes to a
 *         designated watcher address and emits a richer observation event.
 * @dev Watcher owns one MetaSignalRegistry instance deployed at construction time.
 *      Only the `watcher` address may call `observe()`; ownership can be transferred.
 */
contract Watcher {
    // ─── Storage ──────────────────────────────────────────────────────────────

    address public watcher;
    MetaSignalRegistry public immutable registry;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Observed(address indexed by, string message, uint256 signalIndex, uint256 timestamp);
    event WatcherTransferred(address indexed oldWatcher, address indexed newWatcher);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized(address caller);
    error ZeroAddress();

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        watcher  = msg.sender;
        registry = new MetaSignalRegistry();
    }

    // ─── Modifier ─────────────────────────────────────────────────────────────

    modifier onlyWatcher() {
        if (msg.sender != watcher) revert Unauthorized(msg.sender);
        _;
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /**
     * @notice Record an observation. Only callable by the current watcher.
     * @param _message The observation payload forwarded to MetaSignalRegistry.
     */
    function observe(string calldata _message) external onlyWatcher returns (uint256 signalIndex) {
        signalIndex = registry.logSignal(_message);
        emit Observed(msg.sender, _message, signalIndex, block.timestamp);
    }

    /**
     * @notice Transfer watcher role to `_newWatcher`.
     */
    function transferWatcher(address _newWatcher) external onlyWatcher {
        if (_newWatcher == address(0)) revert ZeroAddress();
        emit WatcherTransferred(watcher, _newWatcher);
        watcher = _newWatcher;
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /**
     * @notice Convenience passthrough — returns total signal count from registry.
     */
    function totalObservations() external view returns (uint256) {
        return registry.totalSignals();
    }
}
