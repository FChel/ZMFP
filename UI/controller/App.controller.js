//This controller controls the top level App control. 
sap.ui.define([
		"fss/ssp/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (BaseController, JSONModel) {
		"use strict";
		/**
		 * This controller manages the container for the UI5 application
		 */
		return BaseController.extend("fss.ssp.controller.App", {
			
			onInit : function () {
				var oViewModel,
					fnSetAppNotBusy,
					iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

				oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});
				this.setModel(oViewModel, "appView");

				fnSetAppNotBusy = function() {
					oViewModel.setProperty("/busy", false);
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				};

				// since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
				this.getOwnerComponent().getModel().metadataLoaded().
						then(fnSetAppNotBusy);
				

				// apply content density mode to root view
				this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			},
			
			onAfterRendering: function(){
				this.getOwnerComponent().metadataFailed().then(function() {				
					var sText = this.getResourceBundle().getText("noAuth.error");								
					sap.m.MessageBox.error(new sap.m.FormattedText("", { htmlText: sText }), {
						title: this.getResourceBundle().getText("noAuth.title"),
						initialFocus: null,
						onClose: function(sAction) {
							this.onHomePress();
						}.bind(this)
					});									
				}.bind(this));
			}

		});

	}
);