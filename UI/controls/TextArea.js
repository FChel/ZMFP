sap.ui.define(
	["sap/m/TextArea"],
	function(TextArea) {

		return TextArea.extend("fss.ssp.controls.TextArea", {
			
			renderer: {},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				TextArea.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getValue()){
					this.setValue("");
					this.fireChange();
				}
			}
		});
	}
);