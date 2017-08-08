var ConvertLib = artifacts.require("./ConvertLib.sol");
var Math = artifacts.require("./SafeMath.sol");
var WanChainICO = artifacts.require("./WanchainContribution.sol");

module.exports = function(deployer,network, accounts) {
  var timenow = new Date().getTime();
  var left = timenow % 1000;
  var timeseconds = (timenow - left) / 1000;
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, [WanChainICO]);
  deployer.deploy(Math);
  deployer.link(Math, [WanChainICO]);
  deployer.deploy(WanChainICO, accounts[0], timeseconds);
};
