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

        <main style="position: relative">
            <mdc-linear-progress
                indeterminate
                v-if="requestsLongerThanTime !== 0"
                style="position: absolute; left: 0; top: 0; z-index: 1;"
            />
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

            pendingRequests: {},
            requestsLongerThanTime: 0
        }
    },
    mounted () {
        console.log(this.$router);
        console.log(this.$route);
        this.loadUserAndGroups();

        axios.interceptors.request.use((config) => {
            const time = Date.now();
            /* Request Time is used to identify the request */
            config.requestTime = time;

            /* Add to requests longer than 100ms */
            this.pendingRequests[time] = setTimeout(() => {
                this.requestsLongerThanTime += 1;
                this.pendingRequests[time] = undefined;
            }, 100);

            return config;
        });

        axios.interceptors.response.use((response) => {
            const pendingTimeout = this.pendingRequests[response.config.requestTime];
            if (pendingTimeout) {
                // Less than 50ms, not cleared
                clearTimeout(pendingTimeout);
            } else {
                this.requestsLongerThanTime -= 1;
            }
            return response;
        });
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
  overflow-y: scroll;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 20px;
}

::-webkit-scrollbar-track {
  background: #ddd;
  border-radius: 20px;
}

.mdc-text-field--focused:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
    color: #212121!important;
}

.mdc-text-field--focused:not(.mdc-text-field--disabled) .mdc-floating-label {
    color: #212121!important;
}

.mdc-layout-app .mdc-layout-app--content-wrapper {
    width: 100%;
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

@media only screen and (max-width: 840px) {
    /* For mobile: */
    .hide-on-mobile {
        display: none!important;
    }
}

@media only screen and (min-width: 840px) {
    /* For desktop: */
    .hide-on-desktop {
        display: none!important;
    }
}
</style>
