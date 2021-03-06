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


function sendToServer(payload, cb) {
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {};
	xhr.open('POST', 'api')
	xhr.send(payload);
	xhr.onload = function() {
		if (xhr.readyState === xhr.DONE && xhr.status === 200) {
			cb(xhr.response);
		}
  	}
}

function saveNex(name, nex, callback) {
	let payload = `save\t${name}\t${nex.toString()}`;

	sendToServer(payload, function(data) {
		let e = new EError("success");
		e.setErrorType(ERROR_TYPE_INFO);
		callback(e);
	});
}


function loadNex(name, callback) {
	let payload = `load\t${name}`;

	sendToServer(payload, function(data) {
		document.title = name;
		let nex = new NexParser(data).parse();
		callback(nex);
	});
}

function importNex(name, callback) {
	let payload = `load\t${name}`;

	sendToServer(payload, function(data) {
		let nex = new NexParser(data).parse();
		let result = evaluateNexSafely(nex, BINDINGS);
		let r = null;
		if (result.getTypeName() != '-error-') {
			r = new EError("Import successful.");
			r.setErrorType(ERROR_TYPE_INFO);
		} else {
			r = new EError("Import failed.");
			r.setErrorType(ERROR_TYPE_WARN);
			r.appendChild(result);
		}
		callback(nex);
	});
}

/*
function saveNex(name, nex, exp) {
	let payload = `save\t${name}\t${nex.toString()}`;

	let callback = exp.getCallbackForSet();
	exp.set(function() {
		sendToServer(payload, function(data) {
			let e = new EError("success");
			e.setErrorType(ERROR_TYPE_INFO);
			callback(e);
		});
	});
}


function loadNex(name, exp) {
	let payload = `load\t${name}`;

	let callback = exp.getCallbackForSet();
	exp.set(function() {
		sendToServer(payload, function(data) {
			document.title = name;
			let nex = new NexParser(data).parse();
			callback(nex);
		});
	});
}


function importNex(name, exp) {
	let payload = `load\t${name}`;

	let callback = exp.getCallbackForSet();
	exp.set(function() {
		sendToServer(payload, function(data) {
			let nex = new NexParser(data).parse();
			let result = evaluateNexSafely(nex, BINDINGS);
			let r = null;
			if (result.getTypeName() != '-error-') {
				r = new EError("Import successful.");
				r.setErrorType(ERROR_TYPE_INFO);
			} else {
				r = new EError("Import failed.");
				r.setErrorType(ERROR_TYPE_WARN);
				r.appendChild(result);
			}
			callback(nex);
		});
	});
}
*/
