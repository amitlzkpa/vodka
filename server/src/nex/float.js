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



class Float extends ValueNex {
	constructor(val) {
		super((val) ? val : '0', '%', 'float');
		if (!this._isValid(this.value)) {
			this.value = '0';
		}
	}

	getTypeName() {
		return '-float-';
	}

	makeCopy() {
		let r = new Float(this.value);
		this.copyFieldsTo(r);
		return r;
	}

	_isValid(value) {
		return !isNaN(Number(value));
	}

	evaluate() {
		return this;
	}

	renderValue() {
		return this.value;
	}

	getTypedValue() {
		let v = this.value;
		return Number(v);
	}

	appendMinus() {
		if (this.value == '0') return;
		if (this.value == '0.') return;
		if (/0\.0+$/.test(this.value)) return;
		if (this.value.charAt(0) == '-') {
			this.value = this.value.substring(1);
		} else {
			this.value = '-' + this.value;
		}
	}

	appendZero() {
		if (this.value == '0') return;
		this.value = this.value + '0';
	}

	appendDot() {
		if (this.value.indexOf('.') >= 0) return;
		this.value = this.value + '.';
	}

	appendDigit(d) {
		if (this.value == '0') {
			this.value = d;
		} else {
			this.value = this.value + d;
		}
	}

	appendText(text) {
		if (text == '-') {
			this.appendMinus();
		} else if (text == '.') {
			this.appendDot();
		} else if (text == '0') {
			this.appendZero();
		} else {
			this.appendDigit(text);
		}
	}

	deleteLastLetter() {
		let v = this.value;
		if (v == '0') return;
		if (v.length == 1) {
			this.value = '0';
			return;
		}
		if (v.length == 2 && v.charAt(0) == '-') {
			this.value = '0';
			return;
		}
		this.value = v.substr(0, v.length - 1);
		let isNegative = this.value.charAt(0) == '-';
		let isZero = /-?0(\.0*)$/.test(this.value);
		if (isNegative && isZero) {
			this.value = this.value.substring(1);
		}
	}

	backspaceHack(sourceNode) {
		if (this.value == '0') {
			KeyResponseFunctions['remove-selected-and-select-previous-leaf'](sourceNode);
			return;
		}
		this.deleteLastLetter();
	}

	defaultHandle(txt, context, sourcenode) {
		if (txt == 'Backspace') {
			this.backspaceHack(sourcenode);
			return true;
		}
		if (isNormallyHandled(txt)) {
			return false;
		}
		let okRegex = /^[e0-9.-]$/;
		let letterRegex = /^[a-zA-Z0-9']$/;
		let isSeparator = !letterRegex.test(txt);
		if (okRegex.test(txt)) {
			this.appendText(txt);
		} else if (isSeparator) {
			manipulator.insertAfterSelectedAndSelect(new Separator(txt));
		} else {
			manipulator.insertAfterSelectedAndSelect(new Word())
				&& manipulator.appendAndSelect(new Letter(txt));
		}
		return true;
	}

	getEventTable(context) {
		return {
			'ShiftBackspace': 'remove-selected-and-select-previous-leaf',
			'Backspace': 'delete-last-letter-or-remove-selected-and-select-previous-leaf',
			'Enter': 'do-line-break-always',
		}
	}
}
