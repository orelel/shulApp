"use strict";

(() => {
  const CHAR_FOR_MATCH_DEFAULT = 4;
  let charForMatch = CHAR_FOR_MATCH_DEFAULT;

  const app = {
    a: null,
    b: null,
    button: null,
    result: null,
    resultRev: null,
    error: null,
    success: null,
    matchListFor: {},
    matchListRev: {},
    formatCount: 0,

    init() {
      this.cacheDOM();
      this.bindEvents();
    },

    cacheDOM() {
      this.a = document.querySelector("#groupA textarea");
      this.b = document.querySelector("#groupB textarea");
      this.button = document.querySelector("#action input");
      this.result = document.querySelector("#result");
      this.resultRev = document.querySelector("#resultRev");
      this.error = document.querySelector("#error");
      this.success = document.querySelector("#success");
    },

    bindEvents() {
      if (this.button) {
        this.button.addEventListener("click", () => this.onSubmit());
      }

      const reverseBtn = document.getElementById("reverseButton");
      if (reverseBtn) {
        reverseBtn.addEventListener("click", this.handleReverseInput);
      }
    },

    handleReverseInput() {
      const input = document.getElementById("reverseInput").value.trim().toUpperCase().split("\n");
      const output = input.map(line => {
        const [firstWord, secondWord] = line.split(" ");
        if (!secondWord) return line; // If there's no second word, return the line as is
        const reversedSecondWord = app.reverseComplement(secondWord);
        return `${firstWord} ${reversedSecondWord}`;
      });
      // Join the output array into a single string with line breaks
      document.getElementById("reverseOutput").value = output.join("\n");
    },

    reverseComplement(line) {
      const map = { A: "T", T: "A", C: "G", G: "C" };
      return [...line].reverse().map(c => map[c] || c).join("");
    },

    onSubmit() {
      this.formatCount = 0;
      charForMatch = parseInt(document.querySelector("#charMatchOut").value, 10) || CHAR_FOR_MATCH_DEFAULT;
      this.matchListFor = {};
      this.matchListRev = {};

      if (!this.a.value || !this.b.value) {
        alert("No data in 'My Input' or 'Customer Input'");
        return;
      }

      const groupAList = this.parseInput(this.a.value);
      const groupBList = this.parseInput(this.b.value);

      groupAList.forEach((itemA, i) => {
        let groupABarcode;
        try {
          groupABarcode = this.processBarcodeAndSerialIntoObject(itemA, `l${i + 1}`);
        } catch (err) {
          if (err === "format_problem") this.formatCount++;
          return;
        }

        groupBList.forEach((itemB, j) => {
          let groupBBarcode;
          try {
            groupBBarcode = this.processBarcodeAndSerialIntoObject(itemB, `r${j + 1}`);
          } catch (err) {
            if (err === "format_problem") this.formatCount++;
            return;
          }

          const resFor = this.compareBarcodes(groupABarcode, groupBBarcode);
          const resRev = this.compareBarcodes(groupABarcode, groupBBarcode, true);

          this.addResultToList(this.matchListFor, resFor, groupABarcode);
          this.addResultToList(this.matchListRev, resRev, groupABarcode);
        });
      });

      this.appendToDOM();
      this.appendToDOM(true);
      this.showResultInDOM();

      if (this.formatCount > 0) {
        alert("There was a format problem with some rows.");
      }
    },

    parseInput(input) {
      const trimmed = input.trim().toUpperCase();
      return trimmed.includes("\n") ? trimmed.split("\n") : trimmed.split(" ");
    },

    processBarcodeAndSerialIntoObject(str, serial) {
      const arr = str.trim().replace(/\s+/g, " ").split(" ");
      if (arr.length === 2) return { serial: arr[0], barcode: arr[1] };
      if (arr.length === 1) return { serial, barcode: arr[0] };
      throw "format_problem";
    },

    compareBarcodes(me, other, reverse = false) {
      const otherBarcode = reverse ? app.reverseComplement(other.barcode) : other.barcode;
      const minLen = Math.min(me.barcode.length, otherBarcode.length);
      let count = 0;

      for (let i = 0; i < minLen; i++) {
        if (me.barcode[i] === otherBarcode[i]) count++;
      }

      return {
        count,
        other: { serial: other.serial, barcode: otherBarcode },
      };
    },

    addResultToList(matchList, resObj, me) {
      const wrongLength = ![6, 8, 10].includes(resObj.other.barcode.length);
      if (resObj.count >= charForMatch || wrongLength) {
        if (!matchList[me.barcode]) matchList[me.barcode] = [];
        matchList[me.barcode].push({
          me,
          text: resObj.other,
          reason: wrongLength ? "length" : "match",
        });
      }
    },

    colorCoupleStrings(str1, str2) {
      const minLength = Math.min(str1.length, str2.length);
      let result1 = "", result2 = "";

      for (let i = 0; i < minLength; i++) {
        const char1 = str1[i];
        const char2 = str2[i];
        const match = char1 === char2;
        result1 += `<span${match ? ' class="text-red-500"' : ""}>${char1}</span>`;
        result2 += `<span${match ? ' class="text-red-500"' : ""}>${char2}</span>`;
      }

      result1 += [...str1.slice(minLength)].map(c => `<span>${c}</span>`).join("");
      result2 += [...str2.slice(minLength)].map(c => `<span>${c}</span>`).join("");

      return { res1: result1, res2: result2 };
    },

    appendToDOM(isRev = false) {
      const resultDOM = isRev ? this.resultRev : this.result;
      const matchList = isRev ? this.matchListRev : this.matchListFor;
      let html = "";

      Object.entries(matchList).forEach(([key, list]) => {
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
      });

      resultDOM.innerHTML = html;
    },

    showResultInDOM() {
      const hasResults = Object.keys(this.matchListFor).length > 0 || Object.keys(this.matchListRev).length > 0;

      this.toggleVisibility(this.success, !hasResults);
      this.toggleVisibility(this.error, hasResults);
      this.toggleVisibility(document.getElementById("forwardResultContainer"), hasResults);
      this.toggleVisibility(document.getElementById("reverseResultContainer"), hasResults);
    },

    toggleVisibility(element, show) {
      element.classList.toggle("hidden", !show);
      element.classList.toggle("block", show);
    }
  };

  app.init();
})();
