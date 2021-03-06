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



class Command extends NexContainer {
	constructor(val) {
		super();
		this.commandtext = (val ? val : "");
		this.cachedClosure = null;
		this.notReallyCachedClosure = null; // a wonderful hack
		// a lot of the builtins and other code generate commands with null command strings
		// and append a lambda as the first argument - there's no need to attempt
		// caching in those cases and it's a real performance hit.
		if (this.commandtext) {
			this.cacheClosureIfCommandTextIsBound();
		}
	}

	getTypeName() {
		return '-command-';
	}

	// this method also invalidates/deletes the existing cached closure,
	// and is meant to be called when the command text changes.
	cacheClosureIfCommandTextIsBound() {
		this.cachedClosure = null;
		try {
			let closure = BUILTINS.lookupBinding(this.commandtext);
			if (closure) {
				this.cachedClosure = closure;
			}
		} catch (e) {
			if (!(e instanceof EError)) {
				throw e;
			}
		}
	}

	makeCopy(shallow) {
		let r = new Command();
		this.copyChildrenTo(r, shallow);
		this.copyFieldsTo(r);
		return r;
	}

	toString() {
		return `~"${this.commandtext}"${this.vdir ? 'v' : 'h'}(${super.childrenToString()}~)`;
	}

	copyFieldsTo(nex) {
		super.copyFieldsTo(nex);
		nex.commandtext = this.commandtext;
		nex.cacheClosureIfCommandTextIsBound();
	}

	debugString() {
		return `(~${this.commandtext} ${super.childrenDebugString()})`;
	}

	getKeyFunnel() {
		return new CommandKeyFunnel(this);
	}

	isLambdaCommand(env) {
		let closure = this.getClosure(env);
		return !(closure.getLambda() instanceof Builtin);
	}

	getCommandName() {
		let r = this.getCommandText();
		if (r) {
			return r;
		} else if (this.numChildren() > 0) {
			let c = this.getChildAt(0);
			if (c.getTypeName() == '-symbol-') {
				return c.getTypedValue();
			}
		} else {
			return null;
		}
	}

	hasCachedClosure() {
		return !!this.cachedClosure;
	}

	// maybe deprecated
	doAlertAnimation(lambda) {
		let rn = lambda.getRenderNodes();
		for (let i = 0; i < rn.length; i++) {
			eventQueue.enqueueAlertAnimation(rn[i]);
		}
	}

	needsEvaluation() {
		return true;
	}

	// the executionEnv is captured and becomes the lexical environment of any closures that are
	//   created by evaluating lambdas.
	// it is also used for special forms that have skipeval = true
	// it is also used to look up symbol bindings

	evaluate(executionEnv) {
		pushStackLevel();
		stackCheck(); // not for step eval, this is to prevent call stack overflow.

		// we need a closure, we need a name to use for error messages, and we need to know if skip first arg.
		let closure = null;
		let cmdname = null;
		let skipFirstArg = false;
		if (this.cachedClosure) {
			// it's cached, great. This is a builtin, so not skipping first arg.
			closure = this.cachedClosure;
			cmdname = this.getCommandText();
		} else if (!!this.getCommandText()) {
			// there is command text -- look this up and see if it's bound to something.
			cmdname = this.getCommandText();
			// environment will throw an exception if unbound
			closure = executionEnv.lookupBinding(this.getCommandText());
			// but we also have to make sure it's bound to a closure
			if (!(closure.getTypeName() == '-closure-')) {
				throw new EError(`command: stopping because "${cmdname}" not bound to closure, so cannot execute. Sorry! Debug string for object bound to ${cmdname} of type ${closure.getTypeName()} follows: ${closure.debugString()}`)
			}
		} else if (this.numChildren() > 0) {
			// okay alternate plan, we look at the first child of the command
			let c = this.getChildAt(0);
			// if it's a symbol we can incidentally get the command name
			if (c.getTypeName() == '-symbol-') {
				cmdname = c.getTypedValue();
			}
			// evaluate the first arg, could be a symbol bound to a closure, a lamba, a command that returns a closure, etc.
			closure = evaluateNexSafely(c, executionEnv);
			if (!(closure instanceof Closure)) {
				// oops it's not a closure.
				throw new EError(`command: stopping because first child "${c.debugString()}" of unnamed command does not evaluate to a closure. Sorry! Debug string for evaluted value of type ${closure.getTypeName()} follows: ${closure.debugString()}`)
			}				
			// we already evaluated the first arg, we don't pass it to the arg evaluator
			skipFirstArg = true;
		} else {
			// someone tried to evaluate (~ )
			throw new EError(`command: command with no name and no children has nothing to execute. Sorry!`)			
		}
		if (cmdname == null) {
			// last ditch attempt to figure out command name, using boundName hack
			cmdname = closure.getBoundName();
		}
		if (cmdname == null) {
			// we have to give them something
			cmdname = `<br>*** unnamed function, function body follows **** <br>${closure.getLambda().debugString()}<br>*** end function body ***<br>`;
		}

		if (CONSOLE_DEBUG) {
			console.log(`${INDENT()}evaluating command: ${this.debugString()}`);
			console.log(`${INDENT()}closure is: ${closure.debugString()}`);
		}
		// the arg container holds onto the args and is used by the arg evaluator.
		// I think this is useful for step eval but I can't remember
		let argContainer = new CopiedArgContainer(this, skipFirstArg);
		// in the future there will be one arg evaluator used by both builtins and lambdas.
		// the job of the evaluator is to evaluate the args AND bind them to variables in the new scope.
		let argEvaluator = closure.getArgEvaluator(cmdname, argContainer, executionEnv);
		argEvaluator.evaluateArgs();
		if (PERFORMANCE_MONITOR) {
			perfmon.logMethodCallStart(closure.getCmdName());
		}
		this.doAlertAnimation(closure.getLambda());
		// actually run the code.
		this.notReallyCachedClosure = closure;
		let r = closure.executor(executionEnv, argEvaluator, cmdname, this.tags);
		if (PERFORMANCE_MONITOR) {
			perfmon.logMethodCallEnd(closure.getCmdName());
		}
		if (CONSOLE_DEBUG) {
			console.log(`${INDENT()}command returned: ${r.debugString()}`);
		}
		popStackLevel();
		return r;
	}

