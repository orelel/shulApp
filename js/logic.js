"use strict";
(function(){
	var CHAR_FOR_MATCH = 4;

	var app = {
		a: null,
		b: null,
		button: null,
		result: null,
		resultRev: null,
		error: null,
		formatCount:0,
		success: null,
		matchListFor: null,
		matchListRev: null,
		init: function(){
			this.a = document.querySelectorAll("#groupA textarea")[0];
			this.b = document.querySelectorAll("#groupB textarea")[0];
			this.button = document.querySelectorAll("#action input")[0];
			this.result = document.querySelectorAll("#result")[0];
			this.resultRev = document.querySelectorAll("#resultRev")[0];
			this.error = document.querySelectorAll("#error")[0];
			this.success = document.querySelectorAll("#success")[0];
			this.button.addEventListener("click",function(){
				this.onSubmit();
			}.bind(this));
		},
		processBarcodeAndSerialIntoObject: function(str,serial) {
			var arr = str.trim().replace(/\s+/g, ' ').split(" ");
			if(arr.length == 2){
				return {
					serial: arr[0],
					barcode: arr[1]
				}
			}else if(arr.length == 1){
				return {
					serial: serial,
					barcode: arr[0]
				}
			}else{
				throw "format_problem"
			}

		},
		onSubmit: function(){
			this.formatCount = 0;
			CHAR_FOR_MATCH = document.querySelectorAll("#charMatchOut")[0].value;
			this.matchListFor = {};
			this.matchListRev = {};
			if (!this.a.value || !this.b.value) {
				alert("no data in my list or client list");
				return;
			}
			this.a.value =  this.a.value.toUpperCase();
			this.b.value =  this.b.value.toUpperCase();
			var groupAList = this.a.value.trim().split("\n").length === 1 ? this.a.value.trim().split(" ") : this.a.value.trim().split("\n");
			var groupBList = this.b.value.trim().split("\n").length === 1 ? this.b.value.trim().split(" ") : this.b.value.trim().split("\n");

			for (var i = 0; i < groupAList.length; i++) {
				try {
					var groupABarcode = this.processBarcodeAndSerialIntoObject(groupAList[i],"l"+(i+1));
				}catch(err){
					if(err === "format_problem"){
						this.formatCount++;
					}
				}
				for (var j = 0; j < groupBList.length; j++) {
					try {
						var groupBBarcode = this.processBarcodeAndSerialIntoObject(groupBList[j],"r"+(j+1));
					}catch(err){
						if(err === "format_problem"){
							this.formatCount++;
						}
					}
					var resFor = this.comapre2Barcode(groupABarcode, groupBBarcode);
					var resRev = this.comapre2Barcode(groupABarcode, groupBBarcode, true);
					this.addResultToList(this.matchListFor, resFor, groupABarcode);
					this.addResultToList(this.matchListRev, resRev, groupABarcode);
				}

			}
			this.appendToDOM();
			this.appendToDOM(true);
			this.showResultInDOM();
			if(this.formatCount > 0){
				alert("There was format problem with some rows");
			}
		},
		addResultToList: function(matchList,resObj,me){
			const otherBarcodeLength = resObj.other.barcode.length;
			var wrongLength = otherBarcodeLength != 6 && otherBarcodeLength != 8 && otherBarcodeLength != 10;
			if(resObj.count >= CHAR_FOR_MATCH || wrongLength){
				if(!matchList.hasOwnProperty(me)){
					matchList[me.barcode] = [];
				}
				matchList[me.barcode].push({
					me: me,
					text: resObj.other,
					reason: wrongLength ? "length" : "match"
				});
			}
		},
		comapre2Barcode : function(me,other,reverse){
			var otherSerial = other.serial;
			if(reverse){
				//implement: A = T , C = G , read from end to start
				other = other.barcode.split("").reverse().join("");
				var replaceMap = [];
				for(var p=0;p<other.length;p++){
					switch(other[p]){
						case 'A':
							replaceMap.push({
								c: 'T',
								i: p
							});							
							break;
						case 'T':
							replaceMap.push({
								c: 'A',
								i: p
							});
							break;
						case 'C':
							replaceMap.push({
								c: 'G',
								i: p
							});
							break;
						case 'G':
							replaceMap.push({
								c: 'C',
								i: p
							});
							break;
						
					}
				}
				var replaceAt = function(str,index,character){
					return str.substr(0, index) + character + str.substr(index+character.length)
				};
				replaceMap.forEach(function(obj){
					other = replaceAt(other,obj.i,obj.c);
				});
				
			}else{
				other = other.barcode;
			}
			me = me.barcode;
			var shortestBarcode = me.length < other.length ? me.length : other.length;
			var counter = 0;
			for(var i=0;i<shortestBarcode;i++){
				if(me[i] === other[i]){
					counter++;
				}
			}

			return {
				count: counter,
				other: {
					serial: otherSerial,
					barcode: other
				}
			};
		},
		colorCoupleStrings: function(str1,str2){
			var longestString = str1.length != str2.length ? (str1.length < str2.length ? 2 : 1) : null;
			var shortestLength = str1.length < str2.length ? str1.length : str2.length;
			var result1 = '';
			var result2 = '';
			for(var i=0;i<shortestLength;i++){
				if(str1[i] === str2[i]){
					result1+= '<span class="red">' +  str1[i] + '</span>';
					result2+= '<span class="red">' +  str2[i] + '</span>';
				}else{
					result1+= '<span>' +  str1[i] + '</span>';
					result2+= '<span>' +  str2[i] + '</span>';
				}
			}
			if(longestString){
				var result = longestString === 1 ? result1 : result2;
				var str = longestString === 1 ? str1 : str2;
				for(var j=i;j<str.length;j++){
					result+= '<span>' +  str[j] + '</span>';
				}
			}			
			return {
				res1 : result1,
				res2: result2
			}
		},
		appendToDOM: function(isRev){
			var html = "";
			var matchList = isRev ? this.matchListRev : this.matchListFor;
			var resultDOM = isRev ? this.resultRev : this.result;
			for(var key in matchList){
				if(matchList.hasOwnProperty(key)){
					var list = matchList[key];
					list.forEach(function(item){
						var strings = this.colorCoupleStrings(key,item.text.barcode);
						html+= '<ul><li><div class="serial">' + item.me.serial + '</div><div>' + strings.res1 + '</div></li><li><div class="serial">' + item.text.serial + '</div><div>' + strings.res2 +  (item.reason === "length" ? '<b> - length problem</b>' : '') + '</div></li></ul>'
					}.bind(this));
					html+= '</div>'
				}
			}
			resultDOM.innerHTML = html;
		},
		showResultInDOM: function(){
			if(Object.getOwnPropertyNames(this.matchListFor).length === 0 && Object.getOwnPropertyNames(this.matchListRev).length === 0 ) {
				this.showHideElement(this.success,true);
				this.showHideElement(this.error);
				this.showHideElement(this.resultRev.parentNode);
				this.showHideElement(this.result.parentNode);
			}else{
				this.showHideElement(this.success);
				this.showHideElement(this.error,true);
				this.showHideElement(this.resultRev.parentNode,true);
				this.showHideElement(this.result.parentNode,true);
			}
		},
		showHideElement: function(element,show){
			if(show){
				element.classList.remove("hide");
				element.classList.add("show");
			}else{
				element.classList.remove("show");
				element.classList.add("hide");
			}
		}
	};
	app.init();

})();
