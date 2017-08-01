var ConvertLib = artifacts.require("./ConvertLib.sol");
var WanchainContribution = artifacts.require("./WanchainContribution.sol");

module.exports = function(deployer) {
  const wanport = '0x32cd3282d33ff58b4ae8402a226a0b27441b7f1a';
  const startTime = 1483839675;
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, WanchainContribution);
  deployer.deploy(WanchainContribution, wanport, startTime);
};