	shouldActivateReturnedExpectations() {
		return this.notReallyCachedClosure.shouldActivateReturnedExpectations();
	}

	renderInto(renderNode, renderFlags) {
		let domNode = renderNode.getDomNode();
		let codespan = null;
		if (!(renderFlags & RENDER_FLAG_SHALLOW)) {
			codespan = document.createElement("span");
			codespan.classList.add('codespan');
			domNode.appendChild(codespan);
		}			
		super.renderInto(renderNode, renderFlags); // will create children
		domNode.classList.add('command');
		domNode.classList.add('codelist');
		if (!(renderFlags & RENDER_FLAG_SHALLOW)) {
			if (renderFlags & RENDER_FLAG_EXPLODED) {
				codespan.classList.add('exploded');
			} else {
				codespan.classList.remove('exploded');
			}
			codespan.innerHTML = '<span class="tilde">&#8766;</span>' + this.commandtext;
		}
	}

	renderChildrenIfNormal() {
		return false;
	}

	getCommandText() {
		return this.commandtext;
	}

	setCommandText(t) {
		this.commandtext = t;
		this.cacheClosureIfCommandTextIsBound();
		this.searchingOn = null;
		this.previousMatch = null;
	}

	isEmpty() {
		return this.commandtext == null || this.commandtext == '';
	}

	deleteLastCommandLetter() {
		this.commandtext = this.commandtext.substr(0, this.commandtext.length - 1);
		this.cacheClosureIfCommandTextIsBound();
		this.searchingOn = null;
		this.previousMatch = null;
	}

	appendCommandText(txt) {
		this.commandtext = this.commandtext + txt;
		this.cacheClosureIfCommandTextIsBound();
		this.searchingOn = null;
		this.previousMatch = null;
	}

	// expression list interface

	getExpressionAt(i) {
		return this.getChildAt(i);
	}

	getNumExpressions() {
		return this.getNumChildren();
	}

	replaceExpressionAt(newarg, i) {
		this.replaceChildAt(newarg, i);
	}

	getContextType() {
		return ContextType.COMMAND;
	}

	autocomplete() {
		let searchText = this.searchingOn ? this.searchingOn : this.getCommandText();
		let match = autocomplete.findNextMatchAfter(searchText, this.previousMatch);
		this.setCommandText(match);
		this.searchingOn = searchText;
		this.previousMatch = match;
	}

	static quote(item) {
		let q = new Command('quote');
		q.appendChild(item);
		return q;
	}

	static makeCommandWithClosure(closure) {
		let cmd = new Command();
		cmd.appendChild(Command.quote(closure));
		for (let i = 1; i < arguments.length; i++) {
			cmd.appendChild(arguments[i]);
		}
		return cmd;
	}

	static makeCommandWithArgs(cmdname, args) {
		let cmd = new Command(cmdname);
		for (let i = 0; i < args.length; i++) {
			cmd.appendChild(args[i]);
		}
		return cmd;
	}

	// used by above static helper functions
	static pushListContentsIntoArray(array, list) {
		for (let i = 0; i < list.numChildren(); i++) {
			array.push(list.getChildAt(i));
		}
	}

	defaultHandle(txt) {
		if (txt != '*' && isNormallyHandled(txt)) {
			return false;
		}
		let allowedKeyRegex = /^[a-zA-Z0-9-_=+/*<>:]$/;
		let isLetterRegex = /^.$/;
		if (allowedKeyRegex.test(txt)) {
			this.appendCommandText(txt);
		} else if (isLetterRegex.test(txt)) {
			if (this.hasChildren()) {
				manipulator.insertAfterSelectedAndSelect(new Letter(txt))
			} else {
				manipulator.appendAndSelect(new Letter(txt));
			}
		}
		return true;
	}

	getEventTable(context) {
		return {
			'ShiftEnter': 'evaluate-nex-and-keep',
			'Enter': 'evaluate-nex',
			'Backspace': 'delete-last-command-letter-or-remove-selected-and-select-previous-sibling',
			'ShiftSpace': 'toggle-dir',
			'CtrlSpace': 'autocomplete'
		};
	}
}
