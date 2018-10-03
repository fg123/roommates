<template>
    <div>
        <mdc-title>Grocery List</mdc-title>
        <mdc-layout-grid style="padding: 0px;">
            <mdc-layout-cell desktop=6 tablet=6 phone=4>
                <mdc-list bordered two-line>
                    <mdc-list-item style="height: auto; padding-top: 4px; padding-bottom: 4px">
                        <mdc-textfield v-model="pendingGroceryItem" label="Add to List" fullwidth @keyup.enter="addEntry"></mdc-textfield>
                        <mdc-button slot="end-detail" @click="addEntry" raised style="margin-left: 10px;">
                            <i class="material-icons mdc-button__icon">add_shopping_cart</i>add
                        </mdc-button>
                    </mdc-list-item>
                    <mdc-list-item v-bind:key="groceryEntry.id" v-for="groceryEntry in groceryList">
                        <span>{{ groceryEntry.item }}</span>
                        <span slot="secondary">Added by {{ groceryEntry.added_by.name }} on {{ toDateString(groceryEntry.created_time) }}</span>
                        <mdc-button slot="end-detail" @click="removeEntry(groceryEntry.id)">
                            <i class="material-icons mdc-button__icon">check</i>done
                        </mdc-button>
                    </mdc-list-item>
                </mdc-list>
            </mdc-layout-cell>
        </mdc-layout-grid>
    </div>
</template>

<script>
import axios from 'axios';
import date from '../../date.js';

export default {
    name: 'groceries',
    props: {
        root: Object,
        group: Object
    },
    data() {
        return {
            groceryList: [],

            pendingGroceryItem: ""
        }
    },
    mounted() {
        this.reloadList();
    },
    methods: {
        toDateString: date.toDateString,
        addEntry() {
            const item = this.pendingGroceryItem;
            this.pendingGroceryItem = "";
            axios.post(`/api/group/${this.group.id}/groceries/add`, { item: item }).then(response => {
                this.reloadList();
            }).catch(error => {
                this.root.showRequestError(error);
                this.pendingGroceryItem = item;
            });
        },
        removeEntry(id) {
            axios.delete(`/api/group/${this.group.id}/groceries/${id}`).then(response => {
                this.reloadList();
            }).catch(error => {
                this.root.showRequestError(error);
            });
        },
        reloadList() {
            axios.get(`/api/group/${this.group.id}/groceries`).then(response => {
                this.groceryList = response.data;
            }).catch(error => {
                this.root.showRequestError(error);
            });
        }
    }
}
</script>

<style>

</style>
