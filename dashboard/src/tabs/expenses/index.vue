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
            <mdc-layout-cell v-for="expense_group in expense_groups"
                    :key="expense_group.id">
                <expense-group-card
                    :group="group" :expense_group="expense_group">
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
import axios from 'axios';
import expenseGroupCard from './expense-group-card.vue';
import date from '../../date';

export default {
    name: 'expenses',
    props: {
        root: Object,
        group: Object
    },
    data() {
        return {
            createExpenseGroupDialogOpen: false,
            createExpenseGroupDialogField: date.toMonthYearString(Date.now()),

            expense_groups: [],

            pendingGroceryItem: ""
        }
    },
    mounted() {
        this.reloadList();
    },
    components: {
        expenseGroupCard
    },
    methods: {
        reloadList() {
            axios.get(`/api/group/${this.group.id}/expenses`).then(response => {
                this.expense_groups = response.data;
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
                `/api/group/${this.group.id}/expenses/add`,
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

<style>

</style>
