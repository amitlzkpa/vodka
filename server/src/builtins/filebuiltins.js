/*
This file is part of Vodka.

Vodka is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Vodka is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Vodka.  If not, see <https://www.gnu.org/licenses/>.
*/

function createFileBuiltins() {

	Builtin.createBuiltin(
		'save',
		[ '_name@', '_nex' ],
		function(env, executionEnvironment) {
			let namesym = env.lb('name');
			let nm = namesym.getTypedValue();
			let val = env.lb('nex');			
			let exp = new Expectation();
			exp.set(function(callback) {
				return function() {
					saveNex(nm, val, function(saveResult) {
						callback(saveResult);
					})
				}
			});
			let savingMessage = new EError(`saving (in the file ${nm}) this data: ${val.debugString()}`);
			savingMessage.setErrorType(ERROR_TYPE_INFO);
			exp.appendChild(savingMessage)
			return exp;
		}
	);

	Builtin.createBuiltin(
		'load',
		[ '_name@' ],
		function(env, executionEnvironment) {
			let namesym = env.lb('name');
			let nm = namesym.getTypedValue();
			let exp = new Expectation();
			exp.set(function(callback) {
				return function() {
					loadNex(nm, function(loadResult) {
						callback(loadResult);
					})
				}
			})
			let loadingMessage = new EError(`loading the file ${nm}`);
			loadingMessage.setErrorType(ERROR_TYPE_INFO);
			exp.appendChild(loadingMessage)
			return exp;
		}
	);

	Builtin.createBuiltin(
		'import',
		[ '_name@' ],
		function(env, executionEnvironment) {
			let namesym = env.lb('name');
			let nm = namesym.getTypedValue();
			let exp = new Expectation();
			exp.set(function(callback) {
				return function() {
					importNex(nm, function(importResult) {
						callback(importResult);
					})
				}
			})
			let importMessage = new EError(`importing the package ${nm}`);
			importMessage.setErrorType(ERROR_TYPE_INFO);
			exp.appendChild(importMessage)
			return exp;
		}
	);

	// run it AND save it *mind=blown*
	// need to make it so that if it fails you don't lose all your work.
	Builtin.createBuiltin(
		'package-edit',
		[ '_name@', '_nex...' ],
		function(env, executionEnvironment) {
			// run part
			let packageName = env.lb('name').getTypedValue();
			let lst = env.lb('nex');
			BINDINGS.setPackageForBinding(packageName);
			let lastresult = new Nil();
			for (let i = 0; i < lst.numChildren(); i++) {
				let c = lst.getChildAt(i);
				lastresult = evaluateNexSafely(c, executionEnvironment);
				// not sure what to do about errors yet?
			}
			BINDINGS.setPackageForBinding(null);

			// save part
			// package file name is the name plus "-functions"
			let nm = packageName + '-functions';
			// in the file, we have to, of course, include the package itself.
			let args = [ new ESymbol(packageName) ];
			Command.pushListContentsIntoArray(lst);
			let val = Command.makeCommandWithArgs('package', args);
			let exp = new Expectation();
			exp.set(function(callback) {
				return function() {
					saveNex(nm, val, function(saveResult) {
						callback(saveResult);
					})
				}
			});
			let savingMessage = new EError(`editing package (in the file ${nm}) this data: ${val.debugString()}`);
			savingMessage.setErrorType(ERROR_TYPE_INFO);
			exp.appendChild(savingMessage)
			return exp;
		}
	);

	Builtin.createBuiltin(
		'package',
		[ '_name@', '_nex...' ],
		function(env, executionEnvironment) {
			let packageName = env.lb('name').getTypedValue();
			let lst = env.lb('nex');
			BINDINGS.setPackageForBinding(packageName);
			let lastresult = new Nil();
			for (let i = 0; i < lst.numChildren(); i++) {
				let c = lst.getChildAt(i);
				lastresult = evaluateNexSafely(c, executionEnvironment);
				// not sure what to do about errors yet?
			}
			BINDINGS.setPackageForBinding(null);
			return new Nil();
		}
	);

	Builtin.createBuiltin(
		'use',
		[ '_name@' ],
		function(env, executionEnvironment) {
			let packageName = env.lb('name').getTypedValue();
			if (!BINDINGS.isKnownPackageName(packageName)) {
				return new EError(`use: invalid package name ${packageName}. Sorry!`);
			}
			env.usePackage(packageName);
			return new Nil();
		}
	);	

	Builtin.createBuiltin(
		'using',
		[ 'namelist()', '_nex...' ],
		function(env, executionEnvironment) {
			let packageList = env.lb('namelist');
			for (let i = 0; i < packageList.numChildren(); i++) {
				let c = packageList.getChildAt(i);
				if (!(c.getTypeName() == '-symbol-')) {
					return new EError(`using: first arg must be a list of symbols that denote package names, but ${c.debugString()} is not a symbol. Sorry!`);
				}
				let packageName = c.getTypedValue();
				if (!BINDINGS.isKnownPackageName(packageName)) {
					return new EError(`using: invalid package name ${packageName}. Sorry!`);
				}
				env.usePackage(packageName);
			}
			let lst = env.lb('nex');
			let result = new Nil();
			for (let j = 0; j < lst.numChildren(); j++) {
				let c = lst.getChildAt(j);
				result = evaluateNexSafely(c, executionEnvironment);
				if (isFatalError(result)) {
					result = wrapError('&szlig;', `using: error in expression ${j+1}, cannot continue. Sorry!`);
					return result;
				}
			}
			return result;
		}
	);	


}