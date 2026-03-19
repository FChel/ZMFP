sap.ui.define(
	["sap/m/ComboBox"],
	function(ComboBox) {

		return ComboBox.extend("fss.ssp.controls.ComboBox", {
			init: function(){
				ComboBox.prototype.init.apply(this, arguments);
				this.setPlaceholder("Select");
			},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				ComboBox.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getSelectedKey()){
					// var ctxPath = this._getBindingContext() ? this._getBindingContext().getPath() : "";
					// ctxPath = ctxPath + (ctxPath[ctxPath.length - 1] === "/" ? "" : "/");
					// this.getModel().setProperty(ctxPath + this.getBinding("selectedKey").getPath(), undefined);
					this.setSelectedKey(undefined);
					this.fireChange({value: undefined});
				}
			},
			
			renderer: {}
		});
	}
);