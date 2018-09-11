// TODO(fg123): Define API location in environment variable and sub in
const app = new Vue({
    el: '.app',
    data() {
        return {
            avatar_url: '/static/default-avatar.png',
            name: 'John Doe',
            email: 'hello@example.com',
            groups: [],
            active_group: -1,
            getTitle() {
                if (this.active_group >= this.groups.length) {
                    this.active_group = this.groups.length - 1;
                }
                if (this.active_group < 0) {
                    return 'Loading...';
                }
                return this.groups[this.active_group].name;
            }
        };
    },
    mounted() {
        axios.get('/api/staging/user').then(response => {
            response = response.data;
            this.avatar_url = response.picture;
            this.name = response.name;
            this.email = response.email;
        });
        axios.get('/api/staging/groups').then(response => {
            response = response.data;
            this.groups = response;
            this.active_group = 0;
        });
    }
});
