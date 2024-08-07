import type { Web3Context, Web3ContextInitOptions, Web3RequestManager } from 'web3-core';
import type * as web3Types from 'web3-types';
import type { Address } from 'web3-types';
import { Contract } from 'web3-eth-contract';
import { Web3PluginBase } from 'web3-core';

import { TransactionFactory } from 'web3-eth-accounts';
import { IERC20ABI } from './contracts/IERC20';
import { RpcMethods } from './rpc.methods';
import * as constants from './constants';
import { IL2BridgeABI } from './contracts/IL2Bridge';
import { IZkSyncABI } from './contracts/IZkSyncStateTransition';
import { IBridgehubABI } from './contracts/IBridgehub';
import { IContractDeployerABI } from './contracts/IContractDeployer';
import { IL1MessengerABI } from './contracts/IL1Messenger';
import { IERC1271ABI } from './contracts/IERC1271';
import { IL1BridgeABI } from './contracts/IL1ERC20Bridge';
import { INonceHolderABI } from './contracts/INonceHolder';
import { EIP712Transaction } from './Eip712';
import { ZKSyncWallet } from './zksync-wallet';
import { Web3ZkSyncL2 } from './web3zksync-l2';
import { Web3ZkSyncL1 } from './web3zksync-l1';
import type { ContractsAddresses } from './types';

interface ZKSyncWalletConstructor {
	new (privateKey: string): ZKSyncWallet;
}

export type ZKSyncContractsCollection = {
	Generic: {
		/**
		 * The web3.js Contract instance for the `IERC20` interface, which is utilized for interacting with ERC20 tokens.
		 */
		IERC20Contract: Contract<typeof IERC20ABI>;
		/**
		 * The web3.js Contract instance for the `IERC1271` interface, which is utilized for signature validation by contracts.
		 */
		IERC1271Contract: Contract<typeof IERC1271ABI>;
	};
	L1: {
		/**
		 * The web3.js Contract instance for the `ZkSync` interface.
		 */
		ZkSyncMainContract: Contract<typeof IZkSyncABI>;
		/**
		 * The ABI of the `Bridgehub` interface.
		 */
		BridgehubContract: Contract<typeof IBridgehubABI>;
		/**
		 * The web3.js Contract instance for the `IL1Bridge` interface, which is utilized for transferring ERC20 tokens from L1 to L2.
		 */
		L1BridgeContract: Contract<typeof IL1BridgeABI>;
	};
	L2: {
		/**
		 * The web3.js Contract instance for the `IContractDeployer` interface, which is utilized for deploying smart contracts.
		 */
		ContractDeployerContract: Contract<typeof IContractDeployerABI>;
		/**
		 * The web3.js Contract instance for the `IL1Messenger` interface, which is utilized for sending messages from the L2 to L1.
		 */
		L1MessengerContract: Contract<typeof IL1MessengerABI>;
		/**
		 * The web3.js Contract instance for the `IL2Bridge` interface, which is utilized for transferring ERC20 tokens from L2 to L1.
		 */
		L2BridgeContract: Contract<typeof IL2BridgeABI>;

		/**
		 * The web3.js Contract instance for the `INonceHolder` interface, which is utilized for managing deployment nonces.
		 */
		NonceHolderContract: Contract<typeof INonceHolderABI>;
	};
};

export class ZkSyncPlugin extends Web3PluginBase {
	public L1: Web3ZkSyncL1 | undefined;
	public L2: Web3ZkSyncL2;
	public pluginNamespace = 'zkSync';
	public _rpc?: RpcMethods;
	public _l2BridgeContracts: Record<Address, Contract<typeof IL2BridgeABI>>;
	public _erc20Contracts: Record<Address, Contract<typeof IERC20ABI>>;

	private contracts: ZKSyncContractsCollection | undefined;
	public get Contracts(): Promise<ZKSyncContractsCollection> {
		if (this.contracts) {
			return Promise.resolve(this.contracts);
		}
		return this.initContracts();
	}

	contractsAddresses: Promise<ContractsAddresses>;
	public get ContractsAddresses(): Promise<ContractsAddresses> {
		if (this.contractsAddresses) {
			return Promise.resolve(this.contractsAddresses);
		}
		return this.initContractsAddresses();
	}

