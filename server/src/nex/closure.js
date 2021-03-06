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

class Closure extends ValueNex {
	constructor(lambda, lexicalEnvironment) {
		super('', '&', 'closure')
		this.lambda = lambda;
		this.cmdname = '*** not set ***';
		this.lexicalEnvironment = lexicalEnvironment;
		this.boundName = null;
	}

	setBoundName(name) {
		this.boundName = name;
	}

	getBoundName() {
		return this.boundName;
	}

	getLexicalEnvironment() {
		return this.lexicalEnvironment;
	}

	setLexicalEnvironment(env) {
		// used by bind primitive because otherwise order matters and you have to
		// define things before using them
		this.lexicalEnvironment = env;
	}

	getLambda() {
		return this.lambda;
	}

	makeCopy() {
		let r = new Closure();
		this.copyFieldsTo(r);
		return r;
	}

	copyFieldsTo(nex) {
		super.copyFieldsTo(nex);
		nex.lambda = this.lambda;
		nex.lexicalEnvironment = this.lexicalEnvironment.copy();
		nex.boundName = this.boundName;
	}

	setCmdName(nm) {
		this.cmdname = nm;
	}

	getCmdName() {
		return this.cmdname;
	}

	getArgEvaluator(cmdname, argContainer, executionEnvironment) {
//		if (this.lambda instanceof Builtin) {
			return new BuiltinArgEvaluator(cmdname, this.lambda.paramsArray, argContainer, executionEnvironment);
		// } else {
		// 	return new LambdaArgEvaluator(
		// 		this.lambda.getParamNames(),
		// 		argContainer, executionEnvironment, cmdname);
		// }
	}

	shouldActivateReturnedExpectations() {
		let rvp = this.lambda.getReturnValueParam();
		if (rvp && rvp.skipactivate) {
			return false;
		}
		return true;
	}

	executor(executionEnvironment, argEvaluator, cmdname, commandTags) {
		let newScope = this.lexicalEnvironment.pushEnv();
		argEvaluator.bindArgs(newScope);
		if (this.lambda instanceof Builtin) {
			return this.lambda.executor(newScope, executionEnvironment, commandTags);
		}
		let r = new Nil();
		let i = 0;
		let numc = this.lambda.numChildren();
		for (let i = 0; i < numc; i++) {
			let c = this.lambda.getChildAt(i);
			// for now we just don't activate in lambdas. I think this is fine because the
			// lambda's result will always be returned as an arg somewhere, or at the
			// top level.
			r = evaluateNexSafely(c, newScope, true /* skipactivate */);
			if (isFatalError(r)) {
				r = wrapError('&amp;', `${cmdname}: error in expr ${i+1}`, r);
				return r;
			}
			// if (rvp && isReturnValue) {
			// 	let typeChecksOut = BuiltinArgEvaluator.ARG_VALIDATORS[rvp.type](r);
			// 	if (!typeChecksOut) {
			// 		return wrapError('&amp;', `${cmdname}: should return ${rvp.type} but returned ${r.getTypeName()}`, r);
			// 		// if (arg.getTypeName() == '-error-') {
			// 		// 	throw wrapError('&szlig;', `${this.name}: non-fatal error in argument ${i + 1}, but stopping because expected type for this argument was ${expectedType}. Sorry!`, arg);
			// 		// }
			// 	}
			// }
		}
		return r;
	}

	getTypeName() {
		return '-closure-';
	}
}


