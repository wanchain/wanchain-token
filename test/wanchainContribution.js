const assert = require('assert');
const BigNumber = require('bignumber.js');
const sha256 = require('js-sha256').sha256;

var WanchainContribution = artifacts.require("./helpers/WanchainContributionMock.sol");
var WanToken = artifacts.require("./WanToken.sol");

/*
currently:testrpc initialize only support account with 10000 ether maximum
command for start testrpc:
testrpc --account="0xe3fd2ca91fa6f5a3cbded4ef9fb0f367fe68241db40334216cc0ddedf9233e6c,0x1108b2a2c28029094000000"  \
        --account="0x49df0a01c3294d23fe5e5f804e56cd97fba955e4c40872165a5a3fbd87f0dc38,0x18b479fe0d0a5aa80000"  \
        --account="0x9917d8b8e2d6053d1cc75bac6937e5907fb349247ec59b27df64bbe66d128b99,0x1b1ae4d6e2ef5000000"   \
        --account="0x7a82328b56262463c8bed47968fb57e061ba3eff896c650bb92f209188a39648,0x1b1ae4d6e2ef5000000"  \
        --account="0x0ea71999997a0bfff72966d87c581b63432be416f28d8e37af7ef55d73513d18,0x6f05b59d3b200000"     \
        --account="0x346d7d691921319626b9fac8ecc4c110c8019cc1314d04e846e8c4e6107d7532,0xb1a2bc2ec500000"      \
        --account="0xcbec66bc024f8b5dd4d74840c635824a02864c44bedc827b7acd652119993a82,0x0"      \
        --account="0x6bf16efe6d784b328392823dc02b235411e741a363a372fb5f59c4cc81a618de,0x6f05b59d3b200000"     \
        --account="0xfd6709f411ba4a868e6e3cc2663b451549032162a0fd60bcffe8df401f8ad5cd,0x6f05b59d3b200000"     \
        --account="0xd5930e28e598a24ad215f0144bced054184748818788d92acb23e7c48311b62f,0x6f05b59d3b200000"     

Address correponding accounts above:
(0) 0xca8f76fd9597e5c0ea5ef0f83381c0635271cd5d
(1) 0x1631447d041f929595a9c7b0c9c0047de2e76186
(2) 0xe442408a5f2e224c92b34e251de48f5266fc38de
(3) 0x38b195d2a18a4e60292868fa74fae619d566111e
(4) 0x806abd0d68515764d36b4b1dce5607f5b8672623
(5) 0xc142b37451bf17a6d3057768d27ed99cc90fb51f
(6) 0xf174d859cabf5e2decb61c023fcb81593ff2e20a
(7) 0xf15e32354fdd171b6dc8ec5528f6e9164b28d21f
(8) 0x26d50e6bdc748c013f2259f70d432c8020f7af23
(9) 0xae5c54ec6d94732cbee9610a7290e6b50d8f395a

Initial balances of input test accounts:

account0 has 20000000 ether
account1 has 116666   ether near 1/3 limit of total;
account2 has 8000     ether
account3 has 8000     ether
account4 has 8        ether 
account5 has 0.8      ether
account6 has 0.1      ether
account7 has 8        ether 
account8 has 8        ether account9 has 8        ether 
*/



function send(method, params, callback) {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }

    web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method,
        params: params || [],
        id: new Date().getTime(),
    }, callback);
}

