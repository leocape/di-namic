module.exports = class Core {

    constructor() {
        this.__bindings = [];
        this.__singletons = {};
    }

    get bindingLen() {
        return this.__bindings.length;
    }

    addBinding(binding) {
        if (!binding.alias || binding.alias.length == 0)
            throw new Error('binding alias is null or empty!');

        if (!binding.dependency)
            throw new Error('binding dependency is null or empty!');

        this.__bindings.push(binding);
    }

    createInstance(alias) {

        if (!alias || alias.length == 0)
            throw new Error('binding alias is null or empty!');

        var self = this;

        var binding = this.__getBinding(alias);
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

            var result = dependency[factoryMethod](...args);   // use the spread operator

            if (isSingleton)
                self.__singletons[binding.alias] = result;

            return result;
        }

        function Temp(args) {
            // invoke the constructor on *this*
            if (this.constructor)
                this.constructor(...args);
        }

        var instance = null;

        if (proto) {

            if (Core.__prototypeIsEmptyObject(proto))   // static object
                return new dependency(...args);
            else {
                if (proto.constructor != null) {    // prototype has a constructor - just invoke new
                    instance = new dependency(...args);
                } else {
                    Temp.prototype = Object.create(proto);  // inherit the prototype
                    instance = new Temp(args);
                }
            }
        } else {  // no prototype
            Temp.prototype = Object.create(dependency);
            instance = new Temp(args);
        }

        if (isSingleton)
            self.__singletons[binding.alias] = instance;

        return instance;
    };

    __getBinding(alias) {
        return this.__bindings.filter((binding) => {
            return binding.alias == alias;
        })[0];
    };


    static __prototypeIsEmptyObject(proto) {
        return (Object.keys(proto).length === 0 && proto.constructor == null);
    }

    __resolveDependencies(binding) {

        var self = this;

        var recurse = function (aliases) {
            var args = [];

            aliases.forEach((arg) => {

                var currentBinding = self.__getBinding(arg);
                var typeName = Core.__getTypeName(currentBinding.dependency);

                switch (typeName) {
                    case 'Object':
                        if (currentBinding.factoryMethod != null)
                            args.push(self.createInstance(arg));
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
                        args.push(self.createInstance(arg));
                }

                if (arg.ctorArgAliases != undefined && arg.ctorArgAliases.length > 0)
                    return recurse(arg.ctorArgAliases);
            });

            return args;
        };

        return recurse(binding.ctorArgAliases);
    };

    static __getTypeName(obj) {

        var str = (obj.prototype ? obj.prototype.constructor : obj.constructor).toString();

        // find functions in obj
        var matched = str.match(/function\s(\w*)/);

        if (matched != null) {
            var ctorName = str.match(/function\s(\w*)/)[1];

            var aliases = ["", "anonymous", "Anonymous"];
            return aliases.indexOf(ctorName) > -1 ? "Function" : ctorName;
        }

        return null;
    };

    __injectAnonymousObjectValues(currentBinding) {

        var self = this;

        for (var key in currentBinding.dependency) {

            if (currentBinding.dependency.hasOwnProperty(key)) {

                var depTypeName = Core.__getTypeName(currentBinding.dependency[key]);

                if (depTypeName == 'String' && depTypeName.length > 0) {

                    var injectedAliasIndex = currentBinding.dependency[key].indexOf('@inject:');

                    if (injectedAliasIndex > -1) {
                        var injectedAlias = currentBinding.dependency[key].substr(injectedAliasIndex + 8);
                        //var injectedBinding = self.__getBinding(injectedAlias);
                        currentBinding.dependency[key] = self.createInstance(injectedAlias);
                    }
                }
            }
        }
    }

};