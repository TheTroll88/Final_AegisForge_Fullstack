// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title EchoBeacon
 * @author AegisForge
 * @notice Stores a single public string message on-chain and emits a diff event on every update.
 * @dev Intentionally minimal — no access control. Used for testing event-driven pipelines.
 */
contract EchoBeacon {
    string public message;

    event Echoed(string indexed oldMessage, string newMessage);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @param _initialMessage The message written at deployment.
     */
    constructor(string memory _initialMessage) {
        message = _initialMessage;
    }

    // ─── State Mutation ───────────────────────────────────────────────────────

    /**
     * @notice Replace the stored message with `_newMessage`.
     * @dev Emits Echoed with the old and new values so off-chain listeners can
     *      reconstruct the full mutation history.
     * @param _newMessage Replacement string (must be non-empty).
     */
    function updateMessage(string calldata _newMessage) external {
        require(bytes(_newMessage).length > 0, "EchoBeacon: empty message");
        string memory old = message;
        message = _newMessage;
        emit Echoed(old, _newMessage);
    }
}
