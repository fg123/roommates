<template>
    <div class="mdc-typography">
        <mdc-button outlined @click="goBack">
            <i class="material-icons mdc-button__icon">arrow_back</i>Back
        </mdc-button>
        <mdc-title>
            {{ groupName }}
            <div style="float: right">
                <mdc-button raised
                    @click="createTransactionDialogOpen = true"
                    class="hide-on-mobile">
                    New Transaction
                </mdc-button>
                <mdc-button raised
                    style="background: #911313"
                    v-if="canDeleteGroup"
                    @click="deleteExpenseGroupConfirmDialogOpen = true">
                    Delete Group
                </mdc-button>
            </div>
        </mdc-title>
        <mdc-fab
            fixed
            icon="add"
            style="background-color: var(--mdc-theme-primary, #6200ee);"
            @click="createTransactionDialogOpen = true"
            class="hide-on-desktop"></mdc-fab>
        <mdc-dialog v-model="createTransactionDialogOpen"
                    title="New Transaction"
                    accept="Create"
                    cancel="Cancel"
                    @accept="createTransaction"
                    @cancel="createTransactionDialogOpen = false"
                    @validate="createTransactionValidate">
            <mdc-textfield v-model="createTransactionExpenseTextField" label="Expense Description" fullwidth box />
            <mdc-textfield
                class="costTextField"
                v-model="createTransactionCostTextField"
                box
                leading-icon="attach_money"
                @blur="formatCost"
                @focus="selectCostTextField"
                type="number"
                step="0.01"
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
        <div style="width: 100%">
            <mdc-data-table>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Expense</th>
                            <th>Paid By</th>
                            <th>Owed By</th>
                            <th class="right">Cost</th>
                            <th style="width: 150px">
                                <!--Invalidated Column-->
                            </th>
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
                                <td v-html="getOwersString(transaction)"></td>
                                <td class="right"
                                    :class="{ strikeThrough: transaction.isInvalidated }">
                                    ${{ transaction.value }}
                                </td>
                                <td class="right">
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
            </mdc-data-table>
            <div style="margin-top: 10px; text-align: center;">
                <mdc-caption>
                    You can only delete the expense group when all transactions are invalidated.
                </mdc-caption>
            </div>
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
        <mdc-dialog v-model="deleteExpenseGroupConfirmDialogOpen"
            title="Are you sure you want to delete this expense group?" accept="Confirm" cancel="Cancel"
            @accept="deleteExpenseGroup" @cancel="deleteExpenseGroupConfirmDialogOpen = false">
            Deleting this expense group is irreversible!
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

<style>

.costTextField input {
    /* Push number upwards to line up with dollar icon */
    padding-bottom: 15px!important;
    font-weight: 500;


    /* Hide spinners for number inputs. */
    -moz-appearance:textfield;
}

.costTextField input::-webkit-outer-spin-button,
.costTextField input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
</style>

<script>
import axios from 'axios';
import date from '../../date';
import dataTable from '../../data-table.vue';

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

            deleteExpenseGroupConfirmDialogOpen: false,

            filterField: "",

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
    computed: {
        canDeleteGroup() {
            return this.transactions.every(t => t.isInvalidated);
        }
    },
    components: {
        'mdc-data-table': dataTable
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
        getOwersString(transaction) {
            /* transaction.owers is a delta mapping, first we calculate if the
             * owee is also in the map, if so we need to correct for the amount
             * he/she gets back */
            const owersMap = JSON.parse(JSON.stringify(transaction.owers));
            if (transaction.owee in owersMap) {
                const valueInCents = Number(transaction.value) * 100;
                owersMap[transaction.owee] += valueInCents;
            }

            return Object.keys(owersMap)
                .filter(member => owersMap[member] > 0)
                .map(memberId =>
                    `${this.getMemberName(memberId)} ($${
                        (owersMap[memberId] / 100).toFixed(2)})`)
                .join('<br>');
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
        deleteExpenseGroup() {
            axios.delete(`/api/group/${this.$route.params.groupId}` +
                `/expenses/${this.$route.params.expenseGroupId}`).then(response => {
                this.goBack();
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
            if (parseFloat(this.createTransactionCostTextField) <= 0) {
                this.root.showError("You must enter a non-negative, non-zero cost!");
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
            /* Strip non digit, comma, or periods! */
            const value = this.createTransactionCostTextField.replace(/[^\d\.,-]/g, '');
            let numerical = +value;
            if (isNaN(numerical)) {
                numerical = 0;
            }
            this.createTransactionCostTextField = numerical.toFixed(2);
        },
        selectCostTextField() {
            this.$refs.costBox.$el.querySelector('input').select();
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
