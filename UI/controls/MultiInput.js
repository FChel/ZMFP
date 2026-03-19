sap.ui.define(
	["sap/m/MultiInput"],
	function(MultiInput) {

		return MultiInput.extend("fss.ssp.controls.MultiInput", {
			//Extending control's _getValueHelpIcon so that we show a '+' icon
			_getValueHelpIcon: function(){
				var icon = MultiInput.prototype._getValueHelpIcon.apply(this, arguments);
				return icon.setSrc("sap-icon://add");
			},
			
			renderer: {},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			setEnabled: function(enabled){
				MultiInput.prototype.setEnabled.apply(this, arguments);
				if(enabled === false && this.getTokens() && this.getTokens().length > 0 ){
					var ctxPath = this._getBindingContext() ? this._getBindingContext().getPath() : "";
					this.getModel().setProperty(ctxPath + this.getBinding("tokens").getPath(), []);
				}
			}
		});
	}
);