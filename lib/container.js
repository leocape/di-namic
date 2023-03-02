'use strict';

const util = require('util');

module.exports = util.deprecate(Container, 'Container is deprecated; please use ContainerV2');

function Container() {
    this.__bindings = [];
    this.__singletons = {};
}

// factory
Container.getInstance = function () {
    return new Container();
};

Object.defineProperty(Container.prototype, 'bindingLen', {
        get: function () {
            return this.__bindings.length;
        }
    }
);

Container.prototype.register = function (alias, dependency, ctorArgAliases, callback) {

    if (arguments.length < 4 && typeof arguments[2] != Array) {
        callback = ctorArgAliases;
        ctorArgAliases = [];
    }

    try {
        console.log('registering -> ', alias);
        this.__bindings.push({alias: alias, dependency: dependency, ctorArgAliases: ctorArgAliases, singleton: false});
        callback();
    } catch (err) {
        callback(err);
    }
};

Container.prototype.registerAsync = function () {
    return new Promise((resolve, reject) => {

        var args = Array.prototype.slice.call(arguments);

        args.push(err => {
            if (err) return reject(err);
            resolve();
        });

        this.register.apply(this, args);
    });
}

Container.prototype.registerSingleton = function (alias, dependency, ctorArgAliases, callback) {

    if (arguments.length < 4 && typeof arguments[2] != Array) {
        callback = ctorArgAliases;
        ctorArgAliases = [];
    }

    try {
        console.log('registering singleton -> ', alias);
        this.__bindings.push({alias: alias, dependency: dependency, ctorArgAliases: ctorArgAliases, singleton: true});
        callback();
    } catch (err) {
        callback(err);
    }
};

Container.prototype.registerSingletonAsync = function () {
    return new Promise((resolve, reject) => {

        var args = Array.prototype.slice.call(arguments);

        args.push(err => {
            if (err) return reject(err);
            resolve();
        });

        this.registerSingleton.apply(this, args);
    });
}

Container.prototype.registerFactory = function (alias, dependency, factoryMethod, ctorArgAliases, callback) {

    if (arguments.length < 5 && typeof arguments[3] != Array) {
        callback = ctorArgAliases;
        ctorArgAliases = [];
    }

    try {
        console.log('registering factory -> ', alias);
        this.__bindings.push({
            alias: alias,
            dependency: dependency,
            ctorArgAliases: ctorArgAliases,
            factoryMethod: factoryMethod,
            singleton: false
        });
        callback();
    } catch (err) {
        callback(err);
    }
};

Container.prototype.registerFactoryAsync = function () {
    return new Promise((resolve, reject) => {

        var args = Array.prototype.slice.call(arguments);

        args.push(err => {
            if (err) return reject(err);
            resolve();
        });

        this.registerFactory.apply(this, args);
    });
}

Container.prototype.registerSingletonFactory = function (alias, dependency, factoryMethod, ctorArgAliases, callback) {

    if (arguments.length < 5 && typeof arguments[3] != Array) {
        callback = ctorArgAliases;
        ctorArgAliases = [];
    }

    try {
        console.log('registering singleton factory -> ', alias);
        this.__bindings.push({
            alias: alias,
            dependency: dependency,
            ctorArgAliases: ctorArgAliases,
            factoryMethod: factoryMethod,
            singleton: true
        });
        callback();
    } catch (err) {
        callback(err);
    }
};

Container.prototype.registerSingletonFactoryAsync = function () {
    return new Promise((resolve, reject) => {

        var args = Array.prototype.slice.call(arguments);

        args.push(err => {
            if (err) return reject(err);
            resolve();
        });

        this.registerSingletonFactory.apply(this, args);
    });
}

Container.prototype.resolve = function (alias, callback) {
    try {
        var binding = this.__getBinding(alias);
        var result = this.__createInstance(binding);
        callback(null, result);
    } catch (err) {
        callback(err);
    }
};

