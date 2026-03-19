sap.ui.define(
	["sap/m/Select"],
	function(Select) {

		return Select.extend("fss.ssp.controls.Select", {
			//Extending control's metadata so that there is a 'required' property. 
			//Property 'ignoreDisableReset' is added so that we can ignore wiping data on disable
			metadata: {
				properties: {
					required: {
						type: "boolean",
						defaultValue: false
					},
					ignoreDisableReset: {
						type: "boolean",
						defaultValue: false
					}
				}
			},
			
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				if(enabled === this.getEnabled()){
					return;
				}
				Select.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getSelectedKey() && !this.getIgnoreDisableReset()){
					if(this.getBinding("selectedKey")){
						var ctxPath = this._getBindingContext() ? this._getBindingContext().getPath() : "";
						this.getModel().setProperty(ctxPath + this.getBinding("selectedKey").getPath(), undefined);
					}
				}
			},
			
			renderer: {}
		});
	}
);