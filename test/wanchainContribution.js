const async = require('async');
const assert = require('assert');
const BigNumber = require('bignumber.js');
const sha256 = require('js-sha256').sha256;

var WanchainContribution = artifacts.require("./WanchainContribution.sol");
var WanToken = artifacts.require("./WanToken.sol");

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

contract('WanchainContribution', (accounts) => {
  // Solidity constants
  const hours = 3600;
  const weeks = 24 * 7 * hours;
  const years = 52 * weeks;
  const ether = new BigNumber(Math.pow(10, 18));

  // WanchainContribution constant fields
  const OPEN_SALE_STAKE = 45;  // 45% for open sale
  const PRESALE_STAKE = 6;     // 6%  for presale  
  const DEV_TEAM_STAKE = 20;   //
  const FOUNDATION_STAKE = 19; //
  const MINERS_STAKE = 10;     //

  const DIVISOR_STAKE = 100;

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
  // const THAWING_DURATION = 2 * years; // Time needed for iced tokens to thaw into liquid tokens
  // const MAX_TOTAL_TOKEN_AMOUNT_OFFERED_TO_PUBLIC = new BigNumber(1000000).times(new BigNumber(Math.pow(10, decimals))); // Max amount of tokens offered to the public
  // const MAX_TOTAL_TOKEN_AMOUNT = new BigNumber(1250000).times((new BigNumber(Math.pow(10, decimals)))); // Max amount of total tokens raised during all contributions (includes stakes of patrons)

  const PRICE_RATE_FIRST = 700; 
  const PRICE_RATE_SECOND = 630;
  const PRICE_RATE_LAST = 600;

  const MAX_TOTAL_TOKEN_AMOUNT_OFFERED_TO_PUBLIC = new BigNumber(1000000).times(new BigNumber(Math.pow(10, decimals))); // Max amount of tokens offered to the public
  const MAX_TOTAL_TOKEN_AMOUNT = new BigNumber(210000000).times((new BigNumber(Math.pow(10, decimals)))); // Max amount of total tokens raised during all contributions (includes stakes of patrons)


  // Test globals
  let contributionContract;
  let wanContract;
  let testCases;

  // // Accounts
  const wanWallet = accounts[0];
  // const btcs = accounts[1];
  // const signer = accounts[2];

  let initalBlockTime;
  const startDelay = 1 * weeks;
  let startTime;
  let endTime;
  const numTestCases = 8;

  describe('PREPARATIONS', () => {
    before('Check accounts', (done) => {
      assert.equal(accounts.length, 10);
      done();
    });

    it('Set startTime as now', (done) => {
      web3.eth.getBlock('latest', (err, result) => {
        initalBlockTime = result.timestamp;
        startTime = initalBlockTime + startDelay;
        endTime = startTime + (3 * weeks);
        done();
      });
    });

    it('Set up test cases', (done) => {
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
          expectedPrice = 0;
        }
        const accountNum = Math.max(1, Math.min(i + 1, accounts.length - 1));
        const account = accounts[accountNum];
        expectedPrice = Math.round(expectedPrice);
        testCases.push({
          accountNum,
          blockTime,
          timeSpacing,
          amountToBuy: web3.toWei(2.1, 'ether'),
          expectedPrice,
          account,
        });
      }
      done();
    });

  });

  describe('CONTRIBUTION CONTRACT STATIC CHECK', () => {
    it('Total Stake equal 100', (done) => {
      assert.equal( OPEN_SALE_STAKE + PRESALE_STAKE + DEV_TEAM_STAKE + FOUNDATION_STAKE + MINERS_STAKE
        ,DIVISOR_STAKE);
      done();
    });
  });

  describe('CONTRACT DEPLOYMENT', () => {
    it('Deploy WanchainContribution contracts', (done) => {
      WanchainContribution.new(wanWallet, startTime).then((result) => {
        contributionContract = result;
        console.log("------------------");
        return contributionContract.wanToken();
      }).then((result) => {
        wanContract = WanToken.at(result);
        done();
      });
    });

    it('Check Wanchain Token initialisation', (done) => {
      wanContract.MAX_TOTAL_TOKEN_AMOUNT().then((result) => {
        assert.equal(result, MAX_TOTAL_TOKEN_AMOUNT.toNumber());
        return wanContract.minter();
      })
      .then((result) => {
        assert.equal(result, contributionContract.address);
        return wanContract.wanWallet();
      })
      .then((result) => {
        assert.equal(result, wanWallet);
        return wanContract.startTime();
      })
      .then((result) => {
        assert.equal(result, startTime);
        return wanContract.endTime();
      })
      .then((result) => {
        assert.equal(result, endTime);
        done();
      });
    });

    it('Check premined allocation', (done) => {
      wanContract.balanceOf(wanWallet).then((result) => {
        assert.equal(
          result.toNumber(),
          0);
        return wanContract.lockedBalanceOf(PRESALE_HOLDER);
      })
      .then((result) => {
        assert.equal(
          result.toNumber(),
          WAN_TOTAL_SUPPLY.times(PRESALE_STAKE).div(DIVISOR_STAKE));
        return wanContract.lockedBalanceOf(DEV_TEAM_HOLDER);
      })
      .then((result) => {
        assert.equal(
          result.toNumber(),
          WAN_TOTAL_SUPPLY.times(DEV_TEAM_STAKE).div(DIVISOR_STAKE));
        return wanContract.lockedBalanceOf(FOUNDATION_HOLDER);
      })
      .then((result) => {
        assert.equal(
          result.toNumber(),
          WAN_TOTAL_SUPPLY.times(FOUNDATION_STAKE).div(DIVISOR_STAKE));
        return wanContract.lockedBalanceOf(MINERS_HOLDER);
      })
      .then((result) => {
        assert.equal(
          result.toNumber(),
          WAN_TOTAL_SUPPLY.times(MINERS_STAKE).div(DIVISOR_STAKE));
        done();
      })
    });
  });  

  describe('BEFORE PUBLIC CONTRIBUTION', () => {
    it('Test buying too early', (done) => {
      const testCase = testCases[0];
      contributionContract.buyWanCoin(
        testCase.account,
        { from: testCase.account, value: testCase.amountToBuy })
      .catch(() => {
        // Gets executed if contract throws exception
        wanContract.balanceOf(testCase.account)
        .then((result) => {
          assert.equal(
            result.toNumber(),
            0);
          done();
        });
      });
    });
  });

  describe('START OF PUBLIC CONTRIBUTION', () => {
    before('Time travel to startTime', (done) => {
      web3.eth.getBlock('latest', (err, result) => {
        send('evm_increaseTime', [startTime - result.timestamp], (err, result) => {
          assert.equal(err, null);
          send('evm_mine', [], (err, result) => {
            assert.equal(err, null);
            done();
          });
        });
      });
    });

    it('Test buying and buyingRecipient in time', (done) => {
      let amountBought = new BigNumber(0);
      web3.eth.getBalance(wanWallet, (err, initialBalance) => {
        async.eachSeries(testCases,
          (testCase, callbackEach) => {
            web3.eth.getBlock('latest', (err, result) => {
              send('evm_increaseTime', [testCase.blockTime - result.timestamp], (err, result) => {
                assert.equal(err, null);
                send('evm_mine', [], (err, result) => {
                  assert.equal(err, null);
                  contributionContract.buyWanCoin(
                    testCase.account,
                    { from: testCase.account, value: testCase.amountToBuy })
                  .then(() => {
                    amountBought = amountBought.add(testCase.amountToBuy);
                    return wanContract.lockedBalanceOf(testCase.account);
                  }).then((result) => {
                    assert.equal(
                      result.toNumber(),
                      (new BigNumber(testCase.amountToBuy)).times(testCase.expectedPrice));
                    callbackEach();
                  });
                });
              });
            });
          },
          (err) => {
            web3.eth.getBalance(wanWallet, (err, finalBalance) => {
              assert.equal(
                finalBalance.minus(initialBalance).toNumber(),
                amountBought.toNumber()
              );
              done();
            });
          }
        );
      });
    });
    
    it('Test send ether to WanchainContribution contract address directly', (done) => {
      let amountBought = new BigNumber(0);
      web3.eth.getBalance(wanWallet, (err, initialBalance) => {
        async.eachSeries(testCases,
          (testCase, callbackEach) => {
            web3.eth.getBlock('latest', (err, result) => {
              send('evm_increaseTime', [testCase.blockTime - result.timestamp], (err, result) => {
                assert.equal(err, null);
                send('evm_mine', [], (err, result) => {
                  assert.equal(err, null);

                  //------------------------------------
                  web3.eth.sendTransaction({from: testCase.account, value: testCase.amountToBuy} , (_err, _result) => {
                    assert.equal(err, null);
                    wanContract.lockedBalanceOf(testCase.account)
                    .then((result) => {
                        assert.equal(
                          result.toNumber(),
                          (new BigNumber(testCase.amountToBuy)).times(testCase.expectedPrice));
                        callbackEach();
                      });
                  });
                });
              });
            });
          },
          (err) => {
            web3.eth.getBalance(wanWallet, (err, finalBalance) => {
              assert.equal(
                finalBalance.minus(initialBalance).toNumber(),
                amountBought.toNumber()
              );
              done();
            });
          }
        );
      });
    });

    it('Test token transfer too early', (done) => {
      const sender = testCases[0];
      const recipient = testCases[1];
      const amount = web3.toWei(1.2, 'ether');

      let initialBalanceSender;
      let initialBalanceRecipient;
      wanContract.balanceOf(sender.account).then((result) => {
        initialBalanceSender = result;
        return wanContract.balanceOf(recipient.account);
      })
      .then((result) => {
        initialBalanceRecipient = result;
        wanContract.transfer(recipient.account, amount,
          { from: sender.account })
        .catch(() => {
          wanContract.balanceOf(sender.account)
          .then((finalBalanceSender) => {
            assert.equal(
              finalBalanceSender.toNumber(),
              initialBalanceSender.toNumber());
            return wanContract.balanceOf(recipient.account);
          })
          .then((finalBalanceRecipient) => {
            assert.equal(
              finalBalanceRecipient.toNumber(),
              initialBalanceRecipient.toNumber());
            done();
          });
        });
      });
    });

  
  /////////////////  
  });  

  describe('PAST END OF PUBLIC CONTRIBUTION', () => {
    before('Time travel to endTime', (done) => {
      web3.eth.getBlock('latest', (err, result) => {
        send('evm_increaseTime', [(endTime - result.timestamp) + 1], (err, result) => {
          assert.equal(err, null);
          send('evm_mine', [], (err, result) => {
            assert.equal(err, null);
            done();
          });
        });
      });
    });
    
    it('Test buying too late', (done) => {
      const sender = testCases[0];
      let initialBalance;
      wanContract.balanceOf(sender.account)
      .then((result) => {
        initialBalance = result.toNumber();
        return contributionContract.buyWanCoin(
          sender.account,
          { from: sender.account, value: sender.amountToBuy });
      })
      .catch(() => {
        wanContract.balanceOf(sender.account)
        .then((result) => {
          assert.equal(
            result.toNumber(),
            initialBalance);
          done();
        });
      });
    });

    it('Test claim token  in time', (done) => {
      const sender = testCases[0];

      let initialBalance;
      wanContract.lockedBalanceOf(sender.account).then((result) => {
        initialBalance = result;
        return wanContract.claimTokens(sender.account);
      })
      .then((result) => wanContract.balanceOf(sender.account))
      .then((result) => {
        assert.equal(
          result.toNumber(),
          initialBalance.toNumber());
        done()
      });
    });

    
    it('Test transfer token in time', (done) => {
      const sender = testCases[0];
      const recipient = testCases[1];
      const amount = web3.toWei(10, 'ether');

      let initialBalanceSender;
      let initialBalanceRecipient;
      wanContract.balanceOf(sender.account).then((result) => {
        initialBalanceSender = result;
        return wanContract.balanceOf(recipient.account);
      })
      .then((result) => {
        initialBalanceRecipient = result;
        return wanContract.transfer(recipient.account, amount,
          { from: sender.account });
      })
      .then(() => wanContract.balanceOf(sender.account))
      .then((finalBalanceSender) => {
        assert.equal(
          finalBalanceSender.toNumber(),
          initialBalanceSender.minus(amount).toNumber());
        return wanContract.balanceOf(recipient.account);
      })
      .then((finalBalanceRecipient) => {
        assert.equal(
          finalBalanceRecipient.toNumber(),
          initialBalanceRecipient.plus(amount).toNumber());
        done();
      });
    });
  //////
  });



});
