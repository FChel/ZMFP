sap.ui.define([
	"fss/ssp/controller/ContractContent.controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"fss/ssp/model/formatter",
	"sap/m/MessageBox",
	"fss/ssp/model/util",
	"sap/m/Dialog"
], function(ContractContent, JSONModel, Filter, FilterOperator, formatter, MessageBox, util, Dialog) {
	"use strict";
	
	/**
	 * This is the controller for the content within “CreatePO” view. It has been separated 
	 * to its own view so that it can be embedded in Approval app without the need to reimplement 
	 * the functionality. It extends most of its functionality from DisplayContract controller.
	 */
	return ContractContent.extend("fss.ssp.controller.PoContent", {
		formatter: formatter,
		
		/**
		 * Event handler when Contract link gets pressed. It navigates to that contract in a new tab.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onContractPress: function(oEvent) {
			var sUrl;
			var sDocId = oEvent.getSource().getBindingContext().getProperty("ContractNumber");
			var bFLP = this.getOwnerComponent().getModel("componentModel").getProperty("/inFLP");
			if (bFLP === true) {
				this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
					sUrl = sap.ushell.Container.getService("CrossApplicationNavigation").hrefForAppSpecificHash(this.getRouter().getRoute("displayContract").getURL(
                                                                            {docId: sDocId}));

					sap.m.URLHelper.redirect( sUrl, true);
				}.bind(this));
			}
			else{
				sUrl = this.getRouter().getRoute("displayContract").getURL(
						{docId: sDocId});
				sap.m.URLHelper.redirect("#/" + sUrl, true);
			}
			
		},
		
		
		/**
		 * Event handler when Currency is changed. It overrides the ContractContent's event handler to o only a basic check.
		 * @param {sap.ui.base.Event} oEvent the combobox change event
		 * @public
		 */
		onCurrencyChange: function(oEvent){
			this.validateComboBoxChange(oEvent);
		},
		
		
		determineSON:function(){
			var sonInput = this.byId("sonInput");
			
			var sonNumber;
			var sPath = util.getContextPath(this.getView());
			if(this.getModel().getProperty(sPath + "IsLegacy")){
				sonNumber = this.getModel().getProperty(sPath + "SON");
			}
			else{
				sonNumber =  this.getModel("ContractModel").getProperty("/SON");
				this.getModel().setProperty(sPath + "SON", sonNumber);
			}
			
			if(!sonNumber){
				return;
			}
			
			var aFilters = [];
			aFilters.push(new Filter("Key", FilterOperator.EQ, sonNumber));
			
			sonInput.setBusy(true);
			this.getModel("viewModel").setProperty("/SONDescription", "");
			this.getModel("searchHelpModel").read("/SONs", {
				filters: aFilters,
				method: "GET",
				success: function(oData){
					sonInput.setBusy(false);
					if(oData.results.length > 0){
						this.getModel("viewModel").setProperty("/SONDescription", oData.results[0].Description);
					}
					
				}.bind(this),
				error: function(oError) {
					sonInput.setBusy(false);
				}.bind(this)
			});
			
		}
		
	});

});