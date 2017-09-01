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
account8 has 8        ether 
account9 has 8        ether 
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

    // WanchainContribution constant fields
    const OPEN_SALE_STAKE = 459;  // 45% for open sale
    const PRESALE_STAKE = 51;     // 6%  for presale
    const DEV_TEAM_STAKE = 200;   //
    const FOUNDATION_STAKE = 190; //
    const MINERS_STAKE = 100;     //

    const DIVISOR_STAKE = 1000;

    const PRESALE_HOLDER = '0x009beAE06B0c0C536ad1eA43D6f61DCCf0748B1f';

    // Addresses of Patrons
    const DEV_TEAM_HOLDER = '0xB1EFca62C555b49E67363B48aE5b8Af3C7E3e656';
    const FOUNDATION_HOLDER = '0x00779e0e4c6083cfd26dE77B4dbc107A7EbB99d2';
    const MINERS_HOLDER = '0xDD91615Ea8De94bC48231c4ae9488891F1648dc5';

    // Constant fields
    const WAN_TOTAL_SUPPLY = new BigNumber(210000000).times(ether);

    // Wanchain Token constant fields
    const name = 'WanCoin';
    const symbol = 'WAN';
    const decimals = 18;

    const PRICE_RATE_FIRST = 880;
    const PRICE_RATE_SECOND = 790;
    const PRICE_RATE_LAST = 750;

    const MAX_TOTAL_TOKEN_AMOUNT = new BigNumber(210000000).times((new BigNumber(Math.pow(10, decimals)))); // Max amount of total tokens raised during all contributions (includes stakes of patrons)


    // Test globals
    let contributionContract;
    let wanContract;
    let testCases;

    // // Accounts
    const wanWallet = accounts[6];

    let initalBlockTime;
    const startDelay = 1 * weeks;
    let startTime;
    let endTime;
    const numTestCases = 8;

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

    function jumpTimeInterval(s){
        return new Promise((resolve, reject) => {
              web3.currentProvider.sendAsync({
                jsonrpc: '2.0', 
                method: 'evm_increaseTime',
                params: [s],
                id: new Date().getTime()
              }, function(err) {
                if (err) return reject(err);
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

    function resetTestCases(){
        testCases = [];
        for (i = 0; i < numTestCases; i += 1) {
            const timeSpacing = (endTime - startTime) / numTestCases;
            const blockTime = Math.round(startTime + (i * timeSpacing));
            let expectedPrice;
            if (blockTime >= startTime && blockTime < startTime + (1 * weeks)) {
                expectedPrice = PRICE_RATE_FIRST;
            } else if (blockTime >= startTime + (1 * weeks) && blockTime < startTime + (2 * weeks)) {
                expectedPrice = PRICE_RATE_SECOND;
            } else if (blockTime >= startTime + (2 * weeks) && blockTime < endTime) {
                expectedPrice = PRICE_RATE_LAST;
            } else {
                expectedPrice = 600;
            }
            const accountNum = 0;
            const account = accounts[accountNum];
            testCases.push({
                accountNum,
                blockTime,
                timeSpacing,
                amountToBuy: web3.toWei(2, 'ether'),
                expectedPrice,
                account,
            });            
        }        
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
        resetTestCases();    
    }
    
    async function timesFlyOver(s) {
        await jumpTimeInterval(s);
        await genNextBlock();        
    }

    async function timesJump(s){
        await jumpTimeInterval(s);
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
            assert.equal(OPEN_SALE_STAKE + PRESALE_STAKE + DEV_TEAM_STAKE + FOUNDATION_STAKE + MINERS_STAKE
                , DIVISOR_STAKE);
        });
    });

    describe('CONTRACT DEPLOYMENT', () => {
        it('Deploy WanchainContribution contracts', async() => {
            await resetContractTestEnv();
        });

        it('Check Wanchain Token initialisation', async() => {
            assert.equal(await wanContract.MAX_TOTAL_TOKEN_AMOUNT(), MAX_TOTAL_TOKEN_AMOUNT.toNumber());
        });

        it('Check premined allocation', async() => {
            assert.equal((await wanContract.balanceOf(wanWallet)).toNumber(), 0);
            assert.equal(
                (await wanContract.lockedBalanceOf(PRESALE_HOLDER)).toNumber(),
                WAN_TOTAL_SUPPLY.times(PRESALE_STAKE).div(DIVISOR_STAKE)
            );
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

    // Test suite for public function
    describe('TESTING FOR  +buyWanCoin+ out of ICO period', () => {
        beforeEach(resetContractTestEnv);

        it('Before ICO', async() => {
            //pre
            await contributionContract.setMockedStartTime(startTime + 1 * hours);
            const testCase = testCases[0];
            await contributionContract.buyWanCoin(testCase.account, {
                from: testCase.account,
                value: testCase.amountToBuy
            }).catch(() => {});

            assert.equal((await wanContract.balanceOf(testCase.account)).toNumber(), 0);
        });

        it('After ICO', async() => {
            await timesFlyOver(endTime - startTime);

            const testCase = testCases[0];
            await contributionContract.buyWanCoin(testCase.account, {
                from: testCase.account,
                value: testCase.amountToBuy
            })
                .catch(() => {
                });
            assert.equal((await wanContract.balanceOf(testCase.account)).toNumber(), 0);
        }); 
    });

    //
    describe('TESTING FOR  +buyWanCoin+ in ICO period', () => {
        beforeEach(resetContractTestEnv);
        it('buy ether < 0.1 ', async() => {
            const testCase = testCases[0];
            await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(0.09,'ether')})
                .catch(() => {});
            var desiredWancoinBalance = new BigNumber(0);
            var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
            assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);
        });


        it('total buy available > willing buy && buy from normal ', async() => {
            const testCase = testCases[0];
            var   preTxWalletBalance = await web3.eth.getBalance(wanWallet);

            await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:testCase.amountToBuy, gas: 1000000});
            var desiredWancoinBalance = new BigNumber(testCase.amountToBuy).times(testCase.expectedPrice);
            var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
            assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);
            assert.equal(new BigNumber(testCase.amountToBuy).toNumber() + preTxWalletBalance.toNumber(), 
                (await web3.eth.getBalance(wanWallet)).toNumber());
        });

        it('total buy available > willing buy && buy from partner &&  willing buy <= specified partner available',
            async() => {
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 1;
                var   preTxWalletBalance = await web3.eth.getBalance(wanWallet);
                // pre
                await contributionContract.setPartnerQuota(testCase.account, new BigNumber(expectedPrice * 2 * ether), {from: accounts[0]});
                //action
                await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(buyEther, 'ether')});
                //post
                var desiredWancoinBalance =  ether.times(buyEther).times(expectedPrice);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());
                assert.equal(actualWancoinBalance.plus(preTxWalletBalance.times(expectedPrice)).toNumber(), 
                    (await web3.eth.getBalance(wanWallet)).times(expectedPrice).toNumber());
        });

        it('total buy available > willing buy && buy from partner &&  willing buy > specified partner available',
            async() => {
                var   preTxWalletBalance = await web3.eth.getBalance(wanWallet);
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 4;
                var quotaEther = 2;
                // pre
                await contributionContract.setPartnerQuota(testCase.account, new BigNumber(expectedPrice * quotaEther * ether),{from: accounts[0]});
                //action
                await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(buyEther, 'ether')});
                //post
                var desiredWancoinBalance = ether.times(quotaEther).times(expectedPrice);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());

                assert.equal((actualWancoinBalance.toNumber() + preTxWalletBalance.toNumber()*expectedPrice).toString().substr(0,8),
                  ((await web3.eth.getBalance(wanWallet)).toNumber() *expectedPrice).toString().substr(0,8));
        });

        it('total buy available < willing buy && buy from normal',
            async() => {
                var   preTxWalletBalance = await web3.eth.getBalance(wanWallet);
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 5;

                // pre
                await contributionContract.setMockedOpenSoldTokens((2100000* 45.9-1000) * ether, {from: accounts[0]});
                var testEther = new BigNumber(1000).div(expectedPrice);                
                //action
                await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(buyEther, 'ether')});
                //post
                //var desiredWancoinBalance = ether.times(expectedPrice).times(testEther);
                var desiredWancoinBalance = ether.times(expectedPrice).times(buyEther);
                console.log("expectedPrice="+ expectedPrice);
                console.log("desire="+desiredWancoinBalance.toNumber().toString())

                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                console.log("actual="+actualWancoinBalance.toNumber().toString())

                assert.equal(actualWancoinBalance.toNumber().toString().substr(0,8), desiredWancoinBalance.toNumber().toString().substr(0,8));
				
                assert.equal((actualWancoinBalance.toNumber() + preTxWalletBalance.toNumber()*expectedPrice).toString().substr(0,8),
                  ((await web3.eth.getBalance(wanWallet)).toNumber() * expectedPrice).toString().substr(0,8));
        });

        it('total buy available < willing buy && buy from partner && partner has remain quota',
            async() => {
                var   preTxWalletBalance = await web3.eth.getBalance(wanWallet);
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 5;

                // pre
                await contributionContract.setMockedOpenSoldTokens((2100000* 45-1000) * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerLmit(testCase.account, 2000 * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerBought(testCase.account, 1200 * ether, {from: accounts[0]});
                partnerAvailable = 800;

                //action
                await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(buyEther, 'ether')});
                //post
                var desiredWancoinBalance = ether.times(partnerAvailable);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());

                assert.equal((actualWancoinBalance.toNumber() + preTxWalletBalance.toNumber()*expectedPrice).toString().substr(0,8),
                  ((await web3.eth.getBalance(wanWallet)).toNumber() * expectedPrice).toString().substr(0,8));                
        });

        it('total buy available < willing buy && buy from partner && partner has sold out',
            async() => {
                var   preTxWalletBalance = await web3.eth.getBalance(wanWallet);
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 5;

                // pre
                await contributionContract.setMockedOpenSoldTokens((2100000* 45-1000) * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerLmit(testCase.account, 2000 * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerBought(testCase.account, 2000 * ether, {from: accounts[0]});
                partnerAvailable = 0;

                //action
                await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(buyEther, 'ether')})
                .catch(() => {})
                //post
                var desiredWancoinBalance = partnerAvailable * ether;
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);
                assert.equal(preTxWalletBalance.toNumber(), 
                    (await web3.eth.getBalance(wanWallet)).toNumber());
        });        
    });

    // Test suite for public function
    describe('TESTING FOR  +Fallback+ out of ICO period', () => {
        beforeEach(resetContractTestEnv);

        it('Before ICO', async() => {
            const testCase = testCases[0];
            await wrappedWeb3SendTransaction({
                from: testCase.account,
                value: testCase.amountToBuy
            })
            assert.equal((await wanContract.balanceOf(testCase.account)).toNumber(), 0);
        });

        it('After ICO', async() => {
            await timesFlyOver(endTime - startTime);

            const testCase = testCases[0];
            await wrappedWeb3SendTransaction({
                from: testCase.account,
                value: testCase.amountToBuy
            });
            assert.equal((await wanContract.balanceOf(testCase.account)).toNumber(), 0);
        }); 
    });

    //
    describe('TESTING FOR  +Fallback+ in ICO period', () => {
        beforeEach(resetContractTestEnv);

        it('buy ether < 0.1 ', async() => {
            const testCase = testCases[0];
            await wrappedWeb3SendTransaction({from:testCase.account, value:web3.toWei(0.09,'ether')})
                .catch(() => {});
            var desiredWancoinBalance = new BigNumber(0);
            var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
            assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());
        });


        it('total buy available > willing buy && buy from normal ', async() => {
            const testCase = testCases[0];
            await wrappedWeb3SendTransaction({from:testCase.account, to:contributionContract.address, value:testCase.amountToBuy, gas:1000000}, true);
            var desiredWancoinBalance = new BigNumber(testCase.amountToBuy).times(testCase.expectedPrice);
            var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
            assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());

            //ethBalance = await web3.eth.getBalance(testCases[0].account);
            //console.log(web3.fromWei(ethBalance.toNumber()));
        });

        it('total buy available > willing buy && buy from partner &&  willing buy <= specified partner available',
            async() => {
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 1;
                // pre
                await contributionContract.setPartnerQuota(accounts[0], new BigNumber(expectedPrice * 2 * ether), {from: accounts[0]});
                //action
                await wrappedWeb3SendTransaction({from:testCase.account, to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas:1000000});
                //post
                var desiredWancoinBalance = new BigNumber(buyEther * ether).times(expectedPrice);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());
        });

        it('total buy available > willing buy && buy from partner &&  willing buy > specified partner available',
            async() => {
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 4;
                var quotaEther = 2;
                // pre
                await contributionContract.setPartnerQuota(testCase.account, new BigNumber(expectedPrice * quotaEther * ether), {from: accounts[0]});
                //action
                await wrappedWeb3SendTransaction({from:testCase.account, to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas:1000000});
                //post
                var desiredWancoinBalance = new BigNumber(quotaEther * ether).times(expectedPrice);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());
        });

        it('total buy available < willing buy && buy from normal',
            async() => {
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 5;

                // pre
                await contributionContract.setMockedOpenSoldTokens((2100000* 45-1000) * ether, {from: accounts[0]});
                var testEther = new BigNumber(1000).div(expectedPrice);                
                //action
                await wrappedWeb3SendTransaction({from:testCase.account, to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas: 1000000});
                //post
                var desiredWancoinBalance = ether.times(expectedPrice).times(buyEther);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber().toString().substr(0,8), desiredWancoinBalance.toNumber().toString().substr(0,8));
        });

        it('total buy available < willing buy && buy from partner && partner has remain quota',
            async() => {
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 5;

                // pre
                await contributionContract.setMockedOpenSoldTokens((2100000* 45-1000) * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerLmit(testCase.account, 2000 * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerBought(testCase.account, 1200 * ether, {from: accounts[0]});
                partnerAvailable = 800;

                //action
                await wrappedWeb3SendTransaction({from:testCase.account, to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas: 1000000});
                //post
                var desiredWancoinBalance = ether.times(partnerAvailable);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());
        });

        it('total buy available < willing buy && buy from partner && partner has sold out',
            async() => {
                const testCase = testCases[0];
                var expectedPrice = testCase.expectedPrice;
                var buyEther = 5;

                // pre
                await contributionContract.setMockedOpenSoldTokens((2100000* 45-1000) * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerLmit(testCase.account, 2000 * ether, {from: accounts[0]});
                await contributionContract.setMockedPartnerBought(testCase.account, 2000 * ether, {from: accounts[0]});
                partnerAvailable = 0;

                //action
                await wrappedWeb3SendTransaction({from:testCase.account, to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas: 1000000})
                    .catch(() => {});
                //post
                var desiredWancoinBalance = ether.times(partnerAvailable);
                var actualWancoinBalance = await wanContract.lockedBalanceOf(testCase.account);
                assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());
        });        
    });

    // Test suite for public function
    describe('TESTING FOR  +setPartnerQuota+', () => {
        beforeEach(resetContractTestEnv);

        it('During ICO', async() => {
            const testCase = testCases[0];
            await contributionContract.setPartnerQuota(testCase.account, 100000* ether, {from: accounts[0]}).catch(() => {});
            var limit = await  contributionContract.partnersLimit(testCase.account);
            assert.equal(web3.fromWei(limit.toNumber()), 100000);
        });

        it('After ICO', async() => {
            await timesFlyOver(endTime - startTime);
            const testCase = testCases[0];
            await contributionContract.setMockedEndTime(endTime - 1 * hours);
            await contributionContract.setPartnerQuota(testCase.account, 100000* ether, {from: accounts[0]}).catch(() => {});
            var limit = await  contributionContract.partnersLimit(testCase.account);
            assert.equal(web3.fromWei(limit.toNumber()), 0);
        });        

  });

    describe('Emergency test', () => {
        beforeEach(resetContractTestEnv);

        it('halt the ico', async() => {
            await contributionContract.halt({from: wanWallet});
            assert.ok(await contributionContract.halted());
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
    });

    describe('Test Token Contract: +claimTokens + transfer', () => {
        beforeEach(resetContractTestEnv);

        it('Before ICO', async() => {
            const testCase = testCases[0];
            await contributionContract.setMockedStartTime(startTime + 1 * hours);
            await contributionContract.claimTokens(testCase.account).catch(() => {});
            var actualWancoinBalance = await wanContract.balanceOf(testCase.account);
            assert.equal(web3.fromWei(actualWancoinBalance.toNumber()), 0);
        });

        it('After ICO started', async() => {
            const testCase = testCases[0];
            await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(1, 'ether')});
            //post
            var desiredWancoinBalance = 0 * ether.times(testCase.expectedPrice);
            await contributionContract.claimTokens(testCase.account, {from:testCase.account}).catch(() => {});
            var actualWancoinBalance = await wanContract.balanceOf(testCase.account)
            assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);

            //ICO closed
            await timesFlyOver(endTime - startTime  + 1000);
            desiredWancoinBalance = 1 * ether.times(testCase.expectedPrice);
            await contributionContract.claimTokens(testCase.account, {from:testCase.account});
            actualWancoinBalance = await wanContract.balanceOf(testCase.account);
            assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);

            // transfer
            await wanContract.transfer(accounts[1], 8 * ether, {from: testCase.account});
            actualWancoinBalance = await wanContract.balanceOf(accounts[1]);
            assert.equal(actualWancoinBalance.toNumber(), 8 * ether);
        });

    });


    // Test suite for public function
    describe('TESTING FOR  +setPartnerQuota+ test limit', () => {
      beforeEach(resetContractTestEnv);

      it('During ICO', async() => {
        const testCase = testCases[0];

        await contributionContract.setMockedOpenSoldTokens((10000) * ether, {from: accounts[0]});
        await contributionContract.setPartnerQuota(testCase.account, 1000* ether, {from: accounts[0]}).catch(() => {});
        var limit = await  contributionContract.partnersLimit(testCase.account);
        assert.equal(web3.fromWei(limit.toNumber()), 1000);

        var partnerReservedSum = await contributionContract.partnerReservedSum();
        assert.equal(web3.fromWei(partnerReservedSum.toNumber()), 1000);
      });
    });


  // Test suite for public function
  describe('TESTING FOR  +setPartnerQuota+ test limit and failed buynormal ', () => {
    beforeEach(resetContractTestEnv);

    it('During ICO', async() => {
      const testCase = testCases[0];
      const testCase1 = testCases[1];
      var buyEther = 5;
      var expectedPrice = 880;


     // await contributionContract.setMockedOpenSoldTokens((2100000* 45) * ether, {from: accounts[0]});
      await contributionContract.setPartnerQuota(testCase.account, (2100000 * 15)* ether, {from: accounts[0]}).catch(() => {});
      //partiner 1/3
      var limit = await  contributionContract.partnersLimit(testCase.account);
      assert.equal(web3.fromWei(limit.toNumber()), (2100000* 15));
      //normal sell 2/3
      await contributionContract.setMockedNormalSoldTokens((2100000* 30.9) * ether, {from: accounts[0]});


      var partnerReservedSum = await contributionContract.partnerReservedSum();
      assert.equal(web3.fromWei(partnerReservedSum.toNumber()), (2100000* 15));

      await wrappedWeb3SendTransaction({from:accounts[1], to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas: 1000000}).catch(() => {});

      //post,can not buy anymore
      var desiredWancoinBalance = new BigNumber(0);
      var actualWancoinBalance = await wanContract.lockedBalanceOf(accounts[1]);

      assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());

    });
  });


  // Test suite for public function
  describe('TESTING FOR  +setPartnerQuota+ test limit and success buynormal ', () => {
    beforeEach(resetContractTestEnv);

    it('During ICO', async() => {
      const testCase = testCases[0];
      var buyEther = 5;
      var expectedPrice = 880;


     // await contributionContract.setMockedOpenSoldTokens((2100000* 45 - 1000) * ether, {from: accounts[0]});
      await contributionContract.setPartnerQuota(testCase.account, (2100000* 15)* ether, {from: accounts[0]}).catch(() => {});
      //partiner 1/3
      var limit = await  contributionContract.partnersLimit(testCase.account);
      assert.equal(web3.fromWei(limit.toNumber()), (2100000* 15));

      var partnerReservedSum = await contributionContract.partnerReservedSum();
      assert.equal(web3.fromWei(partnerReservedSum.toNumber()), (2100000* 15));

      await wrappedWeb3SendTransaction({from:accounts[1], to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas: 1000000}).catch(() => {});

      //post,can not buy anymore
      var desiredWancoinBalance = ether.times(expectedPrice).times(buyEther);
      var actualWancoinBalance = await wanContract.lockedBalanceOf(accounts[1]);

      assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());

    });
  });


  describe('TESTING FOR + set MAX_BUY_LIMIT_ONE_TIME,default is 60 eth', () => {
    beforeEach(resetContractTestEnv);

    it('During ICO', async() => {
      const testCase = testCases[0];
      const testCase1 = testCases[1];
      var buyEther = 5;
      var expectedPrice = 880;

      //default is 60 ether
      var limit = await contributionContract.normalBuyLimit();
      assert.equal(web3.fromWei(limit.toNumber()), 65);


      //set buy limit is 2 ether
      await contributionContract.setNormalBuyLimit(web3.toWei(2, 'ether'), {from: accounts[0]}).catch(() => {});
      limit = await contributionContract.normalBuyLimit();
      assert.equal(web3.fromWei(limit.toNumber()), 2);

      await wrappedWeb3SendTransaction({from:accounts[1], to:contributionContract.address, value:web3.toWei(buyEther, 'ether'), gas: 1000000}).catch(() => {});

      //post,can not buy anymore
      var desiredWancoinBalance = new BigNumber(0);//ether.times(expectedPrice).times(buyEther);
      var actualWancoinBalance = await wanContract.lockedBalanceOf(accounts[1]);
      assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());


      await wrappedWeb3SendTransaction({from:accounts[1], to:contributionContract.address, value:web3.toWei(1, 'ether'), gas: 1000000}).catch(() => {});
      //post,can not buy anymore
      var desiredWancoinBalance = ether.times(expectedPrice).times(1);
      var actualWancoinBalance = await wanContract.lockedBalanceOf(accounts[1]);
      assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance.toNumber());

    });
  });

  describe('TESTING FOR  exceed the max opensold,claim token success', () => {
    beforeEach(resetContractTestEnv);

    it('After ICO started', async() => {
      const testCase = testCases[0];
      await contributionContract.setMockedMaxOpenSoldTokens((2*testCase.expectedPrice) * ether, {from: accounts[0]});

      await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(1, 'ether')});
      var desiredWancoinBalance = 0 * ether.times(testCase.expectedPrice);
      await contributionContract.claimTokens(testCase.account, {from:testCase.account}).catch(() => {});
      var actualWancoinBalance = await wanContract.balanceOf(testCase.account)
      //claimTokens should be failed,not all sold out and end time is not reached
      assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);

      await contributionContract.buyWanCoin(testCase.account, {from:testCase.account, value:web3.toWei(1.5, 'ether')});
      var desiredWancoinBalance = (2)* ether.times(testCase.expectedPrice);
      await contributionContract.claimTokens(testCase.account, {from:testCase.account}).catch(() => {});
      var actualWancoinBalance = await wanContract.balanceOf(testCase.account)
      //claimTokens should be failed,not all sold out and end time is not reached
      assert.equal(actualWancoinBalance.toNumber(), desiredWancoinBalance);

    });
  });

});

