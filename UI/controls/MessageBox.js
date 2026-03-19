sap.ui.define(
	["sap/m/MessageBox"],
	function(MessageBox) {

		return MessageBox.extend("fss.ssp.controls.MessageBox", {
			
			
			//Extending control's error function so it always shows Ok by default
			error: function(vMessage, mOptions){
				if(!mOptions){
					mOptions = { };
				}
				if(!mOptions.actions){
					mOptions.actions = [];
				}
				if(mOptions.actions.length === 0){
					mOptions.actions.push(sap.m.MessageBox.Action.OK);
				}
				MessageBox.prototype.error.apply(this, arguments);
				
			}
		});
	}
);