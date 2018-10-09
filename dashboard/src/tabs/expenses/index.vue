<template>
    <router-view :root="root" :roommate_group="group"></router-view>
</template>

<script>
import expenseGroupList from './expense-group-list.vue';
import transactions from './transactions.vue';
import Routes from '../../routes';

export default {
    name: 'expenses',
    props: {
        root: Object,
        group: Object
    },
    mounted() {
        if (!this.$route.params.expenseGroupId) {
            this.$router.replace({ name: 'Expenses-list' });
        }
    },
    routes: new Routes([
        {
            name: 'Expenses-list',
            path: 'list',
            component: expenseGroupList
        },
        {
            name: 'Expenses-transactions',
            path: ':expenseGroupId',
            component: transactions
        }
    ])
}
</script>
