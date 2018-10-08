<template>
    <div>
        <mdc-title>
            Expense Groups
            <mdc-button raised style="float: right" @click="createExpenseGroupDialogOpen = true">
                New Expense Group
            </mdc-button>
        </mdc-title>
        <mdc-text v-if="expense_groups.length === 0">
            You have no expense groups.
        </mdc-text>
        <mdc-layout-grid style="padding: 0px;">
            <mdc-layout-cell
                v-for="expense_group in expense_groups"
                :key="expense_group.id">
                <expense-group-card
                    :group="roommate_group"
                    :expense_group="expense_group"
                    :clicked_callback="() => { navigateTo(expense_group) }">
                </expense-group-card>
            </mdc-layout-cell>
        </mdc-layout-grid>
        <mdc-dialog v-model="createExpenseGroupDialogOpen"
                    title="Create an Expense Group"
                    accept="Create"
                    cancel="Cancel"
                    @accept="createExpenseGroup"
                    @cancel="createExpenseGroupDialogOpen = false"
                    @validate="createExpenseGroupValidate">
                <mdc-text>An expense group lets you manage sets of related transactions.
                    A classic way to group expenses within a roommate situation is by the month.</mdc-text>
                <mdc-textfield v-model="createExpenseGroupDialogField" label="Expense Group Name" fullwidth />
        </mdc-dialog>
    </div>
</template>

<script>
import expenseGroupCard from './expense-group-card.vue';
import date from '../../date';
import axios from 'axios';
export default {
    name: 'expense-group-list',
    props: {
        root: Object,
        roommate_group: Object
    },
    data() {
        return {
            createExpenseGroupDialogOpen: false,
            createExpenseGroupDialogField: date.toMonthYearString(Date.now()),
            expense_groups: []
        }
    },
    components: {
        expenseGroupCard
    },
    mounted() {
        this.reloadList();
    },
    methods: {
        navigateTo(expense_group) {
            this.$router.push({
                name: 'Expenses-transactions',
                params: {
                    expenseGroupId: expense_group.id
                }
            });
        },
        reloadList() {
            axios.get(`/api/group/${this.$route.params.groupId}/expenses`).then(response => {
                this.expense_groups = response.data;
                this.expense_groups.sort((a, b) => b.modified - a.modified);
            }).catch(error => {
                this.root.showRequestError(error);
            });
        },
        createExpenseGroupValidate({ accept }) {
            if (this.createExpenseGroupDialogField.trim()) {
                accept();
            }
        },
        createExpenseGroup() {
            axios.post(
                `/api/group/${this.$route.params.groupId}/expenses/add`,
                { name: this.createExpenseGroupDialogField.trim() }
            ).then(() => {
                this.reloadList();
            }).catch(error => {
                this.root.showRequestError(error);
            });
        },
    }
}
</script>
