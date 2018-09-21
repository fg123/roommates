// TODO(fg123): Define API location in environment variable and sub in
const app = new Vue({
    el: '.app',
    data: {
        avatar_url: '/static/default-avatar.png',
        name: 'John Doe',
        email: 'hello@example.com',
        groups: [],
        active_group: undefined,
        members: [],
        pending_invitations: [],
        getTitle() {
            if (this.active_group >= this.groups.length) {
                this.active_group = this.groups.length - 1;
            }
            if (this.active_group === undefined) {
                return 'Loading...';
            }
            if (this.active_group < 0) {
                return 'No Group Selected!';
            }
            return this.groups[this.active_group].name;
        },
        getGroupId() {
            if (this.active_group === undefined)
                return '';
            return this.groups[this.active_group].id;
        },
        cancelInvite(event, email) {
            const button = event.currentTarget;
            button.disabled = true;
            axios.delete('/api/staging/group/' + app.getGroupId() + '/invite', { data: { email: email }}).then(() => {
                refreshGroup(app.getGroupId());
            }).catch((error) => {
                alert(error);
                button.disabled = false;
            });
        }

    },
    watch: {
        active_group: function(newVal) {
            if (newVal === undefined) return;
            if (newVal >= this.groups.length) return;
            if (newVal < 0) return;
            refreshGroup(this.groups[newVal].id);
        }
    },
    mounted() {
        axios.get('/api/staging/user').then(response => {
            response = response.data;
            this.avatar_url = response.picture;
            this.name = response.name;
            this.email = response.email;
        });
        refreshGroups();
    }
});

function refreshGroup(id) {
    axios.get(`/api/staging/group/${id}`).then(response => {
        response = response.data;
        app.members = response.members;
        app.pending_invitations = response.pending;
    });
}

function refreshGroups() {
    axios.get('/api/staging/groups').then(response => {
        response = response.data;
        app.groups = response;
        if (app.groups.length > 0) {
            app.active_group = 0;
        } else {
            app.active_group = -1;
        }
    });
}
