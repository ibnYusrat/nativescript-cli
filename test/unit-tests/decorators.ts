import * as decoratorsLib from "../../decorators";
import { Yok } from "../../yok";
import { assert } from "chai";
import { CacheDecoratorsTest } from "./mocks/decorators-cache";
import { InvokeBeforeDecoratorsTest } from "./mocks/decorators-invoke-before";
import { isPromise } from "../../helpers";

describe("decorators", () => {
	let moduleName = "moduleName", // This is the name of the injected dependency that will be resolved, for example fs, devicesService, etc.
		propertyName = "propertyName", // This is the name of the method/property from the resolved module
		generatePublicApiFromExportedPromiseDecorator = () => {
			assert.deepEqual($injector.publicApi.__modules__[moduleName], undefined);
			let promisifiedResult: any = decoratorsLib.exportedPromise(moduleName);
			/* actualResult is */ promisifiedResult({}, propertyName, {});
		};

	beforeEach(() => {
		$injector = new Yok();
	});

	after(() => {
		// Make sure global $injector is clean for next tests that will be executed.
		$injector = new Yok();
	});

	describe("exportedPromise", () => {
		it("returns function", () => {
			let result: any = decoratorsLib.exportedPromise("test");
			assert.equal(typeof (result), "function");
		});

		it("does not change original method", () => {
			let promisifiedResult: any = decoratorsLib.exportedPromise(moduleName);
			let expectedResult = { "originalObject": "originalValue" };
			let actualResult = promisifiedResult({}, "myTest1", expectedResult);
			assert.deepEqual(actualResult, expectedResult);
		});

		it("adds method to public api", () => {
			generatePublicApiFromExportedPromiseDecorator();
			assert.deepEqual(typeof ($injector.publicApi.__modules__[moduleName][propertyName]), "function");
		});

		it("returns Promise", (done: mocha.Done) => {
			let expectedResult = "result";
			$injector.register(moduleName, { propertyName: () => expectedResult });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName]();
			assert.equal(typeof (promise.then), "function");
			promise.then((val: string) => {
				assert.deepEqual(val, expectedResult);
			}).then(done).catch(done);
		});

		it("returns Promise, which is resolved to correct value (function without arguments)", (done: mocha.Done) => {
			let expectedResult = "result";
			$injector.register(moduleName, { propertyName: () => expectedResult });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName]();
			promise.then((val: string) => {
				assert.deepEqual(val, expectedResult);
			}).then(done).catch(done);
		});

		it("returns Promise, which is resolved to correct value (function with arguments)", (done: mocha.Done) => {
			let expectedArgs = ["result", "result1", "result2"];
			$injector.register(moduleName, { propertyName: (functionArgs: string[]) => functionArgs });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName](expectedArgs);
			promise.then((val: string[]) => {
				assert.deepEqual(val, expectedArgs);
			}).then(done).catch(done);
		});

		it("returns Promise, which is resolved to correct value (function returning Promise without arguments)", (done: mocha.Done) => {
			let expectedResult = "result";
			$injector.register(moduleName, { propertyName: () => Promise.resolve(expectedResult) });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName]();
			promise.then((val: string) => {
				assert.deepEqual(val, expectedResult);
			}).then(done).catch(done);
		});

		it("returns Promise, which is resolved to correct value (function returning Promise with arguments)", (done: mocha.Done) => {
			let expectedArgs = ["result", "result1", "result2"];
			$injector.register(moduleName, { propertyName: (args: string[]) => Promise.resolve(args) });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName](expectedArgs);
			promise.then((val: string[]) => {
				assert.deepEqual(val, expectedArgs);
			}).then(done).catch(done);
		});

		it("rejects Promise, which is resolved to correct error (function without arguments throws)", (done: mocha.Done) => {
			let expectedError = new Error("Test msg");
			$injector.register(moduleName, { propertyName: () => { throw expectedError; } });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName]();
			promise.then((result: any) => {
				throw new Error("Then method MUST not be called when promise is rejected!");
			}, (err: Error) => {
				assert.deepEqual(err, expectedError);
			}).then(done).catch(done);
		});

		it("rejects Promise, which is resolved to correct error (function returning Promise without arguments throws)", (done: mocha.Done) => {
			let expectedError = new Error("Test msg");
			$injector.register(moduleName, { propertyName: async () => { throw expectedError; } });
			generatePublicApiFromExportedPromiseDecorator();

			let promise: any = $injector.publicApi.__modules__[moduleName][propertyName]();
			promise.then((result: any) => {
				throw new Error("Then method MUST not be called when promise is rejected!");
			}, (err: Error) => {
				assert.deepEqual(err.message, expectedError.message);
			}).then(done).catch(done);
		});

		it("returns Promises, which are resolved to correct value (function returning Promise<T>[] without arguments)", (done: mocha.Done) => {
			let expectedResults = ["result1", "result2", "result3"];
			$injector.register(moduleName, { propertyName: () => _.map(expectedResults, expectedResult => Promise.resolve(expectedResult)) });
			generatePublicApiFromExportedPromiseDecorator();

			let promises: Promise<string>[] = $injector.publicApi.__modules__[moduleName][propertyName]();
			Promise.all<string>(promises)
				.then((promiseResults: string[]) => {
					_.each(promiseResults, (val: string, index: number) => {
						assert.deepEqual(val, expectedResults[index]);
					});
				})
				.then(() => done())
				.catch(done);
		});

		it("rejects Promises, which are resolved to correct error (function returning Promise<T>[] without arguments throws)", (done: mocha.Done) => {
			let expectedErrors = [new Error("result1"), new Error("result2"), new Error("result3")];
			$injector.register(moduleName, { propertyName: () => _.map(expectedErrors, async expectedError => { throw expectedError; }) });
			generatePublicApiFromExportedPromiseDecorator();

			new Promise((onFulfilled: Function, onRejected: Function) => {
				let promises: Promise<string>[] = $injector.publicApi.__modules__[moduleName][propertyName]();
				_.each(promises, (promise, index) => promise.then((result: any) => {
					onRejected(new Error(`Then method MUST not be called when promise is rejected!. Result of promise is: ${result}`));
				}, (err: Error) => {
					if (err.message !== expectedErrors[index].message) {
						onRejected(new Error(`Error message of rejected promise is not the expected one: expected: "${expectedErrors[index].message}", but was: "${err.message}".`));
					}

					if (index + 1 === expectedErrors.length) {
						onFulfilled();
					}
				}));
			}).then(done).catch(done);
		});

		it("rejects only Promises which throw, resolves the others correctly (function returning Promise<T>[] without arguments)", (done: mocha.Done) => {
			let expectedResults: any[] = ["result1", new Error("result2")];
			$injector.register(moduleName, { propertyName: () => _.map(expectedResults, expectedResult => Promise.resolve(expectedResult)) });
			generatePublicApiFromExportedPromiseDecorator();

			new Promise((onFulfilled: Function, onRejected: Function) => {
				let promises: Promise<string>[] = $injector.publicApi.__modules__[moduleName][propertyName]();
				_.each(promises, (promise, index) => promise.then((val: string) => {
					assert.deepEqual(val, expectedResults[index]);
					if (index + 1 === expectedResults.length) {
						onFulfilled();
					}
				}, (err: Error) => {
					assert.deepEqual(err.message, expectedResults[index].message);
					if (index + 1 === expectedResults.length) {
						onFulfilled();
					}
				}));
			}).then(done).catch(done);
		});

		describe("postAction", () => {
			let isPostActionExecuted = false;
			let isActionExecuted = false;
			let expectedResults: any;

			let postAction = () => {
				assert.isTrue(isActionExecuted, "Post Action MUST be executed AFTER all actions are executed.");
				isPostActionExecuted = true;
			};

			let getPromisesWithPostAction = (): any => {
				let promisifiedResultFunction: any = decoratorsLib.exportedPromise(moduleName, postAction);
				// Call this line in order to generate publicApi and get the real Promise
				promisifiedResultFunction({}, propertyName, {});
				return $injector.publicApi.__modules__[moduleName][propertyName]();
			};

			let assertResults = (result: any): void => {
				assert.deepEqual(result, expectedResults);
				assert.isTrue(isPostActionExecuted, "Post action must be executed after all promises are resolved.");
				assert.isTrue(isActionExecuted, "All actions must be executed after the promise is resolved.");
			};

			beforeEach(() => {
				isPostActionExecuted = false;
				isActionExecuted = false;
			});

			it("executes postAction after all promises are resolved (function returning Promise<T>)", (done: mocha.Done) => {
				expectedResults = "result";

				$injector.register(moduleName, {
					propertyName: async () => {
						assert.isFalse(isPostActionExecuted, "Post action MUST NOT be called before all actions are executed.");
						isActionExecuted = true;
						return expectedResults;
					}
				});

				getPromisesWithPostAction()
					.then(assertResults)
					.then(done)
					.catch(done);
			});

			it("executes postAction after all promises are resolved (function returning Promise<T>[])", (done: mocha.Done) => {
				expectedResults = ["result1", "result2", "result3"];

				$injector.register(moduleName, {
					propertyName: () => _.map(expectedResults, async (expectedResult, index) => {
						assert.isFalse(isPostActionExecuted, "Post action MUST NOT be called before all actions are executed.");

						isActionExecuted = (index + 1) === expectedResults.length;
						return expectedResult;
					})
				});

				Promise.all(getPromisesWithPostAction())
					.then(assertResults)
					.then(() => done())
					.catch(done);
			});

			it("executes postAction after a promise is rejected (function returning Promise<T> that throws)", (done: mocha.Done) => {
				expectedResults = "result";
				let errorMessage = "This future throws";

				$injector.register(moduleName, {
					propertyName: async (): Promise<void> => {
						assert.isFalse(isPostActionExecuted, "Post action MUST NOT be called before all actions are executed.");

						isActionExecuted = true;
						throw new Error(errorMessage);
					}
				});

				getPromisesWithPostAction()
					.then((result: any) => {
						throw new Error("Then method MUST not be called when promise is rejected!");
					}, (err: Error) => {
						assert.deepEqual(err.message, errorMessage, "Error message of rejection should be the specified one.");
						assert.isTrue(isPostActionExecuted, "Post action must be executed after all promises are resolved.");
						assert.isTrue(isActionExecuted, "All actions must be executed after the promise is resolved.");
					})
					.then(done)
					.catch(done);
			});

			it("executes postAction after all promises are rejected (function returning Promise<T>[] that throws)", (done: mocha.Done) => {
				expectedResults = ["result1", "result2", "result3"];
				let errorMessage = "This future throws.";

				$injector.register(moduleName, {
					propertyName: () => _.map(expectedResults, async (expectedResult, index) => {
						assert.isFalse(isPostActionExecuted, "Post action MUST NOT be called before all actions are executed.");

						isActionExecuted = (index + 1) === expectedResults.length;
						throw new Error(errorMessage);
					})
				});

				let caughtErrors = 0;

				// Use new promise that will be resolved when all promises are rejected.
				// This way we'll be sure all of them are settled and we can verify the postAction is executed.
				let mainPromise = new Promise((onFulfilled: Function, onRejected: Function) => {
					_.each(getPromisesWithPostAction(), (promise: any) => promise.then((result: any) => {
						throw new Error("Then method MUST not be called when promise is rejected!");
					}, (err: Error) => {
						caughtErrors++;
						assert.deepEqual(err.message, errorMessage, "Error message of rejection should be the specified one.");
						if (caughtErrors === expectedResults.length) {
							onFulfilled();
						}
					}));
				});

				mainPromise
					.then((result: any) => {
						assert.isTrue(isPostActionExecuted, "Post action must be executed after all promises are resolved.");
						assert.isTrue(isActionExecuted, "All actions must be executed after the promise is resolved.");
						done();
					})
					.catch(done);
			});

			it("executes postAction after all some promises are rejected and others are resolved (function returning Promise<T>[] where some of the future throw)", (done: mocha.Done) => {
				let calledActionsCount = 0;
				expectedResults = ["result1", "result2", "result3", "result4"];
				let errorMessage = "This future throws.";

				$injector.register(moduleName, {
					propertyName: () => _.map(expectedResults, async expectedResult => {
						assert.isFalse(isPostActionExecuted, "Post action MUST NOT be called before all actions are executed.");

						calledActionsCount++;
						isActionExecuted = calledActionsCount === expectedResults.length;
						if (calledActionsCount % 2 === 0) {
							throw new Error(errorMessage);
						} else {
							return expectedResult;
						}
					})
				});

				let caughtErrors = 0,
					resolvedPromises = 0;

				// Use new promise that will be resolved when all promises are rejected.
				// This way we'll be sure all of them are settled and we can verify the postAction is executed.
				let mainPromise = new Promise(function (onFulfilled: Function, onRejected: Function) {
					_.each(getPromisesWithPostAction(), (promise: any, index: number) => promise.then((result: any) => {
						resolvedPromises++;
						assert.deepEqual(result, expectedResults[index]);
						if ((caughtErrors + resolvedPromises) === expectedResults.length) {
							onFulfilled();
						}
					}, (err: Error) => {
						caughtErrors++;
						assert.deepEqual(err.message, errorMessage, "Error message of rejection should be the specified one.");
						if ((caughtErrors + resolvedPromises) === expectedResults.length) {
							onFulfilled();
						}
					}));
				});

				mainPromise
					.then((result: any) => {
						assert.isTrue(isPostActionExecuted, "Post action must be executed after all promises are resolved.");
						assert.isTrue(isActionExecuted, "All actions must be executed after the promise is resolved.");
						done();
					})
					.catch(done);
			});
		});
	});

	describe("exported", () => {
		let expectedResults: any[] = [
			"string result",
			1,
			{ a: 1, b: "2" },
			["string 1", "string2"],
			true,
			undefined,
			null
		];

		let generatePublicApiFromExportedDecorator = () => {
			assert.deepEqual($injector.publicApi.__modules__[moduleName], undefined);
			let resultFunction: any = decoratorsLib.exported(moduleName);
			// Call this line in order to generate publicApi and get the real result
			resultFunction({}, propertyName, {});
		};

		it("returns function", () => {
			let result: any = decoratorsLib.exported("test");
			assert.equal(typeof (result), "function");
		});

		it("does not change original method", () => {
			let exportedFunctionResult: any = decoratorsLib.exported(moduleName);
			let expectedResult = { "originalObject": "originalValue" };
			let actualResult = exportedFunctionResult({}, "myTest1", expectedResult);
			assert.deepEqual(actualResult, expectedResult);
		});

		_.each(expectedResults, (expectedResult: any) => {
			it(`returns correct result when function returns ${_.isArray(expectedResult) ? "array" : typeof (expectedResult)}`, () => {
				$injector.register(moduleName, { propertyName: () => expectedResult });
				generatePublicApiFromExportedDecorator();
				let actualResult: any = $injector.publicApi.__modules__[moduleName][propertyName]();
				assert.deepEqual(actualResult, expectedResult);
			});

			it(`passes correct arguments to original function, when argument type is: ${_.isArray(expectedResult) ? "array" : typeof (expectedResult)}`, () => {
				$injector.register(moduleName, { propertyName: (arg: any) => arg });
				generatePublicApiFromExportedDecorator();
				let actualResult: any = $injector.publicApi.__modules__[moduleName][propertyName](expectedResult);
				assert.deepEqual(actualResult, expectedResult);
			});
		});

		it("when function throws, raises the error only when the public API is called, not when decorator is applied", () => {
			let errorMessage = "This is error message";
			$injector.register(moduleName, { propertyName: () => { throw new Error(errorMessage); } });
			generatePublicApiFromExportedDecorator();
			assert.throws(() => $injector.publicApi.__modules__[moduleName][propertyName](), errorMessage);
		});

		it("throws error when passed function returns Promise", () => {
			$injector.register(moduleName, { propertyName: () => Promise.resolve(expectedResults) });
			generatePublicApiFromExportedDecorator();
			assert.throws(() => $injector.publicApi.__modules__[moduleName][propertyName](), "Cannot use exported decorator with function returning Promise<T>.");
		});
	});

	describe("cache", () => {
		it("executes implementation of method only once and returns the same result each time whent it is called (number return type)", () => {
			let count = 0;
			const descriptor: TypedPropertyDescriptor<any> = {
				value: (num: string) => { count++; return num; },
			};

			// cache calling of propertyName as if it's been method.
			const declaredMethod = decoratorsLib.cache()({}, propertyName, descriptor);
			const expectedResult = 5;
			const actualResult = declaredMethod.value(expectedResult);
			assert.deepEqual(actualResult, expectedResult);

			_.range(10).forEach(iteration => {
				const currentResult = declaredMethod.value(iteration);
				assert.deepEqual(currentResult, expectedResult);
			});

			assert.deepEqual(count, 1);
		});

		it("works per instance", () => {
			const instance1 = new CacheDecoratorsTest();
			const expectedResultForInstance1 = 1;
			assert.deepEqual(instance1.method(expectedResultForInstance1), expectedResultForInstance1); // the first call should give us the expected result. all consecutive calls must return the same result.

			_.range(10).forEach(iteration => {
				const currentResult = instance1.method(iteration);
				assert.deepEqual(currentResult, expectedResultForInstance1);
			});

			assert.deepEqual(instance1.counter, 1);

			const instance2 = new CacheDecoratorsTest();
			const expectedResultForInstance2 = 2;
			assert.deepEqual(instance2.method(expectedResultForInstance2), expectedResultForInstance2, "Instance 2 should return new result."); // the first call should give us the expected result. all consecutive calls must return the same result.

			_.range(10).forEach(iteration => {
				const currentResult = instance2.method(iteration);
				assert.deepEqual(currentResult, expectedResultForInstance2);
			});

			assert.deepEqual(instance2.counter, 1);
		});

		it("works with method returning promise", async () => {
			const instance1 = new CacheDecoratorsTest();
			const expectedResultForInstance1 = 1;
			assert.deepEqual(await instance1.promisifiedMethod(expectedResultForInstance1), expectedResultForInstance1); // the first call should give us the expected result. all consecutive calls must return the same result.

			for (let iteration = 0; iteration < 10; iteration++) {
				const promise = instance1.promisifiedMethod(iteration);
				assert.isTrue(isPromise(promise), "Returned result from the decorator should be promise.");
				const currentResult = await promise;
				assert.deepEqual(currentResult, expectedResultForInstance1);
			}

			assert.deepEqual(instance1.counter, 1);
		});

		it("works with getters", () => {
			const instance1 = new CacheDecoratorsTest();
			const expectedResultForInstance1 = 1;
			instance1._property = expectedResultForInstance1;
			assert.deepEqual(instance1.property, expectedResultForInstance1); // the first call should give us the expected result. all consecutive calls must return the same result.

			for (let iteration = 0; iteration < 10; iteration++) {
				instance1._property = iteration;
				assert.deepEqual(instance1.property, expectedResultForInstance1);
			}

			assert.deepEqual(instance1.counter, 1);
		});
	});

	describe("invokeBefore", () => {
		describe("calls method before calling decorated method", () => {
			const assertIsCalled = async (methodName: string): Promise<void> => {
				const instance: any = new InvokeBeforeDecoratorsTest();
				assert.isFalse(instance.isInvokeBeforeMethodCalled);
				const expectedResult = 1;
				assert.deepEqual(await instance[methodName](expectedResult), expectedResult);
				assert.isTrue(instance.isInvokeBeforeMethodCalled);
			};

			it("when invokeBefore method is sync", async () => {
				await assertIsCalled("method");
			});

			it("when invokeBefore method returns Promise", async () => {
				await assertIsCalled("methodPromisifiedInvokeBefore");
			});
		});

		describe("calls method each time before calling decorated method", () => {
			const assertIsCalled = async (methodName: string): Promise<void> => {
				const instance: any = new InvokeBeforeDecoratorsTest();
				assert.isFalse(instance.isInvokeBeforeMethodCalled);
				const expectedResult = 1;
				assert.deepEqual(await instance[methodName](expectedResult), expectedResult);
				assert.isTrue(instance.isInvokeBeforeMethodCalled);

				instance.invokedBeforeCount = 0;

				for (let iteration = 0; iteration < 10; iteration++) {
					instance.isInvokeBeforeMethodCalled = false;
					assert.deepEqual(await instance[methodName](iteration), iteration);
					assert.isTrue(instance.isInvokeBeforeMethodCalled);
					assert.deepEqual(instance.invokedBeforeCount, iteration + 1);
				}
			};

			it("when invokeBefore method is sync", async () => {
				await assertIsCalled("method");
			});

			it("when invokeBefore method returns Promise", async () => {
				await assertIsCalled("methodPromisifiedInvokeBefore");
			});
		});

		describe("throws error in case the invokeBefore method throws", () => {
			const assertThrows = async (methodName: string): Promise<void> => {
				const instance: any = new InvokeBeforeDecoratorsTest();
				assert.isFalse(instance.isInvokeBeforeMethodCalled);
				const expectedResult = 1;
				await assert.isRejected(instance[methodName](expectedResult), expectedResult);
				assert.isTrue(instance.isInvokeBeforeMethodCalled);
			};

			it("when invokeBefore method is sync", async () => {
				await assertThrows("methodInvokeBeforeThrowing");
			});

			it("when invokeBefore method is sync", async () => {
				await assertThrows("methodPromisifiedInvokeBeforeThrowing");
			});
		});

		describe("passes correct args to invokeBefore method", () => {
			const assertIsCalled = async (methodName: string): Promise<void> => {
				const instance: any = new InvokeBeforeDecoratorsTest();
				assert.isFalse(instance.isInvokeBeforeMethodCalled);
				const expectedResult = 1;
				assert.deepEqual(await instance[methodName](expectedResult), expectedResult);
				assert.isTrue(instance.isInvokeBeforeMethodCalled);
				assert.deepEqual(instance.invokedBeforeArgument, "arg1");
			};

			it("when invokeBefore method is sync", async () => {
				await assertIsCalled("methodCallingInvokeBeforeWithArgs");
			});

			it("when invokeBefore method is sync", async () => {
				await assertIsCalled("methodPromisifiedInvokeBeforeWithArgs");
			});
		});
	});
});