	// the wallet type in this class is different from the parent class. So, they should have different names.
	ZkWallet: ZKSyncWalletConstructor;

	/**
	 * Constructor
	 * @param providerOrContextL2 - The provider or context for the L2 network
	 */
	constructor(
		providerOrContextL2:
			| string
			| web3Types.SupportedProviders<any>
			| Web3ContextInitOptions
			| Web3ZkSyncL2,
	) {
		super(
			providerOrContextL2 as
				| string
				| web3Types.SupportedProviders<any>
				| Web3ContextInitOptions,
		);
		if (providerOrContextL2 instanceof Web3ZkSyncL2) {
			this.L2 = providerOrContextL2;
		} else {
			this.L2 = new Web3ZkSyncL2(providerOrContextL2);
		}
		// @ts-ignore-next-line
		TransactionFactory.registerTransactionType(constants.EIP712_TX_TYPE, EIP712Transaction);

		this._l2BridgeContracts = {};
		this._erc20Contracts = {};

		this.contractsAddresses = this.initContractsAddresses();

		const self = this;
		class ZKSyncWalletWithFullContext extends ZKSyncWallet {
			constructor(privateKey: string) {
				super(privateKey, self.L2, self.L1);
			}
		}

		this.ZkWallet = ZKSyncWalletWithFullContext;
		this.initWallet();
	}

	public async initContracts() {
		if (!this.L1 || !this.L2) {
			throw new Error(
				'Contracts cannot be initialized because a Web3 instance is not yet linked to ZkSync plugin',
			);
		}

		const {
			mainContract,
			bridgehubContractAddress,
			// l1Erc20DefaultBridge,
			// l2Erc20DefaultBridge,
			// l1WethBridge,
			// l2WethBridge,
			l1SharedDefaultBridge,
			l2SharedDefaultBridge,
		} = await this.contractsAddresses;

		const contractsCollection: ZKSyncContractsCollection = {
			Generic: {
				IERC20Contract: new Contract(IERC20ABI),
				IERC1271Contract: new Contract(IERC1271ABI),
			},
			L1: {
				ZkSyncMainContract: new Contract(IZkSyncABI, mainContract, this.L1),
				BridgehubContract: new Contract(IBridgehubABI, bridgehubContractAddress, this.L1),
				L1BridgeContract: new Contract(IL1BridgeABI, l1SharedDefaultBridge, this.L1),
			},
			L2: {
				ContractDeployerContract: new Contract(
					IContractDeployerABI,
					constants.CONTRACT_DEPLOYER_ADDRESS,
					this.L2,
				),
				L1MessengerContract: new Contract(
					IL1MessengerABI,
					constants.L1_MESSENGER_ADDRESS,
					this.L2,
				),
				NonceHolderContract: new Contract(
					INonceHolderABI,
					constants.NONCE_HOLDER_ADDRESS,
					this.L2,
				),
				L2BridgeContract: new Contract(IL2BridgeABI, l2SharedDefaultBridge, this.L2),
			},
		};

		this.contracts = contractsCollection;
		return contractsCollection;
	}

	/**
	 * Try to fill the contract addresses
	 * @returns True if the contract addresses were successfully filled, false otherwise
	 */
	public async initContractsAddresses() {
		const [mainContract, bridgehubContractAddress, bridgeContracts] = await Promise.all([
			this.rpc.getMainContract(),
			this.rpc.getBridgehubContractAddress(),
			this.rpc.getBridgeContracts(),
		]);
		this.contractsAddresses = Promise.resolve({
			mainContract,
			bridgehubContractAddress,
			...bridgeContracts,
		});

		return this.contractsAddresses;
	}

	public link(parentContext: Web3Context): void {
		super.link(parentContext);

		this.L1 = new Web3ZkSyncL1(parentContext);

		this.initContracts();

		this.initWallet();
	}

	private initWallet() {
		const self = this;
		class ZKSyncWalletWithFullContext extends ZKSyncWallet {
			constructor(privateKey: string) {
				super(privateKey, self.L2, self.L1);
			}
		}

		this.ZkWallet = ZKSyncWalletWithFullContext;
	}

