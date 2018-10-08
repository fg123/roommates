// Custom Implementation of Nested Routes

export default class Routes {
    constructor(routes) {
        this._routes = routes;
    }

    export() {
        this._routes.forEach(route => {
            if (route.component && route.component.routes) {
                route.children = route.component.routes.export();
                route.children.forEach(child => {
                    // Remove leading if placed in children.
                    if (child.path && child.path.constructor === String) {
                        child.path = child.path.replace(/^\//, '');
                    }
                    if (child.redirect && child.redirect.constructor === String) {
                        child.redirect = child.path.replace(/^\//, '');
                    }
                });
            }
        });
        return this._routes;
    }
}
