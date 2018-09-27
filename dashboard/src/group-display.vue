<template>
    <div>
        <div class="tab-bar mdc-theme--primary-bg">
            <mdc-tab-bar class="mdc-theme--primary-bg">
                <mdc-tab
                    class="tab-item"
                    v-for="tab in tabs"
                    v-on:click="selectedTab = tab"
                    v-bind:key="tab[0]"
                    v-bind:active="selectedTab && selectedTab[0] == tab[0]">
                        {{ tab[0] }}
                </mdc-tab>
            </mdc-tab-bar>
        </div>
        <div class="content">
            <component
                v-if="fullGroup !== undefined && selectedTab !== undefined && selectedTab[1] !== undefined"
                v-bind:is="selectedTab[1]"
                v-bind:group="fullGroup"
                v-bind:root="root"
                v-bind:reloadGroup="reloadGroup" />
        </div>
    </div>
</template>

<script>
import axios from 'axios';

import manageGroupTab from './tabs/manage-group';
import groceriesTab from './tabs/groceries';

export default {
    name: 'group-display',
    props: {
        root: Object,
        group: Object
    },
    data() {
        return {
            selectedTab: undefined,
            tabs: [
                ["Overview", undefined],
                ["Expenses", undefined],
                ["Groceries", groceriesTab],
                ["Chores", undefined],
                ["Manage Group", manageGroupTab],
            ],
            fullGroup: undefined
        }
    },
    mounted() {
        this.resetTabs();
        this.reloadGroup();
    },
    watch: {
        group: function() {
            this.resetTabs();
            this.reloadGroup();
        }
    },
    methods: {
        resetTabs() {
            this.tabs = this.tabs.filter(item => item[1] !== undefined);
            if (this.tabs.length > 0) {
                this.selectedTab = this.tabs[0];
            } else {
                this.selectedTab = undefined;
            }
        },
        reloadGroup() {
            axios.get(`/api/group/${this.group.id}`).then(response => {
                this.fullGroup = response.data;
            }).catch(error => {
                this.root.showRequestError(error);
            });
        }
    },
    components: {
        manageGroupTab
    },
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
</style>
