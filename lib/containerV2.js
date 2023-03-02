'use strict';

var Core = require('./core');

module.exports = class ContainerV2 {

    constructor() {
        this.__core = new Core();
        //this.__bindings = [];
    }

    // factory
    static getInstance() {
        return new ContainerV2();
    };

    get bindingLen() {
        return this.__core.bindingLen;
    }

    /***
     *
     * @param alias The string alias representing the type
     * @param dependency The type itself (eg: Widget.prototype)
     * @param ctorArgAliases Constructor argument array of type aliases
     * @returns Promise
     */
    async register(alias, dependency, ctorArgAliases = []) {

        try {
            console.log(`registering -> ${alias}`);

            this.__core.addBinding({
                alias: alias,
                dependency: dependency,
                ctorArgAliases: ctorArgAliases,
                singleton: false
            });
            return;
        } catch (err) {
            console.log(`error registering ${alias}: ${err}`);
            throw err;
        }
    };

    /***
     *
     * @param alias The string alias representing the type
     * @param dependency The type itself (eg: Widget.prototype)
     * @param ctorArgAliases Constructor argument array of type aliases
     * @returns Promise
     */
    async registerSingleton(alias, dependency, ctorArgAliases = []) {

        try {
            console.log(`registering singleton -> ${alias}`);

            this.__core.addBinding({
                alias: alias,
                dependency: dependency,
                ctorArgAliases: ctorArgAliases,
                singleton: true
            });
            return;
        } catch (err) {
            console.log(`error registering singleton ${alias}: ${err}`);
            throw err;
        }
    };

    /***
     *
     * @param alias The string alias representing the type
     * @param dependency The type itself (eg: Widget.prototype)
     * @param factoryMethod The factory method used to create the instance
     * @param ctorArgAliases Constructor argument array of type aliases
     * @returns Promise
     */
    async registerFactory(alias, dependency, factoryMethod, ctorArgAliases = []) {

        if (!factoryMethod || factoryMethod.length == 0)
            throw new Error('factory method must be specified!');

        try {
            console.log(`registering factory -> ${alias}`);

            this.__core.addBinding({
                alias: alias,
                dependency: dependency,
                ctorArgAliases: ctorArgAliases,
                factoryMethod: factoryMethod,
                singleton: false
            });
            return;
        } catch (err) {
            console.log(`error registering factory ${alias}: ${err}`);
            throw err;
        }
    };

    /***
     *
     * @param alias The string alias representing the type
     * @param dependency The type itself (eg: Widget.prototype)
     * @param factoryMethod The factory method used to create the instance
     * @param ctorArgAliases Constructor argument array of type aliases
     * @returns Promise
     */
    async registerSingletonFactory(alias, dependency, factoryMethod, ctorArgAliases = []) {

        if (!factoryMethod || factoryMethod.length == 0)
            throw new Error('factory method must be specified!');

        try {
            console.log(`registering singleton factory -> ${alias}`);

            this.__core.addBinding({
                alias: alias,
                dependency: dependency,
                ctorArgAliases: ctorArgAliases,
                factoryMethod: factoryMethod,
                singleton: true
            });
            return;
        } catch (err) {
            console.log(`error registering singleton factory ${alias}: ${err}`);
            throw err;
        }
    };

    /***
     *
     * @param alias
     * @returns Promise
     */
    async resolve(alias) {
        try {
            console.log(`resolving ${alias}`);
            return this.__core.createInstance(alias);
        } catch (err) {
            console.log(`error resolving ${alias}: ${err}`);
            throw err;
        }
    };
};
