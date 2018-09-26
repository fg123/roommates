<template>
    <div>
        <mdc-title>Members</mdc-title>
        <mdc-list two-line avatar-list>
            <mdc-list-item v-bind:key="member.id" v-for="member in group.members" class="member-list-item">
                <img slot="start-detail" v-bind:src="member.picture" class="rounded" width=56 height=56/>
                <span>{{ member.name }}</span><span v-if="member.id === root.user.id"> (You)</span>
                <span slot="secondary">{{ member.email }}</span>
            </mdc-list-item>
        </mdc-list>

        <mdc-title>Pending Invitations</mdc-title>
        <mdc-layout-grid style="padding: 0px;">
            <mdc-layout-cell desktop=6 tablet=6 phone=4>
                <mdc-list bordered>
                    <mdc-list-item v-bind:key="invite" v-for="invite in group.pending">
                        {{ invite }}
                        <mdc-button slot="end-detail" @click="removeInvite(invite)">
                            <i class="material-icons mdc-button__icon">cancel</i>remove
                        </mdc-button>
                    </mdc-list-item>
                    <mdc-list-item style="height: auto; padding-top: 4px; padding-bottom: 4px">
                        <mdc-textfield v-model="inviteEmail" label="Email" fullwidth @keyup.enter="inviteClicked"></mdc-textfield>
                        <mdc-button slot="end-detail" @click="inviteClicked" raised style="margin-left: 10px;">
                            <i class="material-icons mdc-button__icon">person_add</i>invite
                        </mdc-button>
                    </mdc-list-item>
                </mdc-list>
            </mdc-layout-cell>
        </mdc-layout-grid>

        <mdc-title>Leave</mdc-title>
        <mdc-button raised v-on:click="leaveGroupDialogOpen = true">Leave this group</mdc-button>
        <mdc-dialog v-model="leaveGroupDialogOpen"
            title="Leave this group?" accept="Leave" cancel="No"
                @accept="confirmLeave" @cancel="leaveGroupDialogOpen = false">
            Are you sure you want to leave this group? This action cannot be undone!
        </mdc-dialog>
    </div>
</template>

<script>
import axios from 'axios';

export default {
    name: 'manage-group',
    props: {
        root: Object,
        group: Object,
        reloadGroup: Function
    },
    data() {
        return {
            inviteEmail: "",
            leaveGroupDialogOpen: false,
        }
    },
    methods: {
        confirmLeave: function () {
            axios.post(`/api/group/${this.group.id}/leave`).then(() => {
                this.root.loadUserAndGroups();
            }).catch((error) => {
                this.root.showRequestError(error);
            });
        },
        inviteClicked() {
            if (!this.inviteEmail.trim()) {
                return;
            }
            const email = this.inviteEmail;
            this.inviteEmail = "";
            axios.post(`/api/group/${this.group.id}/invite`, { email: email.trim() })
            .then(() => this.reloadGroup())
            .catch((error) => {
                this.root.showRequestError(error);
                this.inviteEmail = email;
            });
        },
        removeInvite(email) {
            // DELETE has a weird issue where data must be explicitly specified
            // in the request.
            axios.delete(`/api/group/${this.group.id}/invite`, { data: { email: email }})
            .then(() => this.reloadGroup())
            .catch((error) => {
                this.root.showRequestError(error);
            });
        }
    }
}
</script>

<style>
.member-list-item {
    padding-bottom: 8px!important;
}

.mdc-list-item__text {
    align-self: center!important;
    padding-left: 16px;
}

.mdc-list-item__secondary-text {
    margin-top: -6px!important;
}

.mdc-list--avatar-list .mdc-list-item__graphic {
    /*
     * This ensures the img tag inside doesn't get squished in some fast
     * load scenarios
     */
    width: 56px!important;
    height: 56px!important;
}

</style>
