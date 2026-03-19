sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType, ValidateException) {
    "use strict";

    var YesNoRadio = SimpleType.extend("fss.ssp.CustomTypes.YesNoRadio", {
        constructor: function () {
            SimpleType.apply(this, arguments);
            this.sName = "YesNoRadio";
            if(!jQuery.isEmptyObject(this.oConstraints) ){
				this.RADIO = {
					"null": -1,
					"-1": null,
					"": -1
				};

				var i = 0;
	            
				while(this.oConstraints["value" + i] || this.oConstraints["value" + i] === ""){
					this.RADIO[this.oConstraints["value" + i]] = i;
					this.RADIO[i] = this.oConstraints["value" + i];
					i++;
				}
            }
            else{
				this.RADIO = {
					"null": -1,
					"true": 0,
					"false": 1,
					"-1": null,
					"0": true,
					"1": false
			    };
            }
        }
    });

    YesNoRadio.prototype.formatValue = function (oValue) {
        var selectedIndex = this.RADIO[oValue];
        if (selectedIndex === undefined) {
            selectedIndex = -1;
        }
        return selectedIndex;
    };

    YesNoRadio.prototype.parseValue = function (oValue) {
        return this.RADIO[oValue];
    };

    YesNoRadio.prototype.validateValue = function (oValue) {
        // if ( (!oValue && oValue !== 0) || oValue < 0 ) {
        //     throw new ValidateException("An answer is required.", ["required"]);
        // }
    };

    return YesNoRadio;
});