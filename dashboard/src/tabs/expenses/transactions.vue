<template>
    <div class="mdc-typography">
        <mdc-button outlined @click="goBack">
            <i class="material-icons mdc-button__icon">arrow_back</i>Back
        </mdc-button>
        <mdc-title>
            {{ groupName }}
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
                        <th class="mdc-data-table--sortable"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="transactions.length === 0">
                        <td colspan="5">No Transactions Found</td>
                    </tr>
                    <template v-for="transaction in filterTransactions(transactions)">
                        <tr :key="transaction.id"
                            :class="{ disabled: transaction.isInvalidated }">
                            <td>{{ toDateString(transaction.created) }}</td>
                            <td>{{ transaction.description }}</td>
                            <td>
                                {{ getMemberName(transaction.owee) }}
                            </td>
                            <td>
                                {{ Object.keys(transaction.owers)
                                    .filter(member => transaction.owers[member] > 0)
                                    .map(getMemberName)
                                    .join(', ') }}
                            </td>
                            <td class="mdc-data-table--numeric"
                                :class="{ strikeThrough: transaction.isInvalidated }">
                                ${{ transaction.value }}
                            </td>
                            <td class="mdc-data-table--numeric">
                                <mdc-button
                                    @click="openInvalidateConfirmDialog(transaction.id)"
                                    outlined
                                    :disabled="transaction.isInvalidated"
                                    style="text-decoration: none!important">
                                    {{ transaction.isInvalidated ? "Invalidated" : "Invalidate" }}
                                </mdc-button>
                            </td>
                        </tr>
                        <!-- Show Invalidated Reason -->
                        <tr v-if="transaction.isInvalidated" :key="transaction.id + 'invalidated'" style="color: #999">
                            <td colspan="6">
                                This transaction was invalidated
                                    on {{ toDateString(transaction.invalidatedTime) }}
                                    by {{ getMemberName(transaction.invalidatedBy) }}:
                                    "{{ transaction.invalidatedReason }}".
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
        <mdc-dialog v-model="invalidateConfirmDialogOpen"
                    title="Invalidate Transaction?"
                    accept="Invalidate"
                    cancel="Cancel"
                    @accept="invalidateTransaction"
                    @cancel="cancelInvalidate"
                    @validate="invalidateConfirmDialogValidate">
            <mdc-textfield
                v-model="invalidateConfirmReason"
                label="Reason for Invalidating"
                fullwidth required />
        </mdc-dialog>
    </div>
</template>

<style scoped>
.strikeThrough {
    text-decoration: line-through;
}
.disabled {
    border-bottom: 0px!important;
}
</style>

<script>
import axios from 'axios';
import date from '../../date';

export default {
    name: 'transactions',
    props: {
        root: Object,
        roommate_group: Object
    },
    data() {
        return {
            transactions: [],
            groupName: "",

            createTransactionExpenseTextField: "",
            createTransactionCostTextField: "",
            createTransactionDialogOpen: false,

            filterField: "",

            listenBlocker: false,
            checkedIds: [],

            pendingInvalidateId: undefined,
            invalidateConfirmDialogOpen: false,
            invalidateConfirmReason: "",

            filterTransactions(transactions) {
                if (this.filterField) {
                    try {
                        const regex = new RegExp(this.filterField, 'gi');
                        return transactions.filter(
                            (transaction) => {
                                const tests = [
                                    regex.test(transaction.description),
                                    regex.test(this.getMemberName(transaction.owee)),
                                    regex.test(Object.keys(transaction.owers).map(this.getMemberName).join(', ')),
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
        this.reloadTransactions();
        this.selectAll();
    },
    methods: {
        toDateString: date.toDateString,
        goBack() {
            this.$router.push({ name: 'Expenses-list' });
        },
        selectAll() {
            this.checkedIds = this.roommate_group.members.map((item) => item.id);
        },
        deselectAll() {
            this.checkedIds = [];
        },
        reloadTransactions() {
            axios.get(`/api/group/${this.$route.params.groupId}` +
                `/expenses/${this.$route.params.expenseGroupId}`).then(response => {
                this.groupName = response.data.name;
                this.transactions = response.data.transactions;
            }).catch(error => {
                this.root.showRequestError(error);
            });
        },
        openInvalidateConfirmDialog(id) {
            this.invalidateConfirmDialogOpen = true;
            this.pendingInvalidateId = id;
        },
        invalidateTransaction() {
            if (this.pendingInvalidateId !== undefined) {
                axios.post(`/api/group/${this.$route.params.groupId}` +
                    `/expenses/${this.$route.params.expenseGroupId}/transaction` +
                    `/${this.pendingInvalidateId}/invalidate`,
                    { reason: this.invalidateConfirmReason }
                ).then(response => {
                    this.reloadTransactions();
                }).catch(error => {
                    this.root.showRequestError(error);
                });
            }
            this.pendingInvalidateId = undefined;
            this.invalidateConfirmReason = "";
        },
        cancelInvalidate() {
            this.pendingInvalidateId = undefined;
            this.invalidateConfirmReason = "";
            this.invalidateConfirmDialogOpen = false;
        },
        invalidateConfirmDialogValidate({ accept }) {
            if (!this.invalidateConfirmReason.trim()) {
                this.root.showError("Invalidate reason cannot be empty!");
                return;
            }
            accept();
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
            axios.post(`/api/group/${this.$route.params.groupId}/expenses/${this.$route.params.expenseGroupId}/transactions/add`,
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

