import Web3 from "web3";
import BN from "bn.js";

// @ts-ignore
import multiSigWallet from "./build/contracts/MultiSigWallet.json";

interface Transaction {
    txIndex: number;
    to: string;
    value: BN;
    data: string;
    executed: boolean;
    numConfirmations: number;
    isConfirmedByCurrentAccount: boolean;
}

interface GetResponse {
    address: string;
    balance: string;
    owners: string[];
    numConfirmationsRequired: number;
    transactionCount: number;
    transactions: Transaction[];
}



export async function getTransactions(web3: Web3, account: string): Promise<GetResponse> {
    // get contract instance
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];
    const MultiSigWallet = new web3.eth.Contract(multiSigWallet.abi, deployedNetwork.address);
    const multiSig = await MultiSigWallet.methods;

    const owners = await multiSig.getOwners().call({ from: account });

    const numConfirmationsRequired = await multiSig.numConfirmationsRequired().call({ from: account });
    const balanceInWei = await web3.eth.getBalance(MultiSigWallet.options.address);
    const balance = web3.utils.fromWei(balanceInWei, "ether");

    // get 10 most recent transactions

    const count = await multiSig.getTransactionCount().call({ from: account });;
    const transactions: Transaction[] = [];
    for (let i = 1; i <= 10; i++) {
        const txIndex = count - i;
        if (txIndex < 0) {
            break;
        }

        const tx = await multiSig.getTransaction(txIndex).call({ from: account });

        transactions.push({
            txIndex,
            to: tx.to,
            value: tx.value,
            data: tx.data,
            executed: tx.executed,
            numConfirmations: tx.numConfirmations,
            isConfirmedByCurrentAccount: tx.isConfirmedByCurrentAccount,
        });
    }
    return {
        address: MultiSigWallet.options.address,
        balance,
        owners,
        numConfirmationsRequired,
        transactionCount: count,
        transactions
    }
}

export async function deposit(web3: Web3, from: string, amount: string) {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];

    const tx = await web3.eth.sendTransaction({ from, to: deployedNetwork.address, value: amount });
    return tx;
}

export async function submitTransaction(web3: Web3, to: string, amount: string, data: string, account: string) {
    console.log("submitTransaction", to, amount, data);
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];
    const MultiSigWallet = new web3.eth.Contract(multiSigWallet.abi, deployedNetwork.address);
    const multiSig = await MultiSigWallet.methods;
    const newTx = await multiSig.submitTransaction(to, web3.utils.toBN(amount), data || "0x").send({ from: account });
    console.log(to, amount, data || "0x", account, newTx);
    return newTx;
}

export async function subscribeToAllEvents(web3: Web3, callback: (error: Error | null, log: Log | null) => void) {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];
    const MultiSigWallet = new web3.eth.Contract(multiSigWallet.abi, deployedNetwork.address);
    const multiSig = await MultiSigWallet.events;
    const subscription = multiSig.allEvents((error: Error | null, log: Log | null) => {
        if (error) {
            callback(error, null);
        } else if (log) {
            callback(null, log);
        }
    });

    return () => subscription.unsubscribe();
}

export async function confirmTransaction(web3: Web3, txIndex: string, account: string) {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];
    const MultiSigWallet = new web3.eth.Contract(multiSigWallet.abi, deployedNetwork.address);
    const multiSig = await MultiSigWallet.methods;

    const tx = await multiSig.confirmTransaction(txIndex).send({ from: account });

    console.log(tx);
}

export async function revokeTransaction(web3: Web3, txIndex: string, account: string) {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];
    const MultiSigWallet = new web3.eth.Contract(multiSigWallet.abi, deployedNetwork.address);
    const multiSig = await MultiSigWallet.methods;

    const tx = await multiSig.revokeConfirmation(txIndex).send({ from: account });

    console.log(tx);
}

export async function executeTransaction(web3: Web3, txIndex: string, account: string) {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = multiSigWallet.networks[networkId];
    const MultiSigWallet = new web3.eth.Contract(multiSigWallet.abi, deployedNetwork.address);
    const multiSig = await MultiSigWallet.methods;

    const tx = await multiSig.executeTransaction(txIndex).send({ from: account });

    console.log(tx);
}

interface Deposit {
    event: "Deposit";
    returnValues: {
        sender: string;
        amount: string;
        balance: string;
    };
}

interface SubmitTransaction {
    event: "SubmitTransaction";
    returnValues: {
        owner: string;
        txIndex: string;
        to: string;
        value: string;
        data: string;
    };
}

interface ConfirmTransaction {
    event: "ConfirmTransaction";
    returnValues: {
        owner: string;
        txIndex: string;
    };
}

interface RevokeConfirmation {
    event: "RevokeConfirmation";
    returnValues: {
        owner: string;
        txIndex: string;
    };
}

interface ExecuteTransaction {
    event: "ExecuteTransaction";
    returnValues: {
        owner: string;
        txIndex: string;
    };
}

export type Log =
    | Deposit
    | SubmitTransaction
    | ConfirmTransaction
    | RevokeConfirmation
    | ExecuteTransaction;