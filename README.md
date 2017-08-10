
# Technical definition
* At the technical level wanchain-token is a ERC20-compliant tokens.

# Contracts
	* contracts/ConvertLib.sol				:basic truffle framework 
	* contracts/Migrations.sol				:contract for deploy
	* contracts/Owned.sol					:owner contract
	* contracts/SafeMath.sol				:math support lib
	* contracts/StandardToken.sol			:ERC20 standard contract
	* contracts/WanchainContribution.sol	:wanchain token distribution contract
	* contracts/WanToken.sol				:wanchain token contract


# test

## prequire

### platform ubuntu 16.04
* install node which is lastest version
* install testrpc on test host
* git

### how to test
* start testrpc by command in one terminal:
  + testrpc --account="0xe3fd2ca91fa6f5a3cbded4ef9fb0f367fe68241db40334216cc0ddedf9233e6c,0x1108b2a2c28029094000000"  \
			--account="0x49df0a01c3294d23fe5e5f804e56cd97fba955e4c40872165a5a3fbd87f0dc38,0x18b479fe0d0a5aa80000"  \
			--account="0x9917d8b8e2d6053d1cc75bac6937e5907fb349247ec59b27df64bbe66d128b99,0x1b1ae4d6e2ef5000000"   \
			--account="0x7a82328b56262463c8bed47968fb57e061ba3eff896c650bb92f209188a39648,0x1b1ae4d6e2ef5000000"  \
			--account="0x0ea71999997a0bfff72966d87c581b63432be416f28d8e37af7ef55d73513d18,0x6f05b59d3b200000"     \
			--account="0x346d7d691921319626b9fac8ecc4c110c8019cc1314d04e846e8c4e6107d7532,0xb1a2bc2ec500000"      \
			--account="0xcbec66bc024f8b5dd4d74840c635824a02864c44bedc827b7acd652119993a82,0x0"      \
			--account="0x6bf16efe6d784b328392823dc02b235411e741a363a372fb5f59c4cc81a618de,0x6f05b59d3b200000"     \
			--account="0xfd6709f411ba4a868e6e3cc2663b451549032162a0fd60bcffe8df401f8ad5cd,0x6f05b59d3b200000"     \
			--account="0xd5930e28e598a24ad215f0144bced054184748818788d92acb23e7c48311b62f,0x6f05b59d3b200000" 

* run command in ./wanchain-token folder:
  + sudo truffle compile && truffle test


# deploy

* configure the target network for ethereum in truffle.js,such as the mainnet or rinkeby test network for ethereum, change the from address to your avaible account
* run command in  ./wanchain-token folder to deploy contract on rinkeby test network:
  + truffle migrate --network rinkeby

* run command in  ./wanchain-token folder to deploy contract on main network:
  + truffle migrate --network mainnet

* after deploying the contract,record the contract address, verify the on https://rinkeby.etherscan.io

  
  



