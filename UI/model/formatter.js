sap.ui.define([
  "fss/ssp/model/Constants"
  ], function (Constants) {
    "use strict";

    /**
     * This object maintains all formatting functions.
     */
    return {
      totalValueAud: function(amount, exchangeRate, currency){
        var value = amount || 0;

        try{
          var currencyFactors = this.getModel("dropDownModel").getProperty("/CurrencyFactor") || {};
          if(exchangeRate && currency){

            value = value * exchangeRate / (currencyFactors[currency] || 1);
          }
        }
        catch(exception){

        }
        return value;
      },

      totalValueAudFormatter: function(amount, exchangeRate, currency){
        var value = (this.totalValueAud || this.formatter.totalValueAud).bind(this)(amount, exchangeRate, currency)
        return this.formatter.currencyValue(value, "AUD");
      },

      isNotZero: function(sValue){
        if(!isNaN(Number(sValue))){
          return Number(sValue) > 0;
        }
        return false;
      },

      isZero: function(sValue){
        return isNaN(Number(sValue)) || Number(sValue) === 0 || !sValue;
      },

      consumptionReportCss: function(isContract){
        return isContract ? "consumptionReport" : "";
      },

      /**
       * Rounds the currency value to required digits based on the currency
       * @public
       * @param {string} sValue value to be formatted
       * @param {string} currency value to be formatted
       * @returns {string} formatted currency value in String
       */
      currencyValue : function (sValue, currency) {
        var temp = sValue;
        if (!temp) {
          temp = 0;
        }
        if(currency){
          temp = (this.currencyValueNumber || this.formatter.currencyValueNumber)(temp, currency);
          // var oLocale = new sap.ui.core.Locale("en-AU");
          var oFormatOptions = {
              showMeasure: false,
              currencyCode: true,
              currencyContext: "standard"};
          var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance(oFormatOptions);
          return oCurrencyFormat.format(temp, currency);
        }

        return parseFloat(temp).toFixed(2);
      },

      currencyValueNonFormatString: function (sValue, currency) {
        var result = Number(Number(sValue).toFixed(4));
        var oCurrency = new sap.ui.model.type.Currency({
          showMeasure: false,
          roundingMode: sap.ui.core.format.NumberFormat.RoundingMode.FLOOR
        });
        if(oCurrency.formatValue([result, currency], "string")){
          result = oCurrency.formatValue([result, currency], "string").replace(/,/g, "");
          // if(!isNaN(tempValue)){
          //  result = tempValue;
          // }
        }
        return result;
      },

      /**
       * Rounds the currency value to required digits based on the currency
       * @public
       * @param {string} sValue value to be formatted
       * @param {string} currency value to be formatted
       * @returns {string} formatted currency value in Number
       */
      currencyValueNumber: function (sValue, currency) {
        var result = Number(Number(sValue).toFixed(4));
        var oCurrency = new sap.ui.model.type.Currency({
          showMeasure: false
        });
        if(oCurrency.formatValue([result, currency], "string")){
          var tempValue = Number(oCurrency.formatValue([result, currency], "string").replace(/,/g, ""));
          if(!isNaN(tempValue)){
            result = tempValue;
          }
        }
        return result;
      },

      currencyNameFormatter : function (name, currencyI18) {
        var result = "";
        if(name){
          var currencyStr = (currencyI18) ? currencyI18 : "Currency";
          result = currencyStr + ": " + name;
        }
        return result;
      },

      /**
       * Returns the icon based on status of LI
       * @public
       * @param {string} status Status of LI
       * @returns {string} icon corresponding to status
       */
      lineItemStatusIcon: function(status){
        if(status === this.constants.STATUS_LI_DELETED){
          return "sap-icon://delete";
        }
        if(status === this.constants.STATUS_LI_LOCKED){
          return "sap-icon://locked";
        }
        if(status === this.constants.STATUS_LI_DRAFT){
          return "sap-icon://request";
        }
        return "";
      },

      /**
       * Returns dialog width based on system type
       * @public
       * @param {DeviceOobject} system device object
       * @returns {string} width size
       */
      liDialogWidth: function(system){
        if(system.desktop){
          return "70%";
        }
        return "100%";
      },

      /**
       * Returns whether edit should be enabled. Currently returns always true
       * @public
       * @param {string} status Status of document
       * @param {string} changedById ID of last person changed the document
       * @param {string} userId logged on user
       * @returns {boolean} True if it is enabed, false otherwise
       */
      enableEdit: function(status, changedById, userId){
        // if (status === Constants.STATUS_AWAITING_APPROVAL) {
        //  if (!userId || userId !== changedById) {
        //    return true;
        //  }
        // }
        return true;
      },

      /**
       * Returns contract search width based on device type
       * @public
       * @param {DeviceObject} device device object
       * @returns {string} width size
       */
      contractSearchDialogWidth: function(device){
        if(device.system.desktop){
          return device.resize.width * 0.8 + "px";
        }
        return device.resize.width + "px";
      },

      /**
       * Returns dropdown width based on device type
       * @public
       * @param {DeviceObject} system device object
       * @returns {string} width size
       */
      liDropDownWidth: function(system){
        if(system.desktop){
          return "30%";
        }
        return "50%";
      },

      /**
       * Checks if value is not empty
       * @public
       * @param {object} value value to check
       * @returns {boolean} true if not empty, false otherwise
       */
      isNotEmpty: function(value){
        if(!value){
          return false;
        }
        // if(!value && value !== false){
        //  return false;
        // }
        return true;
      },

      /**
       * Checks if value is empty
       * @public
       * @param {object} value value to check
       * @returns {boolean} true if  empty, false otherwise
       */
      isEmpty: function(value){
        if(value || value === false){
          return false;
        }
        return true;
      },


      /**
       * COnverts the string value to number, if null, returns 0.
       * @public
       * @param {string} sValue length as a string
       * @returns {string} length as a number
       */
      fieldLengthFormatter: function(sValue){
        if(!isNaN(Number(sValue))){
          return Number(sValue);
        }
        return 0;
      },

      /**
       * Removes 0s on the left of the line number
       * @public
       * @param {string} sValue line number
       * @returns {string} formatted line number
       */
      lineNumberFormatter: function(sValue){
        if(!isNaN(Number(sValue))){
          return Number(sValue) === 0 ? "" : Number(sValue);
        }
        return sValue;
      },

      /**
       * Removes 0s on the left of the line number
       * @public
       * @param {string} sValue line number
       * @returns {string} formatted line number
       */
      lengthFormatter: function(sValue){
        if(!isNaN(Number(sValue))){
          return Number(sValue);
        }
        return sValue;
      },

      /**
       * Converts PRF URL(which includes HTML tags) to a normal url
       * @public
       * @param {string} prfUrl PRF URL including HTML tags
       * @returns {string} PRF URL
       */
      escapePRFUrl: function(prfUrl){
        if(!prfUrl){
          return prfUrl;
        }

        var aSplit = prfUrl.split("\"");
        var url;
        if(aSplit.length === 1){
          url = aSplit[0];
        }else{
          url = aSplit[1];
        }

        return url.replace(/<\(>&<\)>/g, "&");
      },

      /**
       * Formatter for document header.
       * @public
       * @param {string} docNum Document number
       * @returns {string} Formatted header
       */
      headerDocNum: function(docNum){
        if(docNum){
          return " (" + docNum + ")";
        }
        return docNum;
      },

      documentObjTitle: function(contractNumber, purchaseNumber, isSinglePo, poNumber){
        var result = contractNumber;
        if(isSinglePo && purchaseNumber){
          result += " / " + purchaseNumber;
        }
        else if(!contractNumber){
          result = poNumber;
        }
        return result;
      },

      /**
       * Calculates net price according to unit price and quantity. If net price is not null, it returns
       * the calculated value. The value is formatted by the currency passed.
       * @public
       * @param {string} netPrice Net Price
       * @param {string} currency Currency used for formatting
       * @param {string} unitPrice Unit price
       * @param {string} unitQty Unit quantity
       * @returns {string} Formatted net price
       */
      netPriceFormatter: function(netPrice, currency, unitPrice, unitQty){
        // var amount = (netPrice === undefined || netPrice === null || netPrice <= 0) ?
        //        unitPrice * unitQty :
        //        netPrice;
        var amount = unitPrice * unitQty;
        amount = Number(Number(amount).toFixed(3));
        // var sFormatted = this.formatter.currencyValueNonFormatString(amount, currency);

        //if there are invalid decimal points, do not format
        // if((amount + "").length > sFormatted.length){
        //  return amount;
        // }
        return this.formatter.currencyValue(amount, currency);
      },


      qtyRemainingFormatter: function(qty, delivered){
        var oNumberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
          decimals: 3,
          groupingEnabled: true
        });
        return oNumberFormat.format((qty || 0) - (delivered || 0));
      },

      /**
       * Formatter for Value Help input fields display.
       * @public
       * @param {string} sKey Key value
       * @param {string} sDescription Description associated to the key
       * @returns {string} Formatted text
       */
      valueHelpDisplay: function(sKey, sDescription){
        if(!sKey){
          return "";
        }
        var tempKey = this.formatter.lineNumberFormatter ? this.formatter.lineNumberFormatter(sKey) : sKey;//removing leading zeros
        var tempDesc = this.formatter.lineNumberFormatter ? this.formatter.lineNumberFormatter(sDescription) : sDescription;//removing leading zeros

        return (tempDesc) ? tempKey + " ( " + tempDesc + " )" : tempKey;
      },

      valueHelpDisplayValue: function(sKey, sDescription){
        if(!sKey){
          return "";
        }

        return sDescription;
      },

      subcontractorDisplay: function(sABN, sName){
        if(!sName){
          return "";
        }

        return (sABN) ? sName + " ( " + sABN + " )" : sName;
      },

      /**
       * Formatter for Value Help input fields display.
       * @public
       * @param {string} sKey Key value
       * @param {string} sDescription Description associated to the key
       * @returns {string} Formatted text
       */
      valueHelpDisplayKeepZeros: function(sKey, sDescription){
        if(!sKey){
          return "";
        }
        // var tempKey = this.formatter.lineNumberFormatter(sKey);//removing leading zeros
        // var tempDesc = this.formatter.lineNumberFormatter(sDescription);//removing leading zeros

        return (sDescription) ? sKey + " ( " + sDescription + " )" : sKey;
      },

      invoicingPartyDisplay: function(sKey, sCity, sName){
        if(!sKey){
          return "";
        }
        var key = this.formatter.lineNumberFormatter(sKey);
        return (sName) ?  key + " ( " + sName + ((sCity) ? " - " + sCity : "" ) + " )" : key;
      },

      assetValueHelpDisplay: function(sKey, sSubNumber, sDescription){
        if(!sKey){
          return "";
        }
        var tempKey = this.formatter.lineNumberFormatter ? this.formatter.lineNumberFormatter(sKey) : sKey;//removing leading zeros
        var tempSub = this.formatter.lineNumberFormatter ? this.formatter.lineNumberFormatter(sSubNumber) : sSubNumber;//removing leading zeros

        tempKey = (tempSub || tempSub === 0) ? tempKey + " - " + tempSub : tempKey;
        return (sDescription) ? tempKey + " ( " + sDescription + " )" : tempKey;
      },

      /**
       * Formatter for contract's status text. If long text is available, it's displayed, otherwise shot text
       * @public
       * @param {string} longText status long text
       * @param {string} shortText status short text
       * @returns {string} Formatted text
       */
      contractStatusText: function(longText, shortText){
        if(longText){
          return longText;
        }
        return shortText;
      },

      /**
       * Formatter for contract's status state.
       * @public
       * @param {string} status Status code
       * @returns {string} State
       */
      contractStatus: function(status){
        if(status === Constants.STATUS_AWAITING_APPROVAL || status === Constants.STATUS_AWAITING_ASSET || status === Constants.STATUS_AWAITING_PRF){
          return "Warning";
        }
        if(status === Constants.STATUS_APPROVED || status === Constants.STATUS_DELETED){
          return "Success";
        }
        if(status === Constants.STATUS_REJECTED || status === Constants.STATUS_RECALLED || status === Constants.STATUS_FAILED){
          return "Error";
        }
        return "None";
      }
    };

  }
);