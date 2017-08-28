const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 4000000,
      gasPrice: 20e9,
    },

    development_migrate: {
      network_id: "*",
      host: "localhost",
      port: 8545,
      gas: 4000000,
      gasPrice: 20e9,
      from: "0xf93df8c288b9020e76583a6997362e89e0599e99",
    },

    mainnet: {
      host: "118.190.71.27",
      port: 8745,
      network_id: "*", // Match any network id
      gas: 4000000,
      gasPrice: 20e9,
      from:"0x96fe33e72f758114de310a38d871696519cccf62",
    },
    ropsten: {
      host: "114.215.69.125",
      port: 8545,
      network_id: 4,
      gas: 4000000,
      gasPrice: 20e9,
      from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
     },
    rinkeby: {
      host: "118.190.71.27",
      port: 8545,
      network_id: 4,
      gas: 4000000,
      gasPrice: 20e9,
      from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
    },
    kovan: {
      host: "118.190.71.27",
      port: 8444,
      network_id: "42",
      gas: 5000000,
      gasPrice: 20e9,
      from: "0xbef407b3752f6dde4dee2f53b3c8b774fb29af09",
    }
  }
};


