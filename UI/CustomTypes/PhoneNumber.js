sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType, ValidateException) {
    "use strict";

    return SimpleType.extend("fss.ssp.CustomTypes.PhoneNumber", {
		constructor : function () {
			SimpleType.apply(this, arguments);
			this.sName = "PhoneNumber";
		},
		
		formatValue: function (oValue) {
			return oValue;
		},
		parseValue: function (oValue) {
			//parsing step takes place before validating step, value could be altered here
			return oValue;
		},
		
		validateValue: function(oValue){
			return true;
		},
		
		validateValueCustom: function (oValue) {
			// The following Regex is NOT a completely correct one and only used for demonstration purposes.
			// RFC 5322 cannot even checked by a Regex and the Regex for RFC 822 is very long and complex.
			var rexAuNumber = /^(02|03|04|07|08)[0-9]{8}$/;
			var rexForeignNumber = /^(\+)[0-9]{1,16}$/;
			var isValidNumber = true;
			if(!oValue){
				isValidNumber = true;
			}
			else if(oValue[0] !== "0" && oValue[0] !== "+"){
				isValidNumber = false;
			}
			else if(oValue[0] === "0"){
				if(!oValue.match(rexAuNumber)){
					isValidNumber = false;
				}
			}
			else if(oValue[0] === "+"){
				if(!oValue.match(rexForeignNumber)){
					isValidNumber = false;
				}
			}
			
			
			if (!isValidNumber) {
				throw new ValidateException("Invalid phone number. Enter a valid Australian landline or mobile number without spaces or punctuation (e.g. 0287654321). For an overseas number, enter a plus (“+”) symbol followed by any combination of numerals to a maximum of sixteen.");
			}
			return isValidNumber;
		}
	});
	// Email.prototype.formatValue = function (oValue) {
	// 	return oValue;
	// };
	// Email.prototype.parseValue = function (oValue) {
	// 	//parsing step takes place before validating step, value could be altered here
	// 	return oValue;
	// };
	// Email.prototype.validateValue = function (oValue) {
	// 	// The following Regex is NOT a completely correct one and only used for demonstration purposes.
	// 	// RFC 5322 cannot even checked by a Regex and the Regex for RFC 822 is very long and complex.
	// 	var rexMail = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
	// 	if (!oValue.match(rexMail)) {
	// 		throw new ValidateException("'" + oValue + "' is not a valid email address");
	// 	}
	// };
	
	// return Email;
});