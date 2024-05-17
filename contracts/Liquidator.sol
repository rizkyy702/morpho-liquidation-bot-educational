// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Id, IMorpho, MarketParams} from "../lib/morpho-blue/src/interfaces/IMorpho.sol";
import {MorphoLib} from "../lib/morpho-blue/src/libraries/periphery/MorphoLib.sol";
import {IMorphoLiquidateCallback} from "../lib/morpho-blue/src/interfaces/IMorphoCallbacks.sol";

import {SafeTransferLib, ERC20} from "../lib/solmate/src/utils/SafeTransferLib.sol";

contract Liquidator is IMorphoLiquidateCallback {

    using SafeTransferLib for ERC20;

    event LiquidationEvent(string message, uint256 value);

    struct SwapDescription {
        ERC20 srcToken;
        ERC20 dstToken;
        address payable srcReceiver;
        address payable dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    address public immutable MORPHO_BLUE;
    address public immutable AGGREGATION_ROUTER_V6;

    constructor(address blue, address router) {
        MORPHO_BLUE = blue;
        AGGREGATION_ROUTER_V6 = router;
    }

    function liquidate(
        MarketParams calldata marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes calldata data
    ) external {
        IMorpho(MORPHO_BLUE).liquidate(marketParams, borrower, seizedAssets, repaidShares, data);
        
        emit LiquidationEvent("Liquidation successful", seizedAssets);

        // Ensure no tokens remains on the Liquidator.
        SwapDescription memory desc = _readOneinchData(data);
        uint256 srcBalance = desc.srcToken.balanceOf(address(this));
        uint256 dstBalance = desc.dstToken.balanceOf(address(this));
        if (srcBalance > 0) desc.srcToken.safeTransfer(msg.sender, srcBalance);
        if (dstBalance > 0) desc.dstToken.safeTransfer(msg.sender, dstBalance);
    }

    function onMorphoLiquidate(uint256 repaidAssets, bytes calldata data) external onlyMorpho {
        SwapDescription memory desc = _readOneinchData(data);

        desc.srcToken.safeApprove(AGGREGATION_ROUTER_V6, desc.amount);
        desc.dstToken.safeApprove(msg.sender, repaidAssets);

        (bool succ, bytes memory _returnData) = AGGREGATION_ROUTER_V6.call(data);

        require(succ, "Trade unsuccessful");

        (uint256 returnAmount,) = abi.decode(_returnData, (uint256, uint256));
        require(returnAmount >= repaidAssets, "Not enough assets to repay.");
    }

    function _readOneinchData(bytes calldata data) private pure returns (SwapDescription memory) {
        (, SwapDescription memory desc,) = abi.decode(data[4:], (address, SwapDescription, bytes));
        return desc;
    }

    modifier onlyMorpho() {
        require(msg.sender == MORPHO_BLUE, "msg.sender should be Morpho Blue");
        _;
    }
    
    // Still hesitant to go with the following implementation
    //     function _approveMaxTo(address asset, address spender) internal {
    //         if (ERC20(asset).allowance(address(this), spender) == 0) {
    //             ERC20(asset).safeApprove(spender, type(uint256).max);
    //         }
    //     }
}
