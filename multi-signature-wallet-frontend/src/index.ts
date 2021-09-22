import Web3 from 'web3';
import { renderTransactions } from './design';
import { unlockAccount, subscribeToAccount } from "./api/web3";
import { getTransactions, deposit, subscribeToAllEvents, Log, submitTransaction, confirmTransaction, revokeTransaction, executeTransaction } from "./multi-sig-wallet"


function handleAccountChange(subscriptionError: Error | null, account: string | null) {
    console.log(subscriptionError, account);

    if (subscriptionError) {
        console.error(subscriptionError);
        return;
    } else if (account != null && account !== document.getElementById("accountId")!.innerText) {
        window.location.reload();
    }
}

let unsubscribe = function () { };

let web3Instance: Web3 | null = null;
let accountAddress: string | null = null;
let numConfirmationsRequired = -1;

const $loginButton = document.getElementById("logIn")!
$loginButton.onclick = async (event: Event) => {
    $loginButton.classList.add("loading");
    $loginButton.classList.add("disabled");
    const { web3, account, networkInformation } = await unlockAccount();
    web3Instance = web3;
    accountAddress = account;


    if (web3 !== null && account !== null) {
        subscribeToAllEvents(web3, (error: Error | null, log: Log | null) => {
            if (log === null) {
                console.error(error);
                return;
            }
            let $buttonGroup;
            switch (log.event) {

                case "Deposit":
                    const $amount = document.getElementById("amount")!;
                    $amount.innerText = web3.utils.fromWei(log.returnValues.balance, "ether");
                    break;
                case "SubmitTransaction":
                    const $modal = document.getElementById("sending-modal")!;
                    $modal.classList.remove("active");
                    console.info(log.returnValues);
                    break;
                case "ConfirmTransaction":
                    // $buttonGroup = document.querySelector(`.controlsTx[data-txIndex="${log.returnValues.txIndex}"]`)!;
                    // $buttonGroup.innerHTML = `<div class="btn btn-error rejectTx" data-txIndex="${log.returnValues.txIndex}">Revoke Confirmation</div>`;
                    break;
                case "ExecuteTransaction":
                    $buttonGroup = document.querySelector(`.controlsTx[data-txIndex="${log.returnValues.txIndex}"]`)!;
                    $buttonGroup.innerHTML = `<button class="btn disabled" tabindex="-1">Executed</button>`;
                    break;
                case "RevokeConfirmation":
                    // $buttonGroup = document.querySelector(`.controlsTx[data-txIndex="${log.returnValues.txIndex}"]`)!;
                    // $buttonGroup.innerHTML = `<div class="btn btn-success acceptTx" data-txIndex="${log.returnValues.txIndex}">Confirm</div>`;
                    break;
                default:
                    console.log(log);
                    break;
            }
        });

    }

    const $account = document.getElementById("accountId")!;
    $account.innerText = account;
    document.getElementById("personalId")!.innerText = account;

    document.getElementById("networkName")!.innerText = networkInformation;

    document.getElementById("entire-panel")!.classList.remove("d-hide");
    (<HTMLElement>event.target)!.remove();

    unsubscribe = subscribeToAccount(web3, handleAccountChange);

    const contractData = await getTransactions(web3, account);
    console.info(contractData);
    renderTransactions(contractData);
}

const $depositButton = document.getElementById("deposit")!
$depositButton.onclick = async (event: Event) => {
    if (web3Instance === null) {
        throw new Error("Web3 instance is not available");
    } else if (accountAddress === null) {
        throw new Error("Account is not available");
    }
    const etherAmountString = (<HTMLInputElement>document.getElementById("deposit-value"))!.value;
    const etherAmount = parseFloat(etherAmountString);
    const weiAmount = web3Instance.utils.toWei(etherAmount + "", "ether");
    const transactionHash = await deposit(web3Instance, accountAddress, weiAmount);
    console.info(transactionHash);
}

document.getElementById("sending-submit")!.onclick = async (event: Event) => {
    if (web3Instance === null) {
        throw new Error("Web3 instance is not available");
    } else if (accountAddress === null) {
        throw new Error("Account is not available");
    }

    const etherAmountString = (<HTMLInputElement>document.getElementById("sending-amount"))!.value;
    const etherAmount = web3Instance.utils.toBN(etherAmountString);
    const weiAmount = web3Instance.utils.toWei(etherAmount + "", "ether");

    const $receiver = <HTMLInputElement>document.getElementById("sending-to")!;
    const $data = <HTMLInputElement>document.getElementById("sending-data")!;

    const newTx = await submitTransaction(web3Instance, $receiver.value, weiAmount, $data.value, accountAddress);

    const lastTxs = await getTransactions(web3Instance, accountAddress);
    renderTransactions(lastTxs);
    console.info(newTx);
}

export function registerTransactionListener(element: Element, numConfirmationsRequired: number) {
    element.addEventListener('click', async (event: Event) => {
        if (web3Instance === null) {
            throw new Error("Web3 instance is not available");
        }
        const $button = <HTMLButtonElement>event.target!;
        $button.classList.add("loading");
        $button.classList.add("disabled");
        const txIndex = $button.getAttribute("data-txIndex")!;


        if ($button.classList.contains("acceptTx")) {
            const response = await confirmTransaction(web3Instance, txIndex, accountAddress!);
            const $confirmationCell = <HTMLTableCellElement>document.querySelector(`.confirmations[data-txIndex="${txIndex}"]`)!;
            $confirmationCell.textContent = "" + (parseInt($confirmationCell.textContent!) + 1);

            console.log(numConfirmationsRequired, parseInt($confirmationCell.textContent!));
            if (numConfirmationsRequired <= parseInt($confirmationCell.textContent!)) {
                $button.classList.replace("acceptTx", "executeTx");
                $button.innerText = "Execute";
                $button.classList.replace("btn-success", "btn-primary");

            } else {
                $button.classList.replace("acceptTx", "rejectTx");
                $button.innerText = "Revoke Confirmation";
                $button.classList.replace("btn-success", "btn-error");
            }

            console.info(response);
        } else if ($button.classList.contains("rejectTx")) {
            const response = await revokeTransaction(web3Instance, txIndex, accountAddress!);
            const $confirmationCell = <HTMLTableCellElement>document.querySelector(`.confirmations[data-txIndex="${txIndex}"]`)!;
            $confirmationCell.textContent = "" + (parseInt($confirmationCell.textContent!) - 1);

            $button.classList.replace("rejectTx", "acceptTx");
            $button.innerText = "Confirm";
            $button.classList.replace("btn-error", "btn-success");
            console.info(response);
        } else if ($button.classList.contains("executeTx")) {
            $button.classList.add("disabled");
            $button.parentElement!.lastElementChild!.classList.add("disabled");
            $button.parentElement!.lastElementChild!.classList.add("loading");
            $button.classList.add("loading");
            const response = await executeTransaction(web3Instance, txIndex, accountAddress!);

            $button.parentElement!.innerHTML = `<button class="btn disabled" tabindex="-1">Executed</button>`;

            console.info(response);
        }

        $button.classList.remove("loading");
        $button.classList.remove("disabled");
    })
}