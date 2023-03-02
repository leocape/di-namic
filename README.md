
# di-namic
Simple dependency injection container for Node.

## Why?

To facilitate better the design and testing of modules, by decoupling dependencies via the Inversion of Control principle. 

Simply put: ***Don't instantiate dependencies in the module!***

## Design goals

- Single 'container' where all dependencies are defined
  - code-based as opposed to configuration-based
  - each dependency has a scope:
    - none OR
    - singleton
- The container would generally be required by the top-level 'entry-point' .js file, which resolves dependencies from the container. As each of these has its own set of dependencies, a dependency graph is generated.
- Registration of dependencies to include the following types:
  - objects with a constructor (ie: an instance should be created at resolution-time)
  - static objects
  - primitive types (ie: numbers, booleans, strings)

## Breaking changes

As of version 0.3.0, a breaking change has been introduced:

**< 0.3.0:**

```javascript
var Container = require('di-namic');
```

**>= 0.3.0:**

```javascript
var Container = require('di-namic').Container;	// to be deprecated
```

OR

```javascript
var Container = require('di-namic').ContainerV2;
```

ContainerV2 doesn't support callbacks - it returns promises only. All methods can therefore also be used with `await`.

## An example module

The following examples are of modules that have dependencies on other modules.


**Prototype-based** (with promises)

```javascript
module.exports = TestObj1;

function TestObj1(dependency1, dependency2) {
    this.__dependency1 = dependency1;
    this.__dependency2 = dependency2;
}

TestObj1.prototype.testMethod = function () {

    var self = this;

    return new Promise((resolve, reject) => {

        self.__dependency1.testMethod()
            .then(result1 => {
                self.__dependency2.testMethod(result1)
                    .then(result2 => {
                        resolve(result2);
                    })
                    .catch(err => {
                        return reject(err);
                    });
            })
            .catch(err => {
                reject(err);
            });
    });
};
```

***OR***

**Class-based**

```javascript
module.exports = class TestObj1 {

    constructor(dependency1, dependency2) {
        this.__dependency1 = dependency1;
        this.__dependency2 = dependency2;
    }

    async testMethod() {
        try {
            var result1 = await this.__dependency1.testMethod();
            return await this.__dependency2.testMethod(result1);
        } catch (err) {
            throw err;
        }
    }
};
```

The module is therefore not responsible for creating instances of a dependency, but is instead relying on a consumer to do the instantiation for us. From a testing perspective, this approach allows dependencies to be __externally mocked__.

## Container functions

### `register`

Register a dependency. Each time `resolve` is called, a new instance of the dependency is returned.

```javascript
/* Container */
container.register(alias, dependency, ctorArgAliases, callback)

/* ContainerV2 */
container.register(alias, dependency, ctorArgAliases).then...	
//OR
await container.register(alias, dependency, ctorArgAliases)
```

### `registerFactory`

Register a dependency. Each time `resolve` is called, a new instance of the dependency is returned, using the dependency's own factory method.

```javascript
/* Container */
container.registerFactory(alias, dependency, factoryMethodName, callback)

/* ContainerV2 */
container.registerFactory(alias, dependency, factoryMethodName).then...
// OR
await container.registerFactory(alias, dependency, factoryMethodName)
```

### `registerSingleton`

Register a dependency. Each time `resolve` is called, a singleton instance of the dependency is returned. The container maintains a single instance.

```javascript
/* Container */
container.registerSingleton(alias, dependency, callback)

/* ContainerV2 */
container.registerSingleton(alias, dependency).then...
// OR
await container.registerSingleton(alias, dependency)
```

### `registerSingletonFactory`

Register a dependency. Each time `resolve` is called, a singleton instance of the dependency is returned. The container maintains a single instance, which is originally created by the dependency's own factory method.

```javascript
/* Container */
container.registerSingletonFactory(alias, dependency, factoryMethodName, callback)

/* ContainerV2 */
container.registerSingletonFactory(alias, dependency, factoryMethodName).then...
// OR
await container.registerSingletonFactory(alias, dependency, factoryMethodName)
```

### `resolve`

Returns an instance of a dependency.

```javascript
/* Container */
container.resolve(alias, callback)

/* ContainerV2 */
container.resolve(alias).then...
// OR
await container.resolve(alias)
```

### Parameters:

- __alias__:
  - (string) key to refer to the registration
- __dependency__ - the dependency itself, which can be any of the following types:
  - module
  - anonymous object
  - static object
  - primitive (string, integer, boolean)
- __ctorArgAliases__ - the constructor arguments, referred to by their aliases
- **factoryMethodName** - the factory method that creates an instance of the dependency
- __callback__ - this is an async function, so this is the callback

## Usage

Using the framework requires an understanding of the principles of dependency injection, particularly __constructor injection__.

Javascript modules would typically rely on external dependencies introduced via the constructor function. 

When using **di-namic** in a Node application:

1. Dependencies are registered with the __di-namic__ container
2. The container must remain in scope for the lifetime of the application
3. A "dependency tree" is created at the root/entry point of the application. For example this would be root __index.js__ file of a typical Node application.
4. There are 2 main functions on the container (see "container functions" above): 
   - `register`  (with variations)
   - `resolve` 

### Example

The examples below are based on the module sample above.

    TestObj1
            ↳ Dependency1
            ↳ Dependency2

__index.js__

```javascript
var Container = require('di-namic').ContainerV2;
var Dependency1 = require('../lib/dependency1');
var Dependency2 = require('../lib/dependency2');
var TestObj1 = require('../lib/testObj1');
var app = require('../app');

module.exports = class Index {

    constructor() {
        this.__container = new Container();
    }

    //register the dependencies with the container
    async register() {

        await this.__container.register('Bob', Dependency1);
        await this.__container.register('Mary', Dependency2);
        // 'Joe' relies on 'Bob' and 'Mary' 
        await this.__container.register('Joe', TestObj1, ['Bob', 'Mary']);
    }

    async initialize() {

        await this.register();

        // resolve the dependency (including sub-dependencies)
        var testObj1 = await this.__container.resolve('Joe');

        // now start the app with dependencies injected into the constructor
        await app.start(testObj1);
    }
};
```

The above example is rather contrived - see the tests for a more comprehensive dependency tree example.

## Some background reading for the uninitiated

- https://martinfowler.com/bliki/InversionOfControl.html (old but still very relevant)
- https://martinfowler.com/articles/dipInTheWild.html
- http://www.devtrends.co.uk/blog/how-not-to-do-dependency-injection-the-static-or-singleton-container
- https://en.wikipedia.org/wiki/SOLID

## Attribution & license

Please credit the author where appropriate. License below.

**MIT License**

Copyright (c) 2017

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