	/**
	 * Get RPC methods instance
	 */
	get rpc(): RpcMethods {
		if (!this._rpc) {
			this._rpc = new RpcMethods(
				this.L2.requestManager as unknown as Web3RequestManager<unknown>,
			);
		}
		return this._rpc;
	}

	/**
	 * Update the providers
	 * @param contextL1 - The context for the L1 network
	 * @param contextL2 - The context for the L2 network
	 *
	 * @remarks This method is used to update the providers for the L1 and L2 networks.
	 * It is very important to call it if one of the providers is changed to a different network.
	 * For example, if the L1 or L2 providers were changed from testnet to mainnet, this method should be called.
	 */
	public updateProviders(
		contextL1:
			| Web3ZkSyncL1
			| web3Types.SupportedProviders<any>
			| Web3ContextInitOptions
			| string,
		contextL2:
			| Web3ZkSyncL2
			| web3Types.SupportedProviders<any>
			| Web3ContextInitOptions
			| string,
	) {
		this.L1 = contextL1 instanceof Web3ZkSyncL1 ? contextL1 : new Web3ZkSyncL1(contextL1);
		this.L2 = contextL2 instanceof Web3ZkSyncL2 ? contextL2 : new Web3ZkSyncL2(contextL2);
		this.initContractsAddresses();
		this.initContracts();
	}

	/**
	 * Get L2 bridge contract instance
	 * @param address - Contract address
	 */
	getL2BridgeContract(address: Address): Contract<typeof IL2BridgeABI> {
		if (!this._l2BridgeContracts[address]) {
			this._l2BridgeContracts[address] = new Contract(IL2BridgeABI, address);
			this._l2BridgeContracts[address].link(this.L2);
		}
		return this._l2BridgeContracts[address];
	}

	/**
	 * Get the ERC20 contract instance
	 * @param address - Contract address
	 */
	erc20(address: string): Contract<typeof IERC20ABI> {
		if (!this._erc20Contracts[address]) {
			this._erc20Contracts[address] = new Contract(IERC20ABI, address);
			this._erc20Contracts[address].link(this.L2);
		}
		return this._erc20Contracts[address];
	}

	/**
	 * Get the L1 address of a token
	 * @param token - The address of the token
	 */
	async getL1Address(token: Address): Promise<Address> {
		if (token == constants.ETH_ADDRESS) {
			return constants.ETH_ADDRESS;
		} else {
			const bridgeAddresses = await this.L2.getDefaultBridgeAddresses();
			if (bridgeAddresses.wethL2 !== constants.ZERO_ADDRESS) {
				const l2Bridge = this.getL2BridgeContract(bridgeAddresses.wethL2);
				try {
					const l1Token = await l2Bridge.methods.l1TokenAddress(token).call();
					if (l1Token !== constants.ZERO_ADDRESS) {
						return l1Token;
					}
				} catch (e) {
					throw new Error(
						`Error getting L1 address for token ${token}. ${JSON.stringify(e)}`,
					);
				}
			}

			const erc20Bridge = this.getL2BridgeContract(bridgeAddresses.erc20L2);
			return erc20Bridge.methods.l1TokenAddress(token).call();
		}
	}

	/**
	 * Get the L2 address of a token
	 * @param token - The address of the token
	 */
	async getL2Address(token: Address): Promise<string> {
		if (token == constants.ETH_ADDRESS) {
			return constants.ETH_ADDRESS;
		} else {
			const bridgeAddresses = await this.L2.getDefaultBridgeAddresses();
			if (bridgeAddresses.wethL2 !== constants.ZERO_ADDRESS) {
				const l2Bridge = this.getL2BridgeContract(bridgeAddresses.wethL2);
				try {
					const l2WethToken = await l2Bridge.methods.l2TokenAddress(token).call();
					if (l2WethToken !== constants.ZERO_ADDRESS) {
						return l2WethToken;
					}
				} catch (e) {
					throw new Error(
						`Error getting L2 address for token ${token}. ${JSON.stringify(e)}`,
					);
				}
			}

			const erc20Bridge = this.getL2BridgeContract(bridgeAddresses.erc20L2);
			return erc20Bridge.methods.l2TokenAddress(token).call();
		}
	}
}

// Module Augmentation
declare module 'web3' {
	interface Web3 {
		zkSync: ZkSyncPlugin;
	}
}
