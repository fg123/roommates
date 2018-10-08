<template>
    <mdc-layout-app>
        <mdc-drawer slot="drawer" ref="drawer" toggle-on="toggle-drawer">
            <div class="drawer-header">
                <img :src="user && user.picture" class="user-avatar rounded">
                <div><mdc-subheading style="margin-bottom: 0px;">{{ user && user.name }}</mdc-subheading></div>
                <div><mdc-caption>{{ user && user.email }}</mdc-caption></div>
            </div>
            <mdc-drawer-list>
                <mdc-list-divider />
                <template v-if="(user && user.invitations || []).length != 0">
                    <div style="width: 100%; text-align: center">
                        <mdc-caption>Invitations</mdc-caption>
                    </div>
                    <div class="inviteSubDrawer">
                        <mdc-drawer-item
                            :key="invite.id"
                            v-for="invite in user && user.invitations">
                            <div class="innerListItem">
                                <span class="mdc-list-item__graphic"><i aria-hidden="true" class="material-icons">group_add</i></span>
                                {{ invite.name }}
                            </div>
                            <div>
                                <mdc-button unelevated dense @click="acceptInvite(invite)">Accept</mdc-button>
                                <mdc-button outlined dense @click="declineInvite(invite)">Decline</mdc-button>
                            </div>
                        </mdc-drawer-item>
                    </div>
                    <mdc-list-divider />
                </template>
                <div style="width: 100%; text-align: center">
                    <mdc-caption>Your Groups</mdc-caption>
                </div>
                <template v-if="(user && user.groups || []).length !== 0">
                     <router-link tag="span"
                        :to="`/${group.id}`"
                        v-for="group in user && user.groups"
                        :key="group.id">
                        <mdc-drawer-item
                            start-icon="group"
                            :key="group.id + 'drawer'"
                            :activated="isActiveGroup(group.id)">
                            {{ group.name }}
                        </mdc-drawer-item>
                    </router-link>
                    <mdc-list-divider />
                </template>
                <mdc-drawer-item @click="openCreateGroupDialog">Create a Group</mdc-drawer-item>
            </mdc-drawer-list>
        </mdc-drawer>

        <main>
            <mdc-toolbar>
                <mdc-toolbar-row>
                    <mdc-toolbar-section align-start>
                        <mdc-toolbar-menu-icon event="toggle-drawer"></mdc-toolbar-menu-icon>
                        <mdc-toolbar-title>{{
                            getTitle($route.params.groupId)
                        }}</mdc-toolbar-title>
                    </mdc-toolbar-section>
                    <mdc-toolbar-section align-end>
                        <mdc-toolbar-icon @click="logout" icon="exit_to_app"></mdc-toolbar-icon>
                    </mdc-toolbar-section>
                </mdc-toolbar-row>
            </mdc-toolbar>

            <router-view
                v-if="canShowGroup($route.params.groupId)"
                :root="this"></router-view>

            <mdc-dialog v-model="createGroupDialogOpen"
                    title="Create a Group"
                    accept="Create"
                    cancel="Cancel"
                    @accept="createGroup"
                    @cancel="createGroupDialogOpen = false"
                    @validate="createGroupValidate">
                <mdc-textfield v-model="createGroupDialogField" label="Group Name" fullwidth />
            </mdc-dialog>
            <mdc-snackbar v-model="errorSnackbar"/>
        </main>
    </mdc-layout-app>
</template>

<script>
import axios from 'axios';
import VueRouter from 'vue-router';

import Routes from './routes';
import groupDisplay from './group-display.vue';

