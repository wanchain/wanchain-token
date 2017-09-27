pragma solidity ^0.4.11;

import '../../contracts/WanchainContribution.sol';

contract WanchainContributionMock is WanchainContribution{
	function WanchainContributionMock(address _wanport, uint _startitme
		) WanchainContribution(_wanport, _startitme){

	}

	function setMockedEarlyReserveBeginTime(uint ts){
		earlyReserveBeginTime = ts;
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

    function setMockedMaxOpenSoldTokens(uint _maxopenSoldTokens){
        MAX_OPEN_SOLD = _maxopenSoldTokens;
    }
}