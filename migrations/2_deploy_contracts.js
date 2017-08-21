var ConvertLib = artifacts.require("./ConvertLib.sol");
var Math = artifacts.require("./SafeMath.sol");
var WanChainICO = artifacts.require("./WanchainContribution.sol");
var wanTokenOwner = '0x21e7f6c5fe0e26609f271f6e9f1343bb753f1096';
var year = 2017;
var month = 8;
var date = 21;
var hour = 17;
var minute = 0;
var second = 0;


module.exports = function(deployer,network, accounts) {

  var timenow = new Date(year,month,date,hour,minute,second).getTime();


  var left = timenow % 1000;
  var timeseconds = (timenow - left) / 1000;
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, [WanChainICO]);
  deployer.deploy(Math);
  deployer.link(Math, [WanChainICO]);
  deployer.deploy(WanChainICO,wanTokenOwner, timeseconds);

};
