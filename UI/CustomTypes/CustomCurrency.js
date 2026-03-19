sap.ui.define([
    "sap/ui/model/type/Currency",
    "sap/ui/model/ValidateException"
    
], function (Currency, ValidateException) {
    "use strict";

    return Currency.extend("fss.ssp.CustomTypes.CustomCurrency", {
		constructor : function () {
			Currency.apply(this, arguments);
			
			if(!this.oFormatOptions.hasOwnProperty("showMeasure")){
				this.oFormatOptions.showMeasure = false;
			}
			
			if(!this.oConstraints.hasOwnProperty("minimum")){
				this.oConstraints.minimum = 0;
			}
			
		},
		
		parseValue: function(vValue, sInternalType){
			var ret = [];
			if(vValue === ""){
				ret.push(0);
			}
			else{
				ret =  Currency.prototype.parseValue.apply(this, arguments);
			}
			
			return ret; 
		},
		
		formatValue: function (vValue, sInternalType) {
			var sFormatted = Currency.prototype.formatValue.apply(this, arguments);
			if(!sFormatted){
				vValue[0] = 0;
				return Currency.prototype.formatValue.apply(this, arguments);
			}
			
			var sFormattedNoComma = sFormatted.replace(/,/g, "");
			if(sFormattedNoComma.length < (Number(vValue[0]) + "").length ){
				return (vValue[0] + "");
			}
			return sFormatted;
		},
		
		validateValueDecimals: function(sAmount, sCurrency){
			var sFormatted = Currency.prototype.formatValue.apply(this, [[sAmount, sCurrency], "string"]);
			var sFormattedNoComma = sFormatted.replace(/,/g, "");
			
			if(sFormattedNoComma.length < (Number(sAmount) + "").length ){
				throw new ValidateException("Invalid number of decimals for selected currency.");
			}
			
			this.validateValue(this.parseValue(sAmount + "", "string"));
		},
		
		/**********If inputCtrl is null, check if vValue is an array, otherwise return.**************/
		validateValueCustom: function(vValue, inputCtrl){
			// var oBinding = inputCtrl.getBindingInfo("value");
			// var amountModel = oBinding.parts[0].model;
			// var amountPath = oBinding.parts[0].path;
			// var sAmount;
			
			// if(amountPath){
			// 	amountPath = this.__getContextPath(inputCtrl, amountModel) + amountPath;
			// 	sAmount = inputCtrl.getModel(amountModel).getProperty(amountPath);
			// }
			// else{
			// 	return;
			// }
			
			// var currencyModel = oBinding.parts[1].model;
			// var currencyPath = oBinding.parts[1].path;
			// var sCurrency;
			
			// if(currencyPath){
			// 	currencyPath = this.__getContextPath(inputCtrl, currencyModel) + currencyPath;
			// 	sCurrency = inputCtrl.getModel(currencyModel).getProperty(currencyPath);
			// }
			// else{
			// 	return;
			// }
			
			if(inputCtrl){
				var oValues = this.getAmountAndCurrency(inputCtrl);
				if(oValues.hasOwnProperty("amount") && oValues.hasOwnProperty("currency")){
					this.validateValueDecimals(oValues.amount, oValues.currency);
				}
			}
			else if(Array.isArray(vValue)){
				this.validateValueDecimals(vValue[0], vValue[1]);
			}
			else{
				return;
			}
			// var sFormatted = Currency.prototype.formatValue.apply(this, [[amount, currency], "string"]);
			// var sFormattedNoComma = sFormatted.replace(/,/g, "");
			
			// if(sFormattedNoComma.length < (amount + "").length ){
			// 	throw new ValidateException("Invalid number of decimals for currency type.");
			// }
			
		},
		
		getAmountAndCurrency: function(inputCtrl){
			var oBinding = inputCtrl.getBindingInfo("value");
			var oResult = {};
			var amountModel = oBinding.parts[0].model;
			var amountPath = oBinding.parts[0].path;
			
			if(amountPath){
				amountPath = this.__getContextPath(inputCtrl, amountModel) + amountPath;
				oResult.amount = inputCtrl.getModel(amountModel).getProperty(amountPath);
			}
			
			
			var currencyModel = oBinding.parts[1].model;
			var currencyPath = oBinding.parts[1].path;
			// var sCurrency;
			
			if(currencyPath){
				currencyPath = this.__getContextPath(inputCtrl, currencyModel) + currencyPath;
				oResult.currency = inputCtrl.getModel(currencyModel).getProperty(currencyPath);
			}
			return oResult;
		},
		
		/**
		 * Finds the biding context path for a control
		 * @public
		 * @param {Control} obj control to check
		 * @param {string} model cname of the model
		 * @returns {string} Binding context path
		 */
		__getContextPath: function(obj, model){
			if(!obj.getBindingContext(model) || !obj.getBindingContext(model).getPath()){
				return "";
			}
			return obj.getBindingContext(model).getPath() + (obj.getBindingContext(model).getPath() === "/" ? "" : "/");
		},
		
		
	});
});