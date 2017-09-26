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



import "./SafeMath.sol";
import "./Owned.sol";
import "./WanToken.sol";


/// @title Wanchain Contribution Contract
/// ICO Rules according: https://www.wanchain.org/crowdsale
/// For more information about this token sale, please visit https://wanchain.org
/// @author Zane Liang - <zaneliang@wanchain.org>
contract WanchainContribution is Owned {
    using SafeMath for uint;

    /// Constant fields
    /// Wanchain total tokens supply
    uint public constant WAN_TOTAL_SUPPLY = 210000000 ether;
    uint public constant EARLY_CONTRIBUTION_DURATION = 24 hours;
    uint public constant MAX_CONTRIBUTION_DURATION = 3 weeks;

    /// Exchange rates for first phase
    uint public constant PRICE_RATE_FIRST = 880;
    /// Exchange rates for second phase
    uint public constant PRICE_RATE_SECOND = 790;
    /// Exchange rates for last phase
    uint public constant PRICE_RATE_LAST = 750;

    /// ----------------------------------------------------------------------------------------------------
    /// |                                                  |                    |                 |        |
    /// |        PUBLIC SALE (PRESALE + OPEN SALE)         |      DEV TEAM      |    FOUNDATION   |  MINER |
    /// |                       51%                        |         20%        |       19%       |   10%  |    
    /// ----------------------------------------------------------------------------------------------------
      /// OPEN_SALE_STAKE + PRESALE_STAKE = 51; 51% sale for public
    uint public constant OPEN_SALE_STAKE = 510;  // 51% for open sale

    // Reserved stakes
    uint public constant DEV_TEAM_STAKE = 200;   // 20%
    uint public constant FOUNDATION_STAKE = 190; // 19%
    uint public constant MINERS_STAKE = 100;     // 10%

    uint public constant DIVISOR_STAKE = 1000;

    uint public constant PRESALE_RESERVERED_AMOUNT = 35200000 ether; //presale prize amount(40000*880)
	
    /// Holder address for presale and reserved tokens
    /// TODO: change addressed before deployed to main net

    // Addresses of Patrons
    address public constant DEV_TEAM_HOLDER = 0xB1EFca62C555b49E67363B48aE5b8Af3C7E3e656;
    address public constant FOUNDATION_HOLDER = 0x00779e0e4c6083cfd26dE77B4dbc107A7EbB99d2;
    address public constant MINERS_HOLDER = 0xDD91615Ea8De94bC48231c4ae9488891F1648dc5;
    address public constant PRESALE_HOLDER = 0x25a1459D8845Eb3382245Ff5F955774958dc3211;
	
    uint public MAX_OPEN_SOLD = WAN_TOTAL_SUPPLY * OPEN_SALE_STAKE / DIVISOR_STAKE - PRESALE_RESERVERED_AMOUNT;

    /// Fields that are only changed in constructor    
    /// All deposited ETH will be instantly forwarded to this address.
    address public wanport;
    /// Early Adopters reserved start time
    uint public earlyReserveBeginTime;
    /// Contribution start time
    uint public startTime;
    /// Contribution end time
    uint public endTime;

    /// Fields that can be changed by functions
    /// Accumulator for open sold tokens
    uint openSoldTokens;
    /// Due to an emergency, set this to true to halt the contribution
    bool public halted; 
    /// ERC20 compilant wanchain token contact instance
    WanToken public wanToken; 

    /// Quota for early adopters sale, Quota
    mapping (address => uint256) public earlyUserQuotas;
    /// tags show address can join in open sale
    mapping (address => uint256) public fullWhiteList;

    uint256 public normalBuyLimit = 65 ether;

    /*
     * EVENTS
     */

    event NewSale(address indexed destAddress, uint ethCost, uint gotTokens);
    //event PartnerAddressQuota(address indexed partnerAddress, uint quota);

    /*
     * MODIFIERS
     */

    modifier onlyWallet {
        require(msg.sender == wanport);
        _;
    }

    modifier notHalted() {
        require(!halted);
        _;
    }

    modifier initialized() {
        require(address(wanport) != 0x0);
        _;
    }    

    modifier notEarlierThan(uint x) {
        require(now >= x);
        _;
    }

    modifier earlierThan(uint x) {
        require(now < x);
        _;
    }

    modifier ceilingNotReached() {
        require(openSoldTokens < MAX_OPEN_SOLD);
        _;
    }  

    modifier isSaleEnded() {
        require(now > endTime || openSoldTokens >= MAX_OPEN_SOLD);
        _;
    }


    /**
     * CONSTRUCTOR 
     * 
     * @dev Initialize the Wanchain contribution contract
     * @param _wanport The escrow account address, all ethers will be sent to this address.
     * @param _bootTime ICO boot time
     */
    function WanchainContribution(address _wanport, uint _bootTime){
    	require(_wanport != 0x0);

        halted = false;
    	wanport = _wanport;
        earlyReserveBeginTime = _bootTime;
    	startTime = earlyReserveBeginTime + EARLY_CONTRIBUTION_DURATION;
    	endTime = startTime + MAX_CONTRIBUTION_DURATION;
        openSoldTokens = 0;
        /// Create wanchain token contract instance
    	wanToken = new WanToken(this,startTime, endTime);

        /// Reserve tokens according wanchain ICO rules
    	uint stakeMultiplier = WAN_TOTAL_SUPPLY / DIVISOR_STAKE;
		
        wanToken.mintToken(DEV_TEAM_HOLDER, DEV_TEAM_STAKE * stakeMultiplier);
        wanToken.mintToken(FOUNDATION_HOLDER, FOUNDATION_STAKE * stakeMultiplier);
        wanToken.mintToken(MINERS_HOLDER, MINERS_STAKE * stakeMultiplier);
		
        wanToken.mintToken(PRESALE_HOLDER, PRESALE_RESERVERED_AMOUNT);		
		
    }

    /**
     * Fallback function 
     * 
     * @dev If anybody sends Ether directly to this  contract, consider he is getting wan token
     */
    function () public payable notHalted ceilingNotReached{
    	buyWanCoin(msg.sender);
    }

    /*
     * PUBLIC FUNCTIONS
     */

   function setNormalBuyLimit(uint256 limit)
        public
        initialized
        onlyOwner
        earlierThan(endTime)
    {
        normalBuyLimit = limit;
    }


    /// @dev batch set quota for early user quota
    function setEarlyWhitelistQuotas(address[] users, uint earlyCap, uint openTag)
        public
        onlyOwner
        earlierThan(earlyReserveBeginTime)
    {
        for( uint i = 0; i < users.length; i++) {
            earlyUserQuotas[users[i]] = earlyCap;
            fullWhiteList[users[i]] = openTag;
        }
    }

    /// @dev batch set quota for early user quota
    function setLaterWhiteList(address[] users, uint openTag)
        public
        onlyOwner
        earlierThan(endTime)
    {
        require(saleInProgress());
        for( uint i = 0; i < users.length; i++) {
            fullWhiteList[users[i]] = openTag;
        }
    }

    /// @dev Exchange msg.value ether to WAN for account recepient
    /// @param receipient WAN tokens receiver
    function buyWanCoin(address receipient) 
        public 
        payable 
        notHalted 
        initialized 
        ceilingNotReached 
        notEarlierThan(earlyReserveBeginTime)
        earlierThan(endTime)
        returns (bool) 
    {
    	require(receipient != 0x0);
    	require(msg.value >= 0.1 ether);

        // Do not allow contracts to game the system
        require(!isContract(msg.sender));        

        if( now < startTime && now > earlyReserveBeginTime)
            buyEarlyAdopters(receipient);
    	else {
    		require(msg.value <= normalBuyLimit);
    		buyNormal(receipient);
    	}

    	return true;
    }

    /// @dev Emergency situation that requires contribution period to stop.
    /// Contributing not possible anymore.
    function halt() public onlyWallet{
        halted = true;
    }

    /// @dev Emergency situation resolved.
    /// Contributing becomes possible again withing the outlined restrictions.
    function unHalt() public onlyWallet{
        halted = false;
    }

    /// @dev Emergency situation
    function changeWalletAddress(address newAddress) onlyWallet { 
        wanport = newAddress; 
    }

    /// @return true if sale has started, false otherwise.
    function saleStarted() constant returns (bool) {
        return now >= startTime;
    }

    /// @return true if sale in ended, false otherwise.
    function saleInProgress() constant returns (bool) {
        return now < endTime && openSoldTokens < MAX_OPEN_SOLD;
    }

    /// CONSTANT METHODS
    /// @dev Get current exchange rate
    function priceRate() public constant returns (uint) {
        // Three price tiers
        if (earlyReserveBeginTime <= now && now < startTime + 1 weeks)
            return PRICE_RATE_FIRST;
        if (startTime + 1 weeks <= now && now < startTime + 2 weeks)
            return PRICE_RATE_SECOND;
        if (startTime + 2 weeks <= now && now < endTime)
            return PRICE_RATE_LAST;
        // Should not be called before or after contribution period
        assert(false);
    }

    function claimTokens(address receipent)
        public
        isSaleEnded
    {
        wanToken.claimTokens(receipent);
    }

    /*
     * INTERNAL FUNCTIONS
     */

    /// @dev Buy wanchain tokens for early adopters
    function buyEarlyAdopters(address receipient) internal {
    	uint quotaAvailable = earlyUserQuotas[receipient];
    	require(quotaAvailable > 0);

        uint toFund = quotaAvailable.min256(msg.value);
        uint tokenAvailable4Adopter = quotaAvailable.mul(PRICE_RATE_FIRST);

    	earlyUserQuotas[receipient] = earlyUserQuotas[receipient].sub(toFund);
    	buyCommon(receipient, toFund, tokenAvailable4Adopter);
    }

    /// @dev Buy wanchain token normally
    function buyNormal(address receipient) internal {
        uint inWhiteListTag = fullWhiteList[receipient];
        require(inWhiteListTag > 0);

        // protect partner quota in stage one
        uint tokenAvailable = MAX_OPEN_SOLD.sub(openSoldTokens);
        require(tokenAvailable > 0);

    	uint toFund;
    	uint toCollect;
    	(toFund, toCollect) = costAndBuyTokens(tokenAvailable);
        buyCommon(receipient, toFund, toCollect);
    }

    /// @dev Utility function for bug wanchain token
    function buyCommon(address receipient, uint toFund, uint wanTokenCollect) internal {
        require(msg.value >= toFund); // double check

        if(toFund > 0) {
            require(wanToken.mintToken(receipient, wanTokenCollect));         
            wanport.transfer(toFund);
            openSoldTokens = openSoldTokens.add(wanTokenCollect);
            NewSale(receipient, toFund, wanTokenCollect);            
        }

        uint toReturn = msg.value.sub(toFund);
        if(toReturn > 0) {
            msg.sender.transfer(toReturn);
        }
    }

    /// @dev Utility function for calculate available tokens and cost ethers
    function costAndBuyTokens(uint availableToken) constant internal returns (uint costValue, uint getTokens){
    	// all conditions has checked in the caller functions
    	uint exchangeRate = priceRate();
    	getTokens = exchangeRate * msg.value;

    	if(availableToken >= getTokens){
    		costValue = msg.value;
    	} else {
    		costValue = availableToken / exchangeRate;
    		getTokens = availableToken;
    	}
    }

    /// @dev Internal function to determine if an address is a contract
    /// @param _addr The address being queried
    /// @return True if `_addr` is a contract
    function isContract(address _addr) constant internal returns(bool) {
        uint size;
        if (_addr == 0) return false;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }
}
