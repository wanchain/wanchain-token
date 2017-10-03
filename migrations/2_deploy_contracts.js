var ConvertLib = artifacts.require("./ConvertLib.sol");
var Math = artifacts.require("./SafeMath.sol");
var WanChainICO = artifacts.require("./WanchainContribution.sol");

var wanPort = '0x0010242590B52545AfDc82FE44b064cE055479EB';

module.exports = function(deployer,network, accounts) {
  var dateTime = new Date("2017-10-03T16:00:00Z");
  //var dateTime = new Date('2017/10/04 00:00:00');
  var left = dateTime % 1000;
  var timeseconds = (dateTime - left) / 1000;

  console.log(dateTime.toUTCString());
  console.log(timeseconds);

  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, [WanChainICO]);
  deployer.deploy(Math);
  deployer.link(Math, [WanChainICO]);
  deployer.deploy(WanChainICO,wanPort, timeseconds);

};