Container.prototype.resolveAsync = function (alias) {
    return new Promise((resolve, reject) => {

        this.resolve(alias, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

Container.prototype.__getBinding = function (alias) {
    return this.__bindings.filter((binding) => {
        return binding.alias == alias;
    })[0];
};

Container.prototype.__createInstance = function (binding) {

    var self = this;

    var alias = binding.alias;
    var isSingleton = binding.singleton;
    var dependency = binding.dependency;
    var proto = dependency.prototype;
    var factoryMethod = binding.factoryMethod;

    // just return a stored singleton if exists
    if (isSingleton && self.__singletons[alias] != null)
        return self.__singletons[alias];

    var args = [];

    if (binding.ctorArgAliases != undefined)
        args = this.__resolveDependencies(binding);

    // if this is a factory method, just invoke it and return
    if (factoryMethod != null) {

        var result = dependency[factoryMethod](... args);   // use the spread operator

        if (isSingleton)
            self.__singletons[binding.alias] = result;

        return result;
    }

    function Temp(args) {
        // invoke the constructor on *this*
        this.constructor(... args);
    }

    // subclass extends superclass
    if (proto) {
        if (self.__prototypeIsEmptyObject(proto))   // static object
            return new dependency(... args);
        else
            Temp.prototype = Object.create(proto);  // inherit the prototype
    } else  // no prototype
        Temp.prototype = Object.create(dependency);

    var instance = new Temp(args);

    if (isSingleton)
        self.__singletons[binding.alias] = instance;

    return instance;
};

Container.prototype.__prototypeIsEmptyObject = function (proto) {
    return Object.keys(proto).length === 0;// && proto.constructor === Object;
};

Container.prototype.__resolveDependencies = function (binding) {

    var self = this;

    var recurse = function (aliases) {
        var args = [];

        aliases.forEach((arg) => {

            var currentBinding = self.__getBinding(arg);
            var typeName = self.__getTypeName(currentBinding.dependency);

            switch (typeName) {
                case 'Object':
                    if (currentBinding.factoryMethod != null)
                        args.push(self.__createInstance(currentBinding));
                    else {
                        self.__injectAnonymousObjectValues(currentBinding);
                        args.push(currentBinding.dependency);
                    }
                    break;
                case 'Number':
                case 'String':
                case 'Boolean':
                    args.push(currentBinding.dependency);
                    break;
                default:
                    args.push(self.__createInstance(currentBinding));
            }

            if (arg.ctorArgAliases != undefined && arg.ctorArgAliases.length > 0)
                return recurse(arg.ctorArgAliases);
        });

        return args;
    };

    return recurse(binding.ctorArgAliases);
};

Container.prototype.__getTypeName = function (obj) {

    var str = (obj.prototype ? obj.prototype.constructor : obj.constructor).toString();

    //console.log('--> ', str);

    var matched = str.match(/function\s(\w*)/);

    if(matched !=  null){
        var ctorName = str.match(/function\s(\w*)/)[1];

        var aliases = ["", "anonymous", "Anonymous"];
        return aliases.indexOf(ctorName) > -1 ? "Function" : ctorName;
    }

    return null;
};

Container.prototype.__injectAnonymousObjectValues = function (currentBinding) {

    var self = this;

    for (var key in currentBinding.dependency) {

        if (currentBinding.dependency.hasOwnProperty(key)) {

            var depTypeName = self.__getTypeName(currentBinding.dependency[key]);

            if (depTypeName == 'String' && depTypeName.length > 0) {

                var injectedAliasIndex = currentBinding.dependency[key].indexOf('@inject:');

                if (injectedAliasIndex > -1) {
                    var injectedAlias = currentBinding.dependency[key].substr(injectedAliasIndex + 8);
                    var injectedBinding = self.__getBinding(injectedAlias);
                    currentBinding.dependency[key] = self.__createInstance(injectedBinding);
                }
            }
        }
    }
};
