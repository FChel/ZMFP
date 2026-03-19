sap.ui.define(
	["sap/m/UploadCollection"],
	function(UploadCollection) {

		return UploadCollection.extend("fss.ssp.controls.UploadCollection", {
			attachmentCount : 0,
			renderer: "sap.m.UploadCollectionRenderer",
			
			constructor: function(sId, mSettings) {
				UploadCollection.apply(this, arguments);
				
				//resolve the issue with size showing as KiB and MiB
				this._oFormatDecimal.bBinary = false;
			}, 
			
			_getFileUploader: function(){
				var oUploader = UploadCollection.prototype._getFileUploader.apply(this, arguments);
				oUploader.setStyle("Emphasized").setButtonText("Add Attachment").setIconOnly(false).setIconFirst(true);
				return oUploader;
			},
			
			//Standard control does not allow dynamically setting the URL if instant upload is not TRUE. This extended function gives us that feature.
			//The workaround is that we set 'instantUpload' to true, update the URL and then we set 'instantUpload' back to it's original value
			setUploadUrl: function(value){
				var bOriginalVal = this.getProperty("instantUpload");
				
				// disables the default check
				this.setProperty("instantUpload", true, true); 
				if (UploadCollection.prototype.setUploadUrl) {
					// ensure that the default setter is called. Doing so ensures that every extension or change will be executed as well.
					UploadCollection.prototype.setUploadUrl.apply(this, arguments); 
					// Because before we call the original function we override the instantUpload property for short time, to disable the check
				}
				this.setProperty("instantUpload", bOriginalVal, true); // Afterwords we set back the instantUpload property to be back in a save and consistent state
			},
			
			//As above comment, because we cannot dynamically set the url, we need to update it for each Uploader on Upload. This fix is not needed for drag and drop files
			upload: function(){
				for (var i = 0; i < this._aFileUploadersForPendingUpload.length; i++) {
					// if the FU comes from drag and drop (without files), ignore it
					if (this._aFileUploadersForPendingUpload[i].getValue()) {
						this._aFileUploadersForPendingUpload[i].setUploadUrl(this.getUploadUrl());
					}
				}
				
				UploadCollection.prototype.upload.apply(this, arguments);
				
			}
		});
	}
);