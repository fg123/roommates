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
                <template v-if="(user && user.groups || []).length != 0">
                    <mdc-drawer-item
                        start-icon="group"
                        :key="group.id"
                        :activated="group.id === selected_group.id"
                        @click="selected_group = group"
                        v-for="group in user && user.groups">
                        {{ group.name }}
                    </mdc-drawer-item>
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
                        <mdc-toolbar-title>{{ selected_group !== undefined ? selected_group.name : "No group selected!"}}</mdc-toolbar-title>
                    </mdc-toolbar-section>
                    <mdc-toolbar-section align-end>
                        <mdc-toolbar-icon @click="logout" icon="exit_to_app"></mdc-toolbar-icon>
                    </mdc-toolbar-section>
                </mdc-toolbar-row>
            </mdc-toolbar>

            <group-display v-if="selected_group !== undefined" v-bind:group="selected_group" v-bind:root="this" />

            <div class="content" v-else>
                <mdc-title>You should create a group from the sidebar!</mdc-title>
            </div>

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

import groupDisplay from './group-display.vue';

export default {
    data () {
        return {
            user: undefined,
            selected_group: undefined,

            createGroupDialogOpen: false,
            createGroupDialogField: "",
            errorSnackbar: undefined,
        }
    },
    mounted () {
        this.loadUserAndGroups();
    },
    components: {
        groupDisplay
    },
    methods: {
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
            axios.post('/api/staging/groups', { name: this.createGroupDialogField.trim() }).then(() => {
                this.loadUserAndGroups();
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        acceptInvite(invite) {
            const id = invite.id;
            axios.post(`/api/staging/group/${id}/acceptInvite`).then(() => {
                this.loadUserAndGroups();
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        declineInvite(invite) {
            const id = invite.id;
            axios.post(`/api/staging/group/${id}/declineInvite`).then(() => {
                this.loadUserAndGroups();
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        loadUserAndGroups() {
            axios.get('/api/staging/user').then(response => {
                this.user = response.data;
                if (this.user.groups.length > 0) {
                    this.selected_group = this.user.groups[0];
                }
                else {
                    this.selected_group = undefined;
                }
            }).catch(error => {
                this.showRequestError(error);
            });
        },
        showError(message) {
            console.log(message);
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
}
</script>

<style>

:root {
  --mdc-theme-primary: #212121!important;
  --mdc-theme-secondary: #41B883!important;
  --mdc-theme-background: #fff!important;
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
