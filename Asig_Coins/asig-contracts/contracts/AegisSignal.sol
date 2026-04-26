// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title AegisSignal
 * @author AegisForge
 * @notice ERC-20 token — ASIG
 * @dev Minimal ERC-20 implementation. No mint/burn after deploy; full supply minted to deployer.
 *
 *   Name:          Aegis Signal
 *   Symbol:        ASIG
 *   Decimals:      18
 *   Total Supply:  1,000,000 ASIG
 *   Network:       Base
 */
contract AegisSignal {
    string public name     = "Aegis Signal";
    string public symbol   = "ASIG";
    uint8  public decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from,    address indexed to,      uint256 value);
    event Approval(address indexed owner,   address indexed spender, uint256 value);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        totalSupply             = 1_000_000 * 10 ** uint256(decimals);
        balanceOf[msg.sender]   = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    // ─── ERC-20 Core ─────────────────────────────────────────────────────────

    /**
     * @notice Transfer `value` tokens to `to`.
     */
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "ASIG: insufficient balance");
        unchecked {
            balanceOf[msg.sender] -= value;
            balanceOf[to]         += value;
        }
        emit Transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @notice Approve `spender` to move up to `value` tokens on behalf of the caller.
     */
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @notice Transfer on behalf of `from`, consuming allowance.
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from]                  >= value, "ASIG: insufficient balance");
        require(allowance[from][msg.sender]      >= value, "ASIG: allowance exceeded");
        unchecked {
            balanceOf[from]                 -= value;
            balanceOf[to]                   += value;
            allowance[from][msg.sender]     -= value;
        }
        emit Transfer(from, to, value);
        return true;
    }
}
