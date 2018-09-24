import Vue from 'vue';
import app from './index.vue';
import VueMDCAdapter from 'vue-mdc-adapter';

// In theory we would import theme.scss, but I think my webpack config is not
// correct somewhere so the generated CSS is different than the provided file.
// It is missing a bunch of drawer related CSS components.
import 'vue-mdc-adapter/dist/vue-mdc-adapter.css';

Vue.use(VueMDCAdapter);

new Vue({
    el: '#app',
    render: r => r(app)
});
