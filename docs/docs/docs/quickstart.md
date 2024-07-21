---
sidebar_position: 2
sidebar_label: '🚀 Quickstart'
---

# Quickstart

## Initialize RPC Endpoint

```ts
import { Web3 } from 'web3';

const web3 = new Web3('https://1rpc.io/zksync2-era');

const response = await web3.eth.getBlock();
console.log(response);
/* 
{
  baseFeePerGas: 45250000n,
  difficulty: 0n,
  extraData: '0x',
  gasLimit: 1125899906842624n,
  ...
}
*/
```
