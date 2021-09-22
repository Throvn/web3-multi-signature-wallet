import Web3 from "web3";

function getNetwork(netId: number) {
    switch (netId) {
        case 1:
            return "Mainnet";
        case 2:
            return "Morden test network";
        case 3:
            return "Ropsten network";
        case 4:
            return "Rinkeby test network";
        case 42:
            return "Kovan test network";
        default:
            return "Unkown network";
    }
}

export async function unlockAccount() {
    // @ts-ignore
    const { ethereum } = window;

    if (!ethereum) {
        throw new Error('Ethereum is not available');
    }
    const web3 = new Web3(ethereum);
    await ethereum.enable(); // calls metamasks popup

    const accounts = await web3.eth.getAccounts();
    const networkId = await web3.eth.net.getId();
    const networkInformation = getNetwork(networkId);

    return { web3, account: accounts[0] || "", networkInformation }
}

export function subscribeToAccount(web3: Web3, callback: (error: Error | null, account: string | null) => any) {
    const id = setInterval(async () => {
        try {
            const account = (await web3.eth.getAccounts())[0];
            callback(null, account);
        } catch (error: any) {
            callback(error, null);
        }
    }, 1000);

    return () => {
        clearInterval(id);
    }
}