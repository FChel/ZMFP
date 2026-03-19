sap.ui.define(
	["sap/m/Dialog",
	"sap/m/DialogType"],
	function(Dialog, DialogType) {

		return Dialog.extend("fss.ssp.controls.Dialog", {
			
			renderer: "sap.m.DialogRenderer",
			
			/*
			This extenstion ensures dialogs of type === Message will show a white background and 
			other types use Dark(SapContrast) backgroung
			*/
			_getToolbar: function(enabled){
				if (!this._oToolbar) {
					Dialog.prototype._getToolbar.apply(this, arguments);
					
					this._oToolbar.addDelegate({
						onAfterRendering: function () {
							if (this.getType() === DialogType.Message) {
								this.$("footer").removeClass("sapContrast sapContrastPlus");
							}
						}
					}, false, this);
				}
	
				return this._oToolbar;
			}
		});
	}
);