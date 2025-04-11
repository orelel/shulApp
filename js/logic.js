"use strict";
(function(){
	let CHAR_FOR_MATCH = 4;

	const app = {
		a: null,
		b: null,
		button: null,
		result: null,
		resultRev: null,
		error: null,
		success: null,
		matchListFor: null,
		matchListRev: null,
		formatCount: 0,

		init: function(){
			this.a = document.querySelector("#groupA textarea");
			this.b = document.querySelector("#groupB textarea");
			this.button = document.querySelector("#action input");
			this.result = document.querySelector("#result");
			this.resultRev = document.querySelector("#resultRev");
			this.error = document.querySelector("#error");
			this.success = document.querySelector("#success");

			this.button.addEventListener("click", () => this.onSubmit());
		},

		processBarcodeAndSerialIntoObject: function(str, serial) {
			const arr = str.trim().replace(/\s+/g, ' ').split(" ");
			if (arr.length === 2) {
				return { serial: arr[0], barcode: arr[1] };
			} else if (arr.length === 1) {
				return { serial: serial, barcode: arr[0] };
			} else {
				throw "format_problem";
			}
		},

		onSubmit: function(){
			this.formatCount = 0;
			CHAR_FOR_MATCH = document.querySelector("#charMatchOut").value;
			this.matchListFor = {};
			this.matchListRev = {};

			if (!this.a.value || !this.b.value) {
				alert("No data in 'My Input' or 'Customer Input'");
				return;
			}

			this.a.value = this.a.value.toUpperCase();
			this.b.value = this.b.value.toUpperCase();

			const groupAList = this.a.value.trim().split("\n").length === 1
				? this.a.value.trim().split(" ")
				: this.a.value.trim().split("\n");

			const groupBList = this.b.value.trim().split("\n").length === 1
				? this.b.value.trim().split(" ")
				: this.b.value.trim().split("\n");

			for (let i = 0; i < groupAList.length; i++) {
				let groupABarcode;
				try {
					groupABarcode = this.processBarcodeAndSerialIntoObject(groupAList[i], "l" + (i+1));
				} catch (err) {
					if (err === "format_problem") this.formatCount++;
					continue;
				}

				for (let j = 0; j < groupBList.length; j++) {
					let groupBBarcode;
					try {
						groupBBarcode = this.processBarcodeAndSerialIntoObject(groupBList[j], "r" + (j+1));
					} catch (err) {
						if (err === "format_problem") this.formatCount++;
						continue;
					}

					const resFor = this.comapre2Barcode(groupABarcode, groupBBarcode);
					const resRev = this.comapre2Barcode(groupABarcode, groupBBarcode, true);

					this.addResultToList(this.matchListFor, resFor, groupABarcode);
					this.addResultToList(this.matchListRev, resRev, groupABarcode);
				}
			}

			this.appendToDOM();
			this.appendToDOM(true);
			this.showResultInDOM();

			if (this.formatCount > 0) {
				alert("There was a format problem with some rows.");
			}
		},

		addResultToList: function(matchList, resObj, me){
			const wrongLength = ![6, 8, 10].includes(resObj.other.barcode.length);
			if (resObj.count >= CHAR_FOR_MATCH || wrongLength) {
				if (!matchList.hasOwnProperty(me.barcode)) {
					matchList[me.barcode] = [];
				}
				matchList[me.barcode].push({
					me: me,
					text: resObj.other,
					reason: wrongLength ? "length" : "match"
				});
			}
		},

		comapre2Barcode: function(me, other, reverse){
			const otherSerial = other.serial;
			let otherBarcode = reverse
				? other.barcode.split("").reverse().map(c => {
					switch (c) {
						case 'A': return 'T';
						case 'T': return 'A';
						case 'C': return 'G';
						case 'G': return 'C';
						default: return c;
					}
				}).join("")
				: other.barcode;

			const minLen = Math.min(me.barcode.length, otherBarcode.length);
			let count = 0;
			for (let i = 0; i < minLen; i++) {
				if (me.barcode[i] === otherBarcode[i]) count++;
			}

			return {
				count: count,
				other: { serial: otherSerial, barcode: otherBarcode }
			};
		},

		colorCoupleStrings: function(str1, str2){
			const minLength = Math.min(str1.length, str2.length);
			let result1 = '', result2 = '';

			for (let i = 0; i < minLength; i++) {
				if (str1[i] === str2[i]) {
					result1 += `<span class="text-red-500">${str1[i]}</span>`;
					result2 += `<span class="text-red-500">${str2[i]}</span>`;
				} else {
					result1 += `<span>${str1[i]}</span>`;
					result2 += `<span>${str2[i]}</span>`;
				}
			}

			if (str1.length > minLength) {
				result1 += str1.slice(minLength).split('').map(ch => `<span>${ch}</span>`).join('');
			}
			if (str2.length > minLength) {
				result2 += str2.slice(minLength).split('').map(ch => `<span>${ch}</span>`).join('');
			}

			return { res1: result1, res2: result2 };
		},

		appendToDOM: function(isRev = false){
			const resultDOM = isRev ? this.resultRev : this.result;
			const matchList = isRev ? this.matchListRev : this.matchListFor;
			let html = '';

			for (const key in matchList) {
				if (matchList.hasOwnProperty(key)) {
					const list = matchList[key];
					list.forEach(item => {
						const strings = this.colorCoupleStrings(key, item.text.barcode);
						html += `
							<ul class="border border-gray-300 p-2 mr-2 mb-2">
								<li>
									<div class="inline-block w-12 font-bold">${item.me.serial}</div>
									<div class="inline-block">${strings.res1}</div>
								</li>
								<li>
									<div class="inline-block w-12 font-bold">${item.text.serial}</div>
									<div class="inline-block">
										${strings.res2} ${item.reason === "length" ? "<b> - length problem</b>" : ""}
									</div>
								</li>
							</ul>`;
					});
				}
			}

			resultDOM.innerHTML = html;
		},

		showResultInDOM: function(){
			const hasResults = Object.keys(this.matchListFor).length > 0 || Object.keys(this.matchListRev).length > 0;

			this.toggleVisibility(this.success, !hasResults);
			this.toggleVisibility(this.error, hasResults);
			this.toggleVisibility(document.getElementById("forwardResultContainer"), hasResults);
			this.toggleVisibility(document.getElementById("reverseResultContainer"), hasResults);
		},

		toggleVisibility: function(element, show){
			if (show) {
				element.classList.remove("hidden");
				element.classList.add("block");
			} else {
				element.classList.remove("block");
				element.classList.add("hidden");
			}
		}
	};

	app.init();
})();
