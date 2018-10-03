<template>
    <div class="mdc-typography">
        <slot></slot>
        <mdc-title>
            {{ group.name }}
            <mdc-button raised style="float: right" @click="createTransactionDialogOpen = true">
                New Transaction
            </mdc-button>
        </mdc-title>
        <mdc-dialog v-model="createTransactionDialogOpen"
                    title="New Transaction"
                    accept="Create"
                    cancel="Cancel"
                    @accept="createTransaction"
                    @cancel="createTransactionDialogOpen = false"
                    @validate="createTransactionValidate">
            <mdc-textfield v-model="createTransactionExpenseTextField" label="Expense Description" fullwidth box required />
            <mdc-textfield
                v-model="createTransactionCostTextField"
                box
                leading-icon="attach_money"
                @focus="formatCost"
                @blur="formatCost"
                @change="formatCost"
                @keydown="keyDown"
                required
                dir="rtl"
                ref="costBox" />
            <mdc-text>Select group members who owe this amount
                    (the amount will be split evenly):</mdc-text>
            <mdc-button outlined dense @click="selectAll">Select All</mdc-button>
            <mdc-button outlined dense @click="deselectAll">Deselect All</mdc-button>
            <div style="margin-top: 16px">
                <div v-for="roommate in roommate_group.members" :key="roommate.id">
                    <mdc-checkbox
                        :label="roommate.name + ' (' + roommate.email + ')'"
                        :value="roommate.id"
                        v-model="checkedIds" />
                </div>
            </div>
        </mdc-dialog>
        <mdc-textfield outline label="Filter" style="width: 100%" v-model="filterField" />
        <div class="mdc-data-table">
            <table class="mdc-data-table__content">
                <thead>
                    <tr>
                        <th class="mdc-data-table--sortable">Date</th>
                        <th class="mdc-data-table--sortable">Expense</th>
                        <th class="mdc-data-table--sortable">Paid By</th>
                        <th class="mdc-data-table--sortable">Owed By</th>
                        <th class="mdc-data-table--sortable mdc-data-table--numeric">Cost</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="transactions.length === 0">
                        <td colspan="5">No Transactions Found</td>
                    </tr>
                    <tr v-for="transaction in filterTransactions(transactions)" :key="transaction.id">
                        <td>{{ toDateString(transaction.created) }}</td>
                        <td>{{ transaction.description }}</td>
                        <td>
                            {{ getMemberName(transaction.owee) }}
                        </td>
                        <td>
                            {{ transaction.owers.map(getMemberName).join(', ') }}
                        </td>
                        <td class="mdc-data-table--numeric">${{ transaction.value }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import date from '../../date';

export default {
    name: 'transactions',
    props: {
        root: Object,
        roommate_group: Object,
        group: Object
    },
    data() {
        return {
            transactions: this.group.transactions,

            createTransactionExpenseTextField: "",
            createTransactionCostTextField: "",
            createTransactionDialogOpen: false,

            filterField: "",

            listenBlocker: false,
            checkedIds: [],

            filterTransactions(transactions) {
                if (this.filterField) {
                    try {
                        const regex = new RegExp(this.filterField, 'gi');
                        return transactions.filter(
                            (transaction) => {
                                const tests = [
                                    regex.test(transaction.description),
                                    regex.test(this.getMemberName(transaction.owee)),
                                    regex.test(transaction.owers.map(this.getMemberName).join(', ')),
                                    regex.test(this.toDateString(transaction.created)),
                                    regex.test(transaction.value)
                                ];
                                return tests.some(i => i);
                            }
                        );
                    } catch(err) { };
                }
                return transactions;
            }
        }
    },
    mounted() {
        this.selectAll();
    },
    methods: {
        toDateString: date.toDateString,
        selectAll() {
            this.checkedIds = this.roommate_group.members.map((item) => item.id);
        },
        deselectAll() {
            this.checkedIds = [];
        },
        reloadTransactions() {
            axios.get(`/api/group/${this.group.roommate_group}/expenses/${this.group.id}/transactions`).then(response => {
                this.transactions = response.data;
            }).catch(error => {
                this.root.showRequestError(error);
            });
        },
        createTransactionValidate({ accept }) {
            if (!this.createTransactionExpenseTextField.trim()) {
                this.root.showError("Expense description cannot be empty!");
                return;
            }
            if (!this.createTransactionCostTextField.trim()) {
                this.root.showError("You must enter a cost!");
                return;
            }
            if (this.checkedIds.length === 0) {
                this.root.showError("The cost must be owed by at least one person!");
                return;
            }
            accept();
        },
        createTransaction() {
            axios.post(`/api/group/${this.group.roommate_group}/expenses/${this.group.id}/transactions/add`,
            {
                owee: this.root.user.id,
                owers: this.checkedIds,
                value: this.createTransactionCostTextField.trim(),
                description: this.createTransactionExpenseTextField.trim()
            }).then(response => {
                this.reloadTransactions();
                this.selectAll();
                this.createTransactionExpenseTextField = "";
                this.createTransactionCostTextField = "";
            }).catch(error => {
                this.root.showRequestError(error);
            });
        },
        formatCost() {
           if (this.listenBlocker) return;
            const val = +this.createTransactionCostTextField.replace(/\D/g,'');
            this.createTransactionCostTextField = (+val / 100).toFixed(2);
        },
        keyDown(event) {
            if (event.key.length === 1 && !event.ctrlKey && !event.altKey) {
                this.createTransactionCostTextField += event.key;
                event.preventDefault();
            } else if (event.key === "Backspace") {
                this.createTransactionCostTextField = this.createTransactionCostTextField.slice(0, -1);
                event.preventDefault();
            }
            this.listenBlocker = true;
            this.$refs.costBox.blur();
            this.listenBlocker = false;
            this.formatCost();
            this.listenBlocker = true;
            this.$refs.costBox.focus();
            this.listenBlocker = false;
        },
        getMemberName(id) {
            const member = this.roommate_group.members.find((member) => member.id === id);
            if (member === undefined) {
                // TODO: Handle case where user has left the group but transactions
                //   still remain on him. What name shall we display?
                return "User";
            }
            return member.name;
        }
    }
}
</script>

