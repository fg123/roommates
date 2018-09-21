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
        }
    },
    watch: {
        active_group: function(newVal) {
            console.log('Active group changed');
            if (newVal === undefined) return [];
            if (newVal >= this.groups.length) return [];
            const id = this.groups[newVal].id;
            axios.get(`/api/staging/group/${id}`).then(response => {
                response = response.data;
                this.members = response.members;
                this.pending_invitations = response.pending;
            });
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
