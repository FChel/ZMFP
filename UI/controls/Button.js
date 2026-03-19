sap.ui.define(
	["sap/m/Button"],
	function(Button) {

		return Button.extend("fss.ssp.controls.Button", {
			
			renderer: {},
			//Extending control's setEnabled function so that it automatically wipes the data when control is disabled.
			firePress: function(){
				if(!this.getEnabled()){
					return;
				}
				this.setEnabled(false);
				Button.prototype.firePress.apply(this, arguments);
				setTimeout(function(){ this.setEnabled(true); }.bind(this), 300);
				
			}
		});
	}
);