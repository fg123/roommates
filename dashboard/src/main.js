import Vue from 'vue';
import app from './index.vue';
import VueMDCAdapter from 'vue-mdc-adapter';
import VueRouter from 'vue-router';

// In theory we would import theme.scss, but I think my webpack config is not
// correct somewhere so the generated CSS is different than the provided file.
// It is missing a bunch of drawer related CSS components.
import 'vue-mdc-adapter/dist/vue-mdc-adapter.css';

Vue.use(VueMDCAdapter);
Vue.use(VueRouter);

new Vue({
    el: '#app',
    router: new VueRouter({
        mode: 'history',
        routes: app.routes ? app.routes.export() : []
    }),
    render: r => r(app)
});

