pragma solidity ^0.4.11;


/*

  Copyright 2017 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _            
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V / 
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/  
//    
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst



import "./StandardToken.sol";
import "./SafeMath.sol";


/// @title Wanchain Token Contract
/// For more information about this token sale, please visit https://wanchain.org
/// @author Cathy - <cathy@wanchain.org>
contract WanToken is StandardToken {
    using SafeMath for uint;

    /// Constant token specific fields
    string public constant name = "WanCoin";
    string public constant symbol = "WAN";
    uint public constant decimals = 18;

    /// Wanchain total tokens supply
    uint public constant MAX_TOTAL_TOKEN_AMOUNT = 210000000 ether;

    /// Fields that are only changed in constructor
    /// Wanchain contribution contract
    address public minter; 
    /// ICO start time
    uint public startTime;
    /// ICO end time
    uint public endTime;

    /// Fields that can be changed by functions
    mapping (address => uint) public lockedBalances;
    /*
     * MODIFIERS
     */

    modifier onlyMinter {
    	  assert(msg.sender == minter);
    	  _;
    }

    modifier isLaterThan (uint x){
    	  assert(now > x);
    	  _;
    }

    modifier maxWanTokenAmountNotReached (uint amount){
    	  assert(totalSupply.add(amount) <= MAX_TOTAL_TOKEN_AMOUNT);
    	  _;
    }

    /**
     * CONSTRUCTOR 
     * 
     * @dev Initialize the Wanchain Token
     * @param _minter The Wanchain Contribution Contract     
     * @param _startTime ICO start time
     * @param _endTime ICO End Time
     */
    function WanToken(address _minter, uint _startTime, uint _endTime){
    	  minter = _minter;
    	  startTime = _startTime;
    	  endTime = _endTime;
    }

    /**
     * EXTERNAL FUNCTION 
     * 
     * @dev Contribution contract instance mint token
     * @param receipent The destination account owned mint tokens    
     * @param amount The amount of mint token
     * be sent to this address.
     */    
    function mintToken(address receipent, uint amount)
        external
        onlyMinter
        maxWanTokenAmountNotReached(amount)
        returns (bool)
    {
      	lockedBalances[receipent] = lockedBalances[receipent].add(amount);
      	totalSupply = totalSupply.add(amount);
      	return true;
    }

    /*
     * PUBLIC FUNCTIONS
     */

    /// @dev Locking period has passed - Locked tokens have turned into tradeable
    ///      All tokens owned by receipent will be tradeable
    function claimTokens(address receipent)
        public
        onlyMinter
    {
      	balances[receipent] = balances[receipent].add(lockedBalances[receipent]);
      	lockedBalances[receipent] = 0;
    }

    /*
     * CONSTANT METHODS
     */
    function lockedBalanceOf(address _owner) constant returns (uint balance) {
        return lockedBalances[_owner];
    }
}

