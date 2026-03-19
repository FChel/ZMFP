sap.ui.define(
	["sap/m/Input"],
	function(Input) {

		return Input.extend("fss.ssp.controls.Input", {
			metadata: {
				properties: {
					ignoreDisableChangeFire: {
						type: "boolean",
						defaultValue: false
					}
				}
			},
			renderer: {},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				Input.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getValue()){
					this.setValue("");
					if(!this.getIgnoreDisableChangeFire()){
						this.fireChange();
					}
				}
			}
		});
	}
);