sap.ui.define([
	"fss/ssp/controller/CreatePhasing.controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"fss/ssp/model/util",
	"sap/ui/model/json/JSONModel",
	"fss/ssp/model/formatter"
	
], function(CreatePhasing, Filter, FilterOperator, MessageBox, util, JSONModel, formatter) {
	"use strict";

	/**
	 * o	This controller manages create/edit functionality for Phasings. It extends most of its functionality from CreatePhasing controller.
	 */
	return CreatePhasing.extend("fss.ssp.controller.CreatePoPhasing", {
		formatter: formatter,
		
		
		/**
		 * Sets the default values for this controller. This will enable the extension of the controller 
		 */
		setDefaultValues: function(){
			this.parentEntitySet = "PurchaseOrderLIs";
		}

	});

});