contract('WanchainContributionMock', (accounts) => {    
    // Solidity constants
    const hours = 3600;
    const weeks = 24 * 7 * hours;
    const years = 52 * weeks;
    const ether = new BigNumber(Math.pow(10, 18));

    // Constant fields
    const WAN_TOTAL_SUPPLY = new BigNumber(210000000).times(ether);
    const EARLY_CONTRIBUTION_DURATION = 24 * hours;
    const MAX_CONTRIBUTION_DURATION = 3 * weeks;

    const PRICE_RATE_FIRST = 880;
    const PRICE_RATE_SECOND = 790;
    const PRICE_RATE_LAST = 750;

    // WanchainContribution constant fields
    const OPEN_SALE_STAKE = 510;  // 
    const DEV_TEAM_STAKE = 200;   //
    const FOUNDATION_STAKE = 190; //
    const MINERS_STAKE = 100;     //

    const DIVISOR_STAKE = 1000;

    const PRESALE_RESERVERED_AMOUNT = new BigNumber(35200000) * ether; 

    // Addresses of Patrons
    const DEV_TEAM_HOLDER = '0xB1EFca62C555b49E67363B48aE5b8Af3C7E3e656';
    const FOUNDATION_HOLDER = '0x00779e0e4c6083cfd26dE77B4dbc107A7EbB99d2';
    const MINERS_HOLDER = '0xDD91615Ea8De94bC48231c4ae9488891F1648dc5';
    const PRESALE_HOLDER = '0x009beAE06B0c0C536ad1eA43D6f61DCCf0748B1f';

    // Wanchain Token constant fields
    const name = 'WanCoin';
    const symbol = 'WAN';
    const decimals = 18;

    const MAX_OPEN_SOLD = WAN_TOTAL_SUPPLY * OPEN_SALE_STAKE / DIVISOR_STAKE - PRESALE_RESERVERED_AMOUNT;


    // Test globals
    let contributionContract;
    let wanContract;

    // // Accounts
    let wanWallet = accounts[6];

    let initalBlockTime;
    const startDelay = 1 * weeks;
    let startTime;
    let endTime;
    const numTestCases = 8;

    const DefaultEarlyQuota = 6;

    const STAGE_BEFOR_EARLYRESERVED = -1;
    const STAGE_EARLY_RESERVED = 0
    const STAGE_1 = 1 ;    
    const STAGE_2 = 2 ;
    const STAGE_3 = 3 ;
    const STAGE_ENDED = 4;

    function wrappedWeb3SendTransaction(obj, showLog) {
        return new Promise( (resolve, reject) => {
            web3.eth.sendTransaction(obj, function(err, result){
                if(showLog){
                    logSeperator();            
                    console.log('err' + err);
                }
                if(err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    function genNextBlock(){
        return new Promise((resolve, reject) => {
              web3.currentProvider.sendAsync({
                jsonrpc: '2.0', 
                method: 'evm_mine',
                params: [],
                id: new Date().getTime()
              }, function(err) {
                if (err) return reject(err);
                resolve();
              });
        });                
    }

    function logSeperator(){
        console.log(
            "\n                            _           _           _              " +
            "\n  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __  " +
            "\n  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /  " +
            "\n   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /   " +
            "\n    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/    "

        );
    }

    //deploy contract and reset related context
    async function resetContractTestEnv() {
        //deploy contract
        latestBlock = await web3.eth.getBlock('latest');
        startTime = latestBlock.timestamp;
        contributionContract = await WanchainContribution.new(wanWallet, startTime);
        contributionContract = WanchainContribution.at(contributionContract.address);
        wanContract = WanToken.at(await contributionContract.wanToken());

        endTime = startTime + (3 * weeks);    
    }

    async function assertWalletReceivedFund(prevBalance, receivedFundInEther){
        var postWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));
        assert.equal(postWalletBalance.sub(prevBalance),  receivedFundInEther);        
    }

    async function assertWalletReceivedFundNearly(prevBalance, receivedFundInEther){
        var postWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));
        assert.ok(postWalletBalance.sub(prevBalance).sub(receivedFundInEther).abs() < 0.01);        
    }


    async function assertUserReceivedLockedToken(addr, prevBalance, receivedTokenInEther, log){
        var postUserTokens = await web3.fromWei(await wanContract.lockedBalanceOf(addr));
        if(log){
            console.log('pre: ' + prevBalance);
            console.log('post: ' + postUserTokens);
            console.log('postUserTokens.sub(prevBalance): ' + postUserTokens.sub(prevBalance));
            console.log('receivedTokenInEther: ' + receivedTokenInEther);
        }
        assert.equal(postUserTokens.sub(prevBalance),  receivedTokenInEther);
    }

    async function mockAddrToEarlyList(addr){
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});        
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime);
    }

    async function mockNowInStage3(){
        earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
        await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime - 2*weeks - EARLY_CONTRIBUTION_DURATION);
        await contributionContract.setMockedStartTime(earlyReserveBeginTime - 2 * weeks - 1* hours);
        await contributionContract.setMockedEndTime(earlyReserveBeginTime - 2 * weeks - 1* hours + 3 * weeks);        
    }
    
    describe('PREPARATIONS', () => {
        before('Check accounts', async() => {
            assert.equal(accounts.length, 10);
        });

        it('Set startTime as now', async function () {
            latestBlock = await web3.eth.getBlock('latest');
            initalBlockTime = latestBlock.timestamp;
            startTime = initalBlockTime + startDelay;
            endTime = startTime + (3 * weeks);
        });
    });

    describe('CONTRIBUTION CONTRACT STATIC CHECK', () => {
        it('Total Stake equal 100', async() => {
            assert.equal(OPEN_SALE_STAKE  + DEV_TEAM_STAKE + FOUNDATION_STAKE + MINERS_STAKE
                , DIVISOR_STAKE);
        });
    });

    describe('CONTRACT DEPLOYMENT', () => {
        it('Deploy WanchainContribution contracts', async() => {
            await resetContractTestEnv();
        });

        it('Check Wanchain Token initialisation', async() => {
            assert.equal(await wanContract.MAX_TOTAL_TOKEN_AMOUNT(), WAN_TOTAL_SUPPLY.toNumber());
        });

        it('Check premined allocation', async() => {
            assert.equal((await wanContract.balanceOf(wanWallet)).toNumber(), 0);
            assert.equal(
                (await wanContract.lockedBalanceOf(DEV_TEAM_HOLDER)).toNumber(),
                WAN_TOTAL_SUPPLY.times(DEV_TEAM_STAKE).div(DIVISOR_STAKE)
            );
            assert.equal(
                (await wanContract.lockedBalanceOf(FOUNDATION_HOLDER)).toNumber(),
                WAN_TOTAL_SUPPLY.times(FOUNDATION_STAKE).div(DIVISOR_STAKE)
            );
            assert.equal(
                (await wanContract.lockedBalanceOf(MINERS_HOLDER)).toNumber(),
                WAN_TOTAL_SUPPLY.times(MINERS_STAKE).div(DIVISOR_STAKE)
            );
        });
    });

    /*
    testing for interface
    */
    // Test suite for public function
    wanWallet = accounts[6];
    describe('TESTING FOR  +Fallback+ ', () => {
        beforeEach(resetContractTestEnv);

        it('earlyReserveBeginTime > now and address not in earlyUserQuotas map', async() => {
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[0]));
            await wrappedWeb3SendTransaction({
                from: accounts[0],
                to:contributionContract.address,
                value: 1 * ether
            }).catch(() => {} );
            assert.equal((await wanContract.lockedBalanceOf(accounts[0])).toNumber(), 0);
            await assertUserReceivedLockedToken(accounts[0], preTokens, 0);
        });
        
        it('earlyReserveBeginTime > now and address in earlyUserQuotas map', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 1000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[1]}).catch(()=> {});
            await wrappedWeb3SendTransaction({
                from: accounts[0],
                to:contributionContract.address,
                value: 1 * ether
            }).catch(() => {} );
            assert.equal((await wanContract.lockedBalanceOf(accounts[0])).toNumber(), 0);
        });

        it('earlyReserveBeginTime <= now < startTime and address not in whitelist map', async() => {
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: 1 * ether
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });        

        it('earlyReserveBeginTime <= now < startTime and address  in fullwhitelist map but not in earlyUserQuotas', async() => {
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setLaterWhiteList(accounts, 1, {from: accounts[0]});
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });        


        it('earlyReserveBeginTime <= now < startTime and address in earlyUserQuotas map and msg.value < minimum eth for tx', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            // console.log((await wanContract.lockedBalanceOf(accounts[3])).toNumber());
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime);

            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            console.log('preTokens:' + preTokens);        
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(0.031)
            }).catch(() => {});            
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);

            await assertWalletReceivedFund(preTxWalletBalance, 0);
            assert.equal(web3.fromWei(await contributionContract.earlyUserQuotas(accounts[3])), DefaultEarlyQuota);
        });        


        it('earlyReserveBeginTime <= now < startTime and address in earlyUserQuotas map and msg.value < DefaultEarlyQuota', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            // console.log((await wanContract.lockedBalanceOf(accounts[3])).toNumber());
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime);

            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            console.log('preTokens:' + preTokens);        
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(1.031)
            });            
            await assertUserReceivedLockedToken(accounts[3], preTokens, 1.031 * PRICE_RATE_FIRST);

            await assertWalletReceivedFund(preTxWalletBalance, 1.031);
            var remainCap = DefaultEarlyQuota - 1.031;
            assert.equal(web3.fromWei(await contributionContract.earlyUserQuotas(accounts[3])), remainCap);
        });        

        it('earlyReserveBeginTime <= now < startTime and address in earlyUserQuotas map and msg.value > DefaultEarlyQuota', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime);

            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[1]));
            // console.log('preTxWalletBalance:' + preTxWalletBalance);        
            await wrappedWeb3SendTransaction({
                from: accounts[1],
                to:contributionContract.address,
                value: (DefaultEarlyQuota + 1) * ether,
                gas: 120000
            });
            await assertUserReceivedLockedToken(accounts[1], preTokens, DefaultEarlyQuota * PRICE_RATE_FIRST);

            await assertWalletReceivedFund(preTxWalletBalance, DefaultEarlyQuota);
            assert.equal(web3.fromWei(await contributionContract.earlyUserQuotas(accounts[1])), 0);
        });        

        it('earlyReserveBeginTime <= now < startTime and address in earlyUserQuotas map and  [msg.value + ...] >  DefaultEarlyQuota', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime);

            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[1]));
            // console.log('preTxWalletBalance:' + preTxWalletBalance);        
            await wrappedWeb3SendTransaction({
                from: accounts[1],
                to:contributionContract.address,
                value: ether.mul(1.2093),
                gas: 120000
            });
            await wrappedWeb3SendTransaction({
                from: accounts[1],
                to:contributionContract.address,
                value: ether.mul(1.2093),
                gas: 120000
            });

            await wrappedWeb3SendTransaction({
                from: accounts[1],
                to:contributionContract.address,
                value: ether.mul(5.2093),
                gas: 120000
            });

            await assertUserReceivedLockedToken(accounts[1], preTokens, DefaultEarlyQuota * PRICE_RATE_FIRST);

            await assertWalletReceivedFund(preTxWalletBalance, DefaultEarlyQuota);
            assert.equal(web3.fromWei(await contributionContract.earlyUserQuotas(accounts[1])), 0);
        });          

        it('startTime <= now < Stage1End and address not in fullwhitelist map', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime - 1000);
            await contributionContract.setMockedStartTime(earlyReserveBeginTime - 900);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: 1 * ether
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('startTime <= now < Stage1End and enrolled from earlyUserQuotas' + 
            '&&  required minimum > msg.value', async() => {

            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * hours);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(0.05)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('startTime <= now < Stage1End and enrolled from earlyUserQuotas' + 
            '&&  required maximum < msg.value', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * hours);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(65.01)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('startTime <= now < Stage1End and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && available tokens enough', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * hours);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(65)
            }).catch(() => {});
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(1)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(PRICE_RATE_FIRST).mul(25.327+65+1).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 25.327+65+1);
        });    

        it('startTime <= now < Stage1End and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && available tokens partial', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * hours);
            await contributionContract.setMockedOpenSoldTokensRemain(12345);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(12345).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 12345/PRICE_RATE_FIRST);
            await assert.equal(web3.fromWei(await contributionContract.openSoldTokens()).sub( 
                web3.fromWei(await contributionContract.MAX_OPEN_SOLD())), 0);            
        });            

        it('startTime <= now < Stage1End and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && none available tokens', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * hours);
            await contributionContract.setMockedOpenSoldTokensRemain(0);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(0).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 0);
        });            

        it('Stage1End <= now < Stage2End and address not in fullwhitelist map', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime - 1*weeks - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(earlyReserveBeginTime - 1 * weeks - 1* hours);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: 1 * ether
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('Stage1End <= now < Stage2End and enrolled from earlyUserQuotas' + 
            '&&  required minimum > msg.value', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime - 1*weeks - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(earlyReserveBeginTime - 1 * weeks - 1* hours);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(0.05)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('Stage1End <= now < Stage2End and enrolled from earlyUserQuotas' + 
            '&&  required maximum < msg.value', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - 1*weeks - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * weeks - 1* hours);
            await contributionContract.setMockedEndTime(nearNow - 1 * weeks - 1* hours + 3 * weeks);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(65.01)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('Stage1End <= now < Stage2End and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && available tokens enough', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - 1*weeks - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * weeks - 1* hours);
            await contributionContract.setMockedEndTime(nearNow - 1 * weeks - 1* hours + 3 * weeks);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(65)
            }).catch(() => {});
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(1)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(PRICE_RATE_SECOND).mul(25.327+65+1).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 25.327+65+1);
        });    

        it('Stage1End <= now < Stage2End and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && available tokens partial', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - 1*weeks - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * weeks - 1* hours);
            await contributionContract.setMockedEndTime(nearNow - 1 * weeks - 1* hours + 3 * weeks);
            await contributionContract.setMockedOpenSoldTokensRemain(12345);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(12345).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 12345/PRICE_RATE_SECOND);
            await assert.equal(web3.fromWei(await contributionContract.openSoldTokens()).sub( 
                web3.fromWei(await contributionContract.MAX_OPEN_SOLD())), 0);            
        });            

        it('Stage1End <= now < Stage2End and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && none available tokens', async() => {
            earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
            await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 100000);
            await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});

            latestBlock = await web3.eth.getBlock('latest');
            nearNow = latestBlock.timestamp;
            await contributionContract.setMockedEarlyReserveBeginTime(nearNow - 1*weeks - EARLY_CONTRIBUTION_DURATION);
            await contributionContract.setMockedStartTime(nearNow - 1 * weeks - 1* hours);
            await contributionContract.setMockedEndTime(nearNow - 1 * weeks - 1* hours + 3 * weeks);
            await contributionContract.setMockedOpenSoldTokensRemain(0);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(0).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 0);
        });            

        //////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////
        it('Stage2End < now < =TotalEnd and address not in fullwhitelist map', async() => {
            await mockNowInStage3();

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: 1 * ether
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('Stage2End <= now < TotalEnd and enrolled from earlyUserQuotas' + 
            '&&  required minimum > msg.value', async() => {
            await mockAddrToEarlyList(accounts[3]);
            await mockNowInStage3();

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(0.05)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('Stage2End <= now < TotalEnd and enrolled from earlyUserQuotas' + 
            '&&  required maximum < msg.value', async() => {
            await mockAddrToEarlyList(accounts[3]);
            await mockNowInStage3();

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(65.01)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, 0);
        });    

        it('Stage2End <= now < TotalEnd and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && available tokens enough', async() => {
            await mockAddrToEarlyList(accounts[3]);
            await mockNowInStage3();                

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(65)
            }).catch(() => {});
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(1)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(PRICE_RATE_LAST).mul(25.327+65+1).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 25.327+65+1);
        });    

        it('Stage2End <= now < TotalEnd and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && available tokens partial', async() => {
            await mockAddrToEarlyList(accounts[3]);
            await mockNowInStage3();
            await contributionContract.setMockedOpenSoldTokensRemain(12345);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet)); 
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.37)
            }).catch(() => {});

            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(12345).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 12345/PRICE_RATE_LAST);
            await assert.equal(web3.fromWei(await contributionContract.openSoldTokens()).sub( 
                web3.fromWei(await contributionContract.MAX_OPEN_SOLD())), 0);
        });            

        it('Stage2End <= now < TotalEnd and enrolled from earlyUserQuotas' + 
            '&& 0.1eth <= msg.value <= 65eth && none available tokens', async() => {
            await mockAddrToEarlyList(accounts[3]);
            await mockNowInStage3();                
            await contributionContract.setMockedOpenSoldTokensRemain(0);

            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(0).toNumber(), true);
            await assertWalletReceivedFund(preTxWalletBalance, 0);
        });            
    });

    describe('ClaimTokens', () => {
        beforeEach(resetContractTestEnv);

        it('ClaimTokens before sold out', async() => {
            await mockAddrToEarlyList(accounts[3]);
            await mockNowInStage3();                
            var priceRate = await contributionContract.priceRate();
            var preTokens = await web3.fromWei(await wanContract.lockedBalanceOf(accounts[3]));
            var preTxWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));    
            await wrappedWeb3SendTransaction({
                from: accounts[3],
                to:contributionContract.address,
                value: ether.mul(25.327)
            }).catch(() => {});
            await assertUserReceivedLockedToken(accounts[3], preTokens, new BigNumber(priceRate.toNumber()).mul(25.327).toNumber(), true);            
        });
    });

    /*
    testing for wallet interface
    */
    wanWallet = accounts[2];
    describe('Emergency test', () => {
        beforeEach(resetContractTestEnv);

        it('halt the ico', async() => {
            await contributionContract.halt({from: wanWallet});
            assert.ok(await contributionContract.halted());
        });

        it('shouldn\'t halt the ico ', async() => {
            await contributionContract.halt({from: accounts[3]}).catch(() => {});
            assert.ok(!(await contributionContract.halted()));
        });        

        it('unhalt the ico', async() => {
            //pre
            await contributionContract.halt({from: wanWallet});
            //action
            await contributionContract.unHalt({from: wanWallet});
            assert.ok(!(await contributionContract.halted()));
        });        
    });

    describe('CHANGE WALLET ADDRESS', () => {
        beforeEach(resetContractTestEnv);

        it('changeWalletAddress', async() => {
            await contributionContract.changeWalletAddress(accounts[1], {from: wanWallet});
            var newWallet = await contributionContract.wanport();
            assert.equal(newWallet, accounts[1]);
        });        

        it('changeWalletAddress', async() => {
            await contributionContract.changeWalletAddress(accounts[1], {from: accounts[3]}).catch(() => {});
            var newWallet = await contributionContract.wanport();
            assert.equal(newWallet, wanWallet);
        });                
    });


    /*
    testing for deployer/owner interface
   setNormalBuyLimit
   setEarlyWhitelistQuotas
   setLaterWhiteList    
    */
  describe('TESTING setEarlyWhitelistQuotas', () => {
    beforeEach(resetContractTestEnv);

    it('from owner, before ico boot time', async() => {  
      earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
      await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 1000);
      await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[0]});
      quota = await contributionContract.earlyUserQuotas(accounts[2]);      
      assert.equal(web3.fromWei(quota.toNumber()), DefaultEarlyQuota);
      inWhiteListTag = await contributionContract.fullWhiteList(accounts[2]);
      assert.ok(inWhiteListTag > 0);
    });

    it('call not from owner', async() => {
      //if interface not call from owner, do nothing
      earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
      await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime + 1000);      
      await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[1]}).catch(()=> {});
      quota = await contributionContract.earlyUserQuotas(accounts[2]);      
      assert.equal(web3.fromWei(quota.toNumber()), 0);
      inWhiteListTag = await contributionContract.fullWhiteList(accounts[2]);
      assert.equal(inWhiteListTag, 0);
    });

    it('from owner, after ico boot time', async() => {  
      earlyReserveBeginTime = await contributionContract.earlyReserveBeginTime();
      await contributionContract.setMockedEarlyReserveBeginTime(earlyReserveBeginTime - 1000);              
      await contributionContract.setEarlyWhitelistQuotas(accounts, web3.toWei(DefaultEarlyQuota, 'ether'), 1, {from: accounts[1]}).catch(()=> {});
      quota = await contributionContract.earlyUserQuotas(accounts[2]);      
      assert.equal(web3.fromWei(quota.toNumber()), 0);
      inWhiteListTag = await contributionContract.fullWhiteList(accounts[2]);
      assert.equal(inWhiteListTag, 0);
    });
  });

  describe('TESTING setLaterWhiteList', () => {
    beforeEach(resetContractTestEnv);

    it('from owner, before end  time', async() => {  
      await contributionContract.setLaterWhiteList(accounts, 1, {from: accounts[0]});
      inWhiteListTag = await contributionContract.fullWhiteList(accounts[2]);
      assert.ok(inWhiteListTag > 0);
    });

    it('call not from owner', async() => {
      //if interface not call from owner, do nothing
      await contributionContract.setLaterWhiteList(accounts, 1, {from: accounts[1]}).catch(() => {});
      inWhiteListTag = await contributionContract.fullWhiteList(accounts[2]);
      assert.equal(inWhiteListTag, 0);
    });
  });


  describe('TESTING setNormalBuyLimit,default is 65 eth', () => {
    beforeEach(resetContractTestEnv);

    it('from owner', async() => {
      //default is 65 ether
      var limit = await contributionContract.normalBuyLimit();
      assert.equal(web3.fromWei(limit.toNumber()), 65);


      //set buy limit is 2 ether
      await contributionContract.setNormalBuyLimit(web3.toWei(2, 'ether'), {from: accounts[0]}).catch(() => {});
      limit = await contributionContract.normalBuyLimit();
      assert.equal(web3.fromWei(limit.toNumber()), 2);
    });

    it('call not from owner', async() => {
      //if interface not call from owner, do nothing
      await contributionContract.setNormalBuyLimit(web3.toWei(2, 'ether'), {from: accounts[1]}).catch(() => {});
      limit = await contributionContract.normalBuyLimit();
      assert.equal(web3.fromWei(limit.toNumber()), 65);      
    });
  });

});

