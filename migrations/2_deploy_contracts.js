var ConvertLib = artifacts.require("./ConvertLib.sol");
var Math = artifacts.require("./SafeMath.sol");
var WanChainICO = artifacts.require("./WanchainContribution.sol");
var wanTokenOwner = '0x21e7f6c5fe0e26609f271f6e9f1343bb753f1096';

module.exports = function(deployer,network, accounts) {

    var timenow = new Date('2017/08/21 20:05:00').getTime();
    var left = timenow % 1000;
    var timeseconds = (timenow - left) / 1000;

    console.log(timeseconds);

    // var timenow1 = new Date().getTime();
    // var left1 = timenow1% 1000;
    // var timeseconds1 = (timenow1- left1) / 1000;
    // console.log(timeseconds1);

    deployer.deploy(ConvertLib);
    deployer.link(ConvertLib, [WanChainICO]);
    deployer.deploy(Math);
    deployer.link(Math, [WanChainICO]);
    deployer.deploy(WanChainICO,wanTokenOwner, timeseconds);

};