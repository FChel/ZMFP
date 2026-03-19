sap.ui.define(
	["sap/m/DatePicker"],
	function(DatePicker) {

		return DatePicker.extend("fss.ssp.controls.DatePicker", {
			
			renderer: {},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				DatePicker.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getValue()){
					this.setValue("");
					this.fireChange();
				}
			}
		});
	}
);