export default {
    data () {
        return {
            user: undefined,

            createGroupDialogOpen: false,
            createGroupDialogField: "",
            errorSnackbar: undefined,
        }
    },
    mounted () {
        console.log(this.$router);
        console.log(this.$route);
        this.loadUserAndGroups();
    },
    routes: new Routes([{
        path: '',
        component: {
            template: `
                <div class="content">
                    <mdc-title>You should create a group from the sidebar!</mdc-title>
                </div>`
        }
    }, {
        path: '/:groupId',
        component: groupDisplay
    }]),
    methods: {
        canShowGroup(id) {
            return !!(this.user && this.user.groups && id &&
                this.user.groups.some(i => i.id === id));
        },
        getTitle(id) {
            if (this.user && this.user.groups && id) {
                const selected = this.user.groups.find(i => i.id === id);
                if (selected) return selected.name;
            }
            return "No group selected!"
        },
        isActiveGroup(id) {
            return this.$route.params.groupId === id;
        },
        openCreateGroupDialog() {
            this.createGroupDialogOpen = true;
            this.createGroupDialogField = "";
        },
        createGroupValidate({ accept }) {
            if (this.createGroupDialogField.trim()) {
                accept();
            }
        },
        createGroup() {
            axios.post('/api/groups', { name: this.createGroupDialogField.trim() }).then(() => {
                this.loadUserAndGroups();
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        acceptInvite(invite) {
            const id = invite.id;
            axios.post(`/api/group/${id}/acceptInvite`).then(() => {
                this.loadUserAndGroups();
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        declineInvite(invite) {
            const id = invite.id;
            axios.post(`/api/group/${id}/declineInvite`).then(() => {
                this.loadUserAndGroups();
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        loadUserAndGroups() {
            axios.get('/api/user').then(response => {
                this.user = response.data;
                if (this.user.groups.length > 0 && !this.canShowGroup(this.$route.params.groupId)) {
                    this.$router.push('/' + this.user.groups[0].id);
                }
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        showError(message) {
            this.errorSnackbar = {
                message
            }
        },
        showRequestError(error) {
            const response = error.response;
            this.showError(`Error (${response.status}): ${response.data}`);
        },
        logout() {
            window.location.href = '/logout';
        }
    }
};

</script>

<style>

:root {
  --mdc-theme-primary: #212121!important;
  --mdc-theme-secondary: #41B883!important;
  --mdc-theme-background: #fff!important;
}

.mdc-text-field--focused:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
    color: #212121!important;
}

.mdc-text-field--focused:not(.mdc-text-field--disabled) .mdc-floating-label {
    color: #212121!important;
}
.drawer-header {
    text-align: center;
    padding: 16px;
}

img.rounded {
    border-radius: 50%;
}

.user-avatar {
    width: 96px;
    height: 96px;
    display: inline-block;
}

.mdc-dialog__surface {
    width: 50%!important;
}

div.inviteSubDrawer a.mdc-drawer-item {
    flex-direction: column;
    height: auto;
    padding-bottom: 8px;
}

div.inviteSubDrawer div.innerListItem {
    display: flex;
    align-items: center;
    padding: 0px;
    width: 100%;
    height: 48px
}
</style>

<style>
.mdc-data-table + .mdc-data-table {
  margin-top: 16px;
}

:root {
  --mdc-data-table-light-theme-bg-color: #fff;
  --mdc-data-table-dark-theme-bg-color: #303030;
  --mdc-data-table-light-theme-border-color: #e0e0e0;
  --mdc-data-table-dark-theme-border-color: #4f4f4f;
  --mdc-data-table-light-theme-row-hover: #eee;
  --mdc-data-table-dark-theme-row-hover: #414141;
  --mdc-data-table-light-theme-row-selected: #f5f5f5;
  --mdc-data-table-dark-theme-row-selected: #3a3a3a;
}
.mdc-data-table {
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),
    0 1px 5px 0 rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.87) !important;
  color: var(
    --mdc-theme-text-primary-on-background,
    rgba(0, 0, 0, 0.87)
  ) !important;
  -webkit-box-orient: vertical;
  -ms-flex-flow: column nowrap;
  flex-flow: column nowrap;
}
.mdc-data-table,
.mdc-data-table__header {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-direction: normal;
}
.mdc-data-table__header {
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-pack: justify;
  -ms-flex-pack: justify;
  justify-content: space-between;
  height: 64px;
  -webkit-box-orient: horizontal;
  -ms-flex-flow: row nowrap;
  flex-flow: row nowrap;
  padding: 0 14px 0 24px;
  -webkit-box-flex: 0;
  -ms-flex: none;
  flex: none;
}
.mdc-data-table__header-title {
  font-weight: 400;
  font-size: 20px;
  display: inline-block;
  margin: 0;
}
.mdc-data-table__header-actions {
  color: rgba(0, 0, 0, 0.54) !important;
  color: var(
    --mdc-theme-text-secondary-on-background,
    rgba(0, 0, 0, 0.54)
  ) !important;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: reverse;
  -ms-flex-flow: row-reverse nowrap;
  flex-flow: row-reverse nowrap;
}
.mdc-data-table__header-actions :nth-last-child(n + 2) {
  margin-left: 24px;
}
.mdc-data-table__content {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.mdc-data-table__content tr:first-child,
.mdc-data-table__content tr:nth-last-child(n + 2) {
  border-bottom: 1px solid #e0e0e0;
}
.mdc-data-table__content tr.mdc-data-table--selected {
  background-color: #f5f5f5;
}
.mdc-data-table__content td,
.mdc-data-table__content th {
  text-align: left;
  padding: 12px 24px;
  vertical-align: middle;
}
.mdc-data-table__content td.mdc-data-table--numeric,
.mdc-data-table__content th.mdc-data-table--numeric {
  text-align: right;
}
.mdc-data-table__content th {
  font-size: 13px;
  line-height: 17px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  color: rgba(0, 0, 0, 0.54) !important;
  color: var(
    --mdc-theme-text-secondary-on-background,
    rgba(0, 0, 0, 0.54)
  ) !important;
}
.mdc-data-table__content th.mdc-data-table--sortable {
  cursor: pointer;
}
.mdc-data-table__content th.mdc-data-table--sortable.mdc-data-table--sort-asc,
.mdc-data-table__content th.mdc-data-table--sortable.mdc-data-table--sort-desc {
  color: rgba(0, 0, 0, 0.87) !important;
  color: var(
    --mdc-theme-text-primary-on-background,
    rgba(0, 0, 0, 0.87)
  ) !important;
}
.mdc-data-table__content
  th.mdc-data-table--sortable.mdc-data-table--sort-asc:before,
.mdc-data-table__content
  th.mdc-data-table--sortable.mdc-data-table--sort-desc:before {
  font-family: Material Icons;
  font-size: 16px;
  vertical-align: text-bottom;
  line-height: 16px;
  margin-right: 8px;
}
.mdc-data-table__content
  th.mdc-data-table--sortable.mdc-data-table--sort-asc:before {
  content: "arrow_downward";
}
.mdc-data-table__content
  th.mdc-data-table--sortable.mdc-data-table--sort-desc:before {
  content: "arrow_upward";
}
.mdc-data-table__content td {
  font-size: 14px;
}
.mdc-data-table__content tbody tr.disabled {
  color: #999!important;
}
/* .mdc-data-table__content tbody tr:hover {
  background-color: #eee;
} */
.mdc-data-table__footer {
  color: rgba(0, 0, 0, 0.54) !important;
  color: var(
    --mdc-theme-text-secondary-on-background,
    rgba(0, 0, 0, 0.54)
  ) !important;
  border-top: 1px solid #e0e0e0;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-align: center;
  height: 56px;
  -ms-flex-flow: row nowrap;
  flex-flow: row nowrap;
  padding: 0 14px 0 0;
  -webkit-box-flex: 0;
  -ms-flex: none;
  flex: none;
  font-size: 13px;
}
.mdc-data-table__footer,
.mdc-data-table__footer .mdc-data-table__per-page {
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: normal;
  -webkit-box-pack: end;
  -ms-flex-pack: end;
  justify-content: flex-end;
}
.mdc-data-table__footer .mdc-data-table__per-page {
  display: -webkit-inline-box;
  display: -ms-inline-flexbox;
  display: inline-flex;
  -ms-flex-flow: row nowrap;
  flex-flow: row nowrap;
  -ms-flex-align: center;
  width: 64px;
  background-repeat: no-repeat;
  background-position: right 7px center;
  text-align: right;
  cursor: pointer;
}
.mdc-data-table__footer .mdc-data-table__per-page:after {
  font-family: Material Icons;
  font-size: 20px;
  content: "arrow_drop_down";
  margin: 0 2px;
}
.mdc-data-table__footer .mdc-data-table__results {
  margin-left: 32px;
}
.mdc-data-table__footer .mdc-data-table__prev {
  margin-left: 32px;
  cursor: pointer;
}
.mdc-data-table__footer .mdc-data-table__next {
  margin-left: 24px;
  cursor: pointer;
}
.mdc-data-table [dir="rtl"] td,
.mdc-data-table [dir="rtl"] th,
.mdc-data-table[dir="rtl"] td,
.mdc-data-table[dir="rtl"] th,
.mdc-data-table__content[dir="rtl"] td,
.mdc-data-table__content[dir="rtl"] th {
  text-align: right;
}
.mdc-data-table [dir="rtl"] td.mdc-data-table--numeric,
.mdc-data-table [dir="rtl"] th.mdc-data-table--numeric,
.mdc-data-table[dir="rtl"] td.mdc-data-table--numeric,
.mdc-data-table[dir="rtl"] th.mdc-data-table--numeric,
.mdc-data-table__content[dir="rtl"] td.mdc-data-table--numeric,
.mdc-data-table__content[dir="rtl"] th.mdc-data-table--numeric {
  text-align: left;
}
.mdc-data-table
  [dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:before,
.mdc-data-table
  [dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:before,
.mdc-data-table[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:before,
.mdc-data-table[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:before,
.mdc-data-table__content[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:before,
.mdc-data-table__content[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:before {
  display: none;
}
.mdc-data-table
  [dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:after,
.mdc-data-table
  [dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:after,
.mdc-data-table[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:after,
.mdc-data-table[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:after,
.mdc-data-table__content[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:after,
.mdc-data-table__content[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:after {
  font-family: Material Icons;
  font-size: 16px;
  vertical-align: text-bottom;
  line-height: 16px;
  margin-left: 8px;
}
.mdc-data-table
  [dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:after,
.mdc-data-table[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:after,
.mdc-data-table__content[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-asc:after {
  content: "arrow_downward";
}
.mdc-data-table
  [dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:after,
.mdc-data-table[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:after,
.mdc-data-table__content[dir="rtl"]
  .mdc-data-table--sortable.mdc-data-table--sort-desc:after {
  content: "arrow_upward";
}
.mdc-data-table--dark,
.mdc-theme--dark .mdc-data-table {
  color: #fff !important;
  color: var(--mdc-theme-text-primary-on-dark, #fff) !important;
  background-color: #303030;
}
.mdc-data-table--dark .mdc-data-table__header-actions,
.mdc-theme--dark .mdc-data-table .mdc-data-table__header-actions {
  color: hsla(0, 0%, 100%, 0.7) !important;
  color: var(
    --mdc-theme-text-secondary-on-dark,
    hsla(0, 0%, 100%, 0.7)
  ) !important;
}
.mdc-data-table--dark .mdc-data-table__content tr:first-child,
.mdc-data-table--dark .mdc-data-table__content tr:nth-last-child(n + 2),
.mdc-theme--dark .mdc-data-table .mdc-data-table__content tr:first-child,
.mdc-theme--dark
  .mdc-data-table
  .mdc-data-table__content
  tr:nth-last-child(n + 2) {
  border-bottom-color: #4f4f4f;
}
.mdc-data-table--dark .mdc-data-table__content tr.mdc-data-table--selected,
.mdc-theme--dark
  .mdc-data-table
  .mdc-data-table__content
  tr.mdc-data-table--selected {
  background-color: #3a3a3a;
}
.mdc-data-table--dark .mdc-data-table__content th,
.mdc-theme--dark .mdc-data-table .mdc-data-table__content th {
  color: hsla(0, 0%, 100%, 0.7) !important;
  color: var(
    --mdc-theme-text-secondary-on-dark,
    hsla(0, 0%, 100%, 0.7)
  ) !important;
}
.mdc-data-table--dark .mdc-data-table__content th.mdc-data-table--sort-asc,
.mdc-data-table--dark .mdc-data-table__content th.mdc-data-table--sort-desc,
.mdc-theme--dark
  .mdc-data-table
  .mdc-data-table__content
  th.mdc-data-table--sort-asc,
.mdc-theme--dark
  .mdc-data-table
  .mdc-data-table__content
  th.mdc-data-table--sort-desc {
  color: #fff !important;
  color: var(--mdc-theme-text-primary-on-dark, #fff) !important;
}
.mdc-data-table--dark .mdc-data-table__content tbody tr:hover,
.mdc-theme--dark .mdc-data-table .mdc-data-table__content tbody tr:hover {
  background-color: #414141;
}
.mdc-data-table--dark .mdc-data-table__footer,
.mdc-theme--dark .mdc-data-table .mdc-data-table__footer {
  color: hsla(0, 0%, 100%, 0.7) !important;
  color: var(
    --mdc-theme-text-secondary-on-dark,
    hsla(0, 0%, 100%, 0.7)
  ) !important;
  border-top-color: #4f4f4f;
}

</style>
