pragma solidity ^0.4.11;

import '../../contracts/WanchainContribution.sol';

contract WanchainContributionMock is WanchainContribution{
	function WanchainContributionMock(address _wanport, uint _startitme
		) WanchainContribution(_wanport, _startitme){

	}

	function setMockedStartTime(uint _startTime){
		startTime = _startTime;
	}

	function setMockedEndTime(uint _endTime){
		endTime = _endTime;
	}

	function setMockedOpenSoldTokens(uint _openSoldTokens){
		openSoldTokens = _openSoldTokens;
	}

	function setMockedPartnerBought(address partnerAddr, uint _partnerBought){
		partnersBought[partnerAddr] = _partnerBought;
	}

	function setMockedPartnerLmit(address partnerAddr, uint _limit){
		partnersLimit[partnerAddr] = _limit;
	}	
}