sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType, ValidateException) {
    "use strict";

    return SimpleType.extend("fss.ssp.CustomTypes.Email", {
		constructor : function () {
			SimpleType.apply(this, arguments);
			this.sName = "Email";
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
			if(!oValue){
				return true;
			}
			var rexMail = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
			
			if (!oValue.match(rexMail)) {
				throw new ValidateException("'" + oValue + "' is not a valid email address");
			}
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