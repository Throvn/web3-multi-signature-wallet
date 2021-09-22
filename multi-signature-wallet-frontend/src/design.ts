import Web3 from "web3";
import { registerTransactionListener } from "./index";

let lastHash = "";

const $transaction_tab = document.querySelector('#transaction-tab')!;
const $contract_tab = document.querySelector('#contract-tab')!;
const $owners_tab = document.querySelector('#owners-tab')!;

const $contract = document.querySelector('#contract')!;
const $transactions = document.querySelector('#transactions')!;
const $owners = document.querySelector('#owners')!;

const changeDisplayAccordingToHash = function (this: Window | WindowEventHandlers, event?: Event) {
    if (lastHash !== location.hash) {
        switch (location.hash) {
            case '#contract':
                $contract.classList.remove('d-hide');
                $transactions.classList.add('d-hide');
                $owners.classList.add('d-hide');

                $contract_tab.classList.add('active');
                $transaction_tab.classList.remove('active');
                $owners_tab.classList.remove('active');
                break;
            case '#transactions':
                $contract.classList.add('d-hide');
                $transactions.classList.remove('d-hide');
                $owners.classList.add('d-hide');

                $transaction_tab.classList.add('active');
                $contract_tab.classList.remove('active');
                $owners_tab.classList.remove('active');
                break;
            case '#owners':
                $contract.classList.add('d-hide');
                $transactions.classList.add('d-hide');
                $owners.classList.remove('d-hide');

                $owners_tab.classList.add('active');
                $transaction_tab.classList.remove('active');
                $contract_tab.classList.remove('active');
                break;
            default:
                $contract.classList.remove('d-hide');
                $transactions.classList.add('d-hide');
                $owners.classList.add('d-hide');

                $contract_tab.classList.add('active');
                $transaction_tab.classList.remove('active');
                $owners_tab.classList.remove('active');
                break;
        }
        lastHash = location.hash;
    }

};
// @ts-ignore
changeDisplayAccordingToHash(window);

window.onhashchange = changeDisplayAccordingToHash;

export function renderTransactions(contractData: any): void {
    const contractAddress = contractData.address;
    document.getElementById("contractId")!.innerText = contractAddress;


    // Render owners to screen
    const $ownerInsert = document.getElementById("owner-insert")!
    let htmlOwner = ``;
    for (let i = 0; i < contractData.owners.length; i++) {
        const owner = contractData.owners[i];
        htmlOwner += `<li class="text-clip">
            <a href="https://etherscan.io/address/${owner}">${owner}</a>
        </li>`
    }
    $ownerInsert.innerHTML = htmlOwner;


    if (contractData.transactions.length > 0) {
        // Render transactions to screen
        const $transactionInsert = document.getElementById("transaction-insert")!
        let htmlTransaction = ``;
        for (let i = 0; i < contractData.transactions.length; i++) {
            const transaction = contractData.transactions[i];
            htmlTransaction += `<div class="card mr-2">
            <div class="card-header">
                <div class="card-title h5">${parseInt(transaction.txIndex) + 1}. Transaction</div>
                <div class="card-subtitle text-gray">${Web3.utils.fromWei(transaction.value, "ether")} ETH</div>
            </div>
            <div class="card-body">
                <table class="table table-striped table-hover table-scroll">
                    <tbody>
                        <tr>
                            <td>Transaction ID</td>
                            <td>${transaction.txIndex}</td>
                        </tr>
                        <tr>
                            <td>Receiver</td>
                            <td class="text-clip">
                                <a href="" class="tooltip" data-tooltip="${transaction.to}">${transaction.to.slice(0, 10)}...${transaction.to.slice(25)}</a>
                            </td>
                        </tr>
                        <tr>
                            <td>Amount</td>
                            <td>${transaction.value} Wei</td>
                        </tr>
                        <tr>
                            <td>Data</td>
                            <td>${transaction.data}</td>
                        </tr>
                        <tr>
                            <td>Confirmations</td>
                            <td class="confirmations" data-txIndex="${transaction.txIndex}">${transaction.numConfirmations}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="card-footer">
                <div class="btn-group btn-group-block controlsTx" data-txIndex="${transaction.txIndex}">
                ${transaction.executed ? `
                <button class="btn disabled" tabindex="-1">Executed</button>` : parseInt(contractData.numConfirmationsRequired) <= transaction.numConfirmations ?
                    `<button class="btn btn-primary executeTx" data-txIndex="${transaction.txIndex}">Execute</button>` : (transaction.isConfirmedByCurrentAccount ? `
                            <div class="btn btn-error rejectTx" data-txIndex="${transaction.txIndex}">Revoke Confirmation</div>` : `
                            <div class="btn btn-success acceptTx" data-txIndex="${transaction.txIndex}">Confirm</div>
                `)}
                </div>
            </div>
        </div>`;
        }

        $transactionInsert.innerHTML = htmlTransaction;

        updateTransactionListener(contractData);
    }

    // Render current amount of transactions to screen
    const $amount = document.getElementById("amount")!
    $amount.innerText = contractData.balance;
    $amount.classList.remove("loading");
}

export function updateTransactionListener(contractData: any) {
    document.querySelectorAll('.acceptTx, .rejectTx, .executeTx').forEach((element: Element) => {
        console.log(contractData, contractData.numConfirmationsRequired);
        registerTransactionListener(element, parseInt(contractData.numConfirmationsRequired));
    })
}