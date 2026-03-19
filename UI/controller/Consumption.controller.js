/**
 * This controller manages the Consumption's view and its related event handlers.
 */
sap.ui.define([
	"fss/ssp/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"fss/ssp/model/util",
	"fss/ssp/model/formatter",
	"fss/ssp/model/Constants"
	
], function(BaseController, Filter, FilterOperator,JSONModel, util, formatter, Constants) {
	"use strict";

	/**
	 * This controller manages Consumption view and its event handlers.
	 */
	return BaseController.extend("fss.ssp.controller.Consumption", {
		formatter : formatter,
		constants: Constants,
		
		/**
		 * Event handler when expand button gets pressed. It sets the EXPAND value to true and sets the filter for the Consumption table to only show 
		 * consumptions for the selected LI. 
		 * @param {sap.ui.base.Event} oEvent the button press event		  
		 * @public
		 */
		onLiExpand: function(oEvent){
			var oSrc = oEvent.getSource();
			var oCtx = oSrc.getBindingContext("ConsumptionModel");
			var sPath = oCtx.getPath();
			var obj = oCtx.getObject();
			
			if(!obj.expand){
				//get immediate parent ColumnListItem, get immediate child Table, set filter
				var oColListItem = util.getImmediateParentByType(oEvent.getSource(), "sap.m.ColumnListItem");
				if(!oColListItem){
					return;
				}
				var oConTable = util.getImmediateChildByType(oColListItem, "sap.m.Table");
				if(!oConTable){
					return;
				}
				
				oConTable.getBinding("items").filter([new Filter("POLineNumber", FilterOperator.EQ, obj.LineNumber)]);
			}
			
			oSrc.getModel("ConsumptionModel").setProperty(sPath + "/expand", !obj.expand);
		},
		
		/**
		 * Event handler when Add GR button gets pressed. It opens a new tab and navigates to GR app in context of current PO. 
		 * @param {sap.ui.base.Event} oEvent the button press event	
		 * @public
		 */
		onAddGr: function(oEvent){
			var sPoNumber;
			var viewModel = this.getModel("viewModel");
			if(viewModel && viewModel.getProperty("/isContract") === true){
				sPoNumber = oEvent.getSource().getBindingContext().getObject().PurchaseOrder;                         
			}
			else if(viewModel && viewModel.getProperty("/isPO") === true){
				sPoNumber = oEvent.getSource().getBindingContext().getObject().PONumber;
			}
			else{
				return;
			}
			var sUrl;
            var bFLP = this.getOwnerComponent().getModel("componentModel").getProperty("/inFLP");			
			if (bFLP === true) {
				this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
					var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
					sUrl = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
							target: {
								semanticObject: "ZMYFI_REC",
								action: "PO"
							},
							appSpecificRoute: this.getResourceBundle().getText("gr.flp.create.deepLink", [sPoNumber])
						})) || "";
					sap.m.URLHelper.redirect( sUrl, true);
					
				}.bind(this));				
			}else{
				sUrl = this.getResourceBundle().getText("gr.app.create.url", [sPoNumber]);
			    sap.m.URLHelper.redirect(sUrl, true);
		    }
		},
		
		/**
		 * Event handler when Document link gets pressed. It opens a new tab and navigates to GR app in context of selected document. 
		 * @param {sap.ui.base.Event} oEvent the button press event		  
		 * @param {Object} initObj the initial object for Copy scenario
		 * @public
		 */
		onGrDocPress: function(oEvent){
			var grObj = oEvent.getSource().getBindingContext("ConsumptionModel").getObject();
			var sUrl;
            var bFLP = this.getOwnerComponent().getModel("componentModel").getProperty("/inFLP");			
			if (bFLP === true) {
				this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
					var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
					sUrl = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
							target: {
								semanticObject: "ZMYFI_REC",
								action: "GR"
							},
							appSpecificRoute: this.getResourceBundle().getText("gr.flp.display.deepLink", [grObj.DocNumber, grObj.Year])
						})) || "";
					sap.m.URLHelper.redirect( sUrl, true);
					
				}.bind(this));				
			}else{
				sUrl = this.getResourceBundle().getText("gr.app.display.url", [grObj.DocNumber, grObj.Year]);
			sap.m.URLHelper.redirect(sUrl, true);
		    }
		}
		
		/**
		 * Event handler for data change event of LI select control for GR table. It sets the control in use 
		 * and then calls the egenric handler
		 * @param {sap.ui.base.Event} oEvent data changed event
		 * @public
		 */
		// onLiDataChangeGr: function(oEvent){
		// 	var oSelect;
		// 	var viewModel = this.getModel("viewModel");
		// 	if(viewModel && viewModel.getProperty("/isContract") === true){
		// 		oSelect = this.byId("grLiContractSelect");
		// 	}
		// 	else if(viewModel && viewModel.getProperty("/isPO") === true){
		// 		oSelect = this.byId("grLiPoSelect");
		// 	}
		// 	else{
		// 		return;
		// 	}
			
		// 	if(oSelect){
		// 		this.selectLiDataChange(oSelect);
		// 	}
		// },
		
		/**
		 * Event handler for data change event of LI select control for IR table. It sets the control in use 
		 * and then calls the egenric handler
		 * @param {sap.ui.base.Event} oEvent data changed event
		 * @public
		 */
		// onLiDataChangeIr: function(oEvent){
		// 	var oSelect;
		// 	var viewModel = this.getModel("viewModel");
		// 	if(viewModel && viewModel.getProperty("/isContract") === true){
		// 		oSelect = this.byId("irLiContractSelect");
		// 	}
		// 	else if(viewModel && viewModel.getProperty("/isPO") === true){
		// 		oSelect = this.byId("irLiPoSelect");
		// 	}
		// 	else{
		// 		return;
		// 	}
			
		// 	if(oSelect){
		// 		this.selectLiDataChange(oSelect);
		// 	}
		// },
		
		/**
		 * Event handler when a line item dropdown is changed. It finds out the associated table and updates the 
		 * table with associated consumptions
		 * @param {sap.ui.base.Event} oEvent change event
		 * @public
		 */
		// onConsumptionLiChange: function(oEvent){
		// 	if(!oEvent.getSource().getVisible()){
		// 		return;
		// 	}
		// 	var selectedItem = oEvent.getParameter("selectedItem");
		// 	if(!selectedItem){
		// 		return;
		// 	}
		// 	var itemLineNumber = selectedItem.getBindingContext().getObject().LineNumber;
		// 	if(!itemLineNumber){
		// 		return;
		// 	}
			
		// 	var oFilter = new Filter("POLineNumber", FilterOperator.EQ, itemLineNumber );
			
		// 	var oTable = util.getImmediateParentByType(oEvent.getSource(), "sap.m.Table");
		// 	if(oTable){
		// 		oTable.getBinding("items").filter(oFilter, "Application");
		// 	}
			
			
		// }
		
		

	});

});