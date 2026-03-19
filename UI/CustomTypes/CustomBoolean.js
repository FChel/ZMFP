sap.ui.define(
	['sap/ui/model/type/Boolean'],
	function(BooleanType) {
	"use strict";
	
	var CustomBoolean = BooleanType.extend("fss.ssp.CustomTypes.CustomBoolean", {

		constructor : function () {
			BooleanType.apply(this, arguments);
			this.sName = "CustomBoolean";
		}
	});

	CustomBoolean.prototype.formatValue = function(bValue, sInternalType) { 
		if (bValue === undefined || bValue === null) {
			return false;
		}

		return BooleanType.prototype.formatValue(bValue, sInternalType);
		// switch (this.getPrimitiveType(sInternalType)) {
		// 	case "boolean":
		// 	case "any":
		// 		return bValue;
		// 	case "string":
		// 		return bValue.toString();
		// 	case "int": // TODO return 1 for true?!
		// 	case "float":
		// 	default:
		// 		throw new FormatException("Don't know how to format Boolean to " + sInternalType);
		// }
	};

	CustomBoolean.prototype.parseValue = function(oValue, sInternalType) {
		var oBundle;
		switch (this.getPrimitiveType(sInternalType)) {
			case "boolean":
				return oValue;
			case "string":
				if (oValue.toLowerCase() == "true" || oValue == "X") {
					return true;
				}
				if (oValue.toLowerCase() == "false" || oValue == "" || oValue == " ") {
					return false;
				}
				oBundle = sap.ui.getCore().getLibraryResourceBundle();
				// throw new ParseException(oBundle.getText("Boolean.Invalid"));
			case "int": // TODO return 1 for true?!
			case "float":
			default:
				// throw new ParseException("Don't know how to parse Boolean from " + sInternalType);
		}
	};

	// CustomBoolean.prototype.validateValue = function(sValue) {

	// };



	return CustomBoolean;

});