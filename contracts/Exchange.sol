// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract P2PExchange {
  enum AdType {
    Buy,
    Sell
  }

  struct Ad {
    uint256 price;
    AdType adType;
    address token;
    address merchant;
    uint256 quantity;
    uint256 validUntil;
  }

  address public wngnAddress;
  uint256 public adCounter = 0;
  uint256 public orderCounter = 0;
  uint256 constant PRICE_PRECISION = 10 ** 2;

  mapping(uint256 => Ad) public ads;

  event AdCreated(
    uint256 indexed adId,
    uint256 price,
    AdType adType,
    address token,
    uint256 quantity,
    uint256 validUntil,
    address merchant
  );
  event OrderExecuted(uint256 indexed adId, uint256 amount, address buyer, address merchant);
  event FundsWithdrawn(uint256 indexed adId, uint256 amount, address merchant);

  constructor(address _wngnAddress) {
    wngnAddress = _wngnAddress;
  }

  function createAd(
    uint256 _price,
    AdType _adType,
    address _token,
    uint256 _quantity,
    uint256 _validUntil
  ) external payable returns (uint256) {
    require(_price > 0, 'price must be set to a value greater than zero');
    require(_validUntil > block.timestamp + 15 minutes, 'ads must be valid for at least 15 minutes');

    ads[adCounter] = Ad({
      price: _price,
      token: _token,
      adType: _adType,
      quantity: _quantity,
      merchant: msg.sender,
      validUntil: _validUntil
    });

    IERC20 erc20Token = (_adType == AdType.Buy) ? IERC20(wngnAddress) : IERC20(_token);
    require(erc20Token.allowance(msg.sender, address(this)) >= _quantity, 'insufficient allowance provided');
    SafeERC20.safeTransferFrom(erc20Token, msg.sender, address(this), _quantity);

    emit AdCreated(adCounter, _price, _adType, _token, _quantity, _validUntil, msg.sender);
    return adCounter++;
  }

  function executeAd(uint256 _adId, uint256 _amount) external payable {
    Ad storage ad = ads[_adId];
    require(ad.validUntil >= block.timestamp, 'Ad has expired');
    require(_amount <= ad.quantity, 'Amount exceeds the remaining quantity');

    // User is selling tokens i.e. USDC/WNGN -> merchant locks WNGN while user provides USDC.
    if (ad.adType == AdType.Buy) {
      IERC20 erc20Token = IERC20(ad.token);
      uint256 usdcEquivalent = (_amount / ad.price) / PRICE_PRECISION;
      require(
        erc20Token.allowance(msg.sender, address(this)) >= usdcEquivalent,
        'Insufficient token allowance provided'
      );
      SafeERC20.safeTransferFrom(erc20Token, msg.sender, ad.merchant, usdcEquivalent);

      IERC20 wngn = IERC20(wngnAddress);
      require(wngn.approve(address(this), _amount));
      SafeERC20.safeTransferFrom(wngn, address(this), msg.sender, _amount);
      ad.quantity -= _amount;
    } else {
      // User is buying tokens i.e.  USDC/WNGN -> merchant locks USDC while user provides WNGN.
      IERC20 wngn = IERC20(wngnAddress);
      uint256 wngnEquivalent = (_amount * ad.price) / PRICE_PRECISION;

      require(wngn.allowance(msg.sender, address(this)) >= wngnEquivalent, 'Insufficient allowance provided');
      SafeERC20.safeTransferFrom(wngn, msg.sender, ad.merchant, wngnEquivalent);

      IERC20 erc20Token = IERC20(ad.token);
      require(erc20Token.approve(address(this), _amount));
      SafeERC20.safeTransferFrom(erc20Token, address(this), msg.sender, _amount);
      ad.quantity -= _amount;
    }

    emit OrderExecuted(_adId, _amount, msg.sender, ad.merchant);
  }

  function withdrawFunds(uint256 _adId) external payable {
    Ad storage ad = ads[_adId];
    require(ad.validUntil < block.timestamp, 'ad is still valid');
    require(ad.quantity > 0, 'quantity must be greater than zero');
    require(msg.sender == ad.merchant, 'only ad creator can withdraw funds from it');

    IERC20 erc20Token = (ad.adType == AdType.Buy) ? IERC20(wngnAddress) : IERC20(ad.token);
    require(erc20Token.approve(address(this), ad.quantity));
    SafeERC20.safeTransferFrom(erc20Token, address(this), ad.merchant, ad.quantity);
    ad.quantity = 0;

    emit FundsWithdrawn(_adId, ad.quantity, ad.merchant);
  }
}
