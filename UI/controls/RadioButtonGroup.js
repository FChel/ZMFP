sap.ui.define(
	["sap/m/RadioButtonGroup"],
	function(RadioButtonGroup) {

		return RadioButtonGroup.extend("fss.ssp.controls.RadioButtonGroup", {
			//Extending control's metadata so that there is a 'required' property.
			metadata: {
				properties: {
					required: {
						type: "boolean",
						defaultValue: false
					}
				}
			},
			
			renderer: {},
			
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				if(enabled === this.getEnabled()){
					return;
				}
				
				RadioButtonGroup.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getSelectedIndex() >= 0){
					this.setSelectedIndex(-1);
				}
			}
		});
	}
);