// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.13;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Burnable} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import {ERC20Pausable} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

contract Wngn is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
  constructor() ERC20('Wrapped Naira', 'WNGN') Ownable(msg.sender) {}

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }

  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }

  // The following functions are overrides required by Solidity.
  function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
    super._update(from, to, value);
  }

  function decimals() public pure override returns (uint8) {
    return 6;
  }
}
