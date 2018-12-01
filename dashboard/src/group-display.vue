<template>
    <div>
        <div class="tab-bar mdc-theme--primary-bg">
            <mdc-tab-bar class="mdc-theme--primary-bg">
                <router-link tag="span" v-for="tab in tabs" :to="{ name: tab.name }" :key="tab.name">
                    <mdc-tab class="tab-item" :key="tab.name" :active="isActive(tab.name)">
                        {{ tab.name }}
                    </mdc-tab>
                </router-link>
            </mdc-tab-bar>
        </div>
        <div class="content">
            <router-view
                v-if="fullGroup !== undefined"
                :group="fullGroup"
                :root="root"
                :key="fullGroup.id"
                :reloadGroup="reloadGroup"></router-view>
        </div>
    </div>
</template>

<script>
import axios from 'axios';

import manageGroupTab from './tabs/manage-group';
import groceriesTab from './tabs/groceries';
import expensesTab from './tabs/expenses';

import VueRouter from 'vue-router';
import Routes from './routes';

function Tab(name, route, component) {
    return {
        name, route, component
    };
}

const tabs = [
    // Tab("Overview", "overview", undefined),
    Tab("Expenses", "expenses", expensesTab),
    Tab("Groceries", "groceries", groceriesTab),
    // Tab("Chores", "chores", undefined),
    Tab("Manage Group", "manage", manageGroupTab),
];

export default {
    name: 'group-display',
    props: {
        root: Object
    },
    data() {
        return {
            fullGroup: undefined,
            tabs: tabs
        }
    },
    routes: new Routes([
            {
                path: '',
                redirect: { name: tabs[0].name }
            }
        ].concat(
            tabs.map(t => {
                return { name: t.name, path: t.route, component: t.component };
            })
        )
    ),
    mounted() {
        this.reloadGroup();
    },
    watch: {
        '$route': function(to, from) {
            if (to.params.groupId !== from.params.groupId) {
                this.fullGroup = undefined;
                this.reloadGroup();
            }
        }
    },
    methods: {
        isActive(name) {
            return this.$route.matched.some(m => m.name === name);
        },
        reloadGroup() {
            axios.get(`/api/group/${this.$route.params.groupId}`).then(response => {
                this.fullGroup = response.data;
            }).catch(error => {
                this.root.showRequestError(error);
            });
        }
    }
};
</script>

<style>
.tab-bar {
    width: 100%;
    text-align: left;
}

.tab-bar nav {
    margin: 0px!important;
}

.tab-item {
    color: #FFF!important;
}

.mdc-tab-bar__indicator {
    background-color: #FFF!important;
}

.content {
    padding: 24px 48px;
}

@media only screen and (max-width: 840px) {
    /* For mobile: */
    .content {
        padding: 16px 8px;
    }
}
</style>
