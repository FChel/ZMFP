sap.ui.define([
	"fss/ssp/controller/ContractPoTable.controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"fss/ssp/model/util",
	"fss/ssp/model/formatter",
	"sap/m/MessageBox",
	"fss/ssp/model/Constants"
	
], function(ContractPoTable, Filter, FilterOperator,JSONModel, util, formatter, MessageBox, Constants) {
	"use strict";

	/**
	 * This controller manages the functionalities for PO table within PO tab in worklist’s contract table.
	 */
	return ContractPoTable.extend("fss.ssp.controller.ContractPoTableWorklist", {
		formatter : formatter,
		
		/**
		 * Event handler for Before Rendering. It sets the owner component if it doesn't exist. 
		 * It makes sure the list is refreshed.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onBeforeRendering: function(oEvent){
			//component is not inherited for nested view in tables. Need to inject it manually
			if(!this.getOwnerComponent()){
				var oParent = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView", 12);
				if(oParent){
					this.getView()._sOwnerId = oParent._sOwnerId;
				}
			}
			
			var oTable = this.byId("contractPoTable");
			if(oTable.getBinding("items")){
				oTable.getBinding("items").refresh();
			}
			else{
				oTable.bindItems({path: "PurchaseOrders", template: this.ContractPoColumnLi, 
						templateShareable: false,
						parameters:{operationMode: "Server"},
						sorter: [new sap.ui.model.Sorter({
							path: "PONumber",
							descending: true
						})]});
			}
		},
		
		
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");

			// only update the counter if the length is final and the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("poTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("poTitle");
			}
			// this.getModel("poViewModel").setProperty("/poTableTitle", sTitle);
			this.byId("poTitle").setText(sTitle);
			
			// var aItems = oTable.getItems();
			// for(var i in aItems){
			// 	if(!aItems[0].getBindingContext("PoTabModel") || aItems[0].getBindingContext("PoTabModel").getObject().Currency !== aItems[i].getBindingContext("PoTabModel").getObject().Currency){
			// 		this.getModel("poViewModel").setProperty("/Currency", "xxx");
			// 		break;
			// 	}
			// 	else{
			// 		this.getModel("poViewModel").setProperty("/Currency", aItems[0].getBindingContext("PoTabModel").getObject().Currency);
			// 	}
			// }
			// this.getModel("viewModel").setProperty("/poTableTitle", sTitle);
			// this.byId("poTitle").setText(sTitle);
		},
		
		// onCopyPo: function(oEvent){
		// 	oEvent.preventDefault();
		// 	oEvent.cancelBubble();
		// 	this.getRouter().navTo("copyPODoc", {
		// 		docId: oEvent.getSource().getBindingContext().getProperty("PONumber")
		// 	});
		// }
	});

});