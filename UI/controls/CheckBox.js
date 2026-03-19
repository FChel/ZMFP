sap.ui.define(
	["sap/m/CheckBox"],
	function(CheckBox) {

		return CheckBox.extend("fss.ssp.controls.CheckBox", {
			
			renderer: {},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				CheckBox.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getSelected()){
					this.setSelected(undefined);
					this.fireSelect();
				}
			}
		});
	}
);