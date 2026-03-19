sap.ui.define([
	"fss/ssp/controller/CreateAssignment.controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"fss/ssp/model/util",
	"sap/ui/model/json/JSONModel",
	"fss/ssp/model/formatter",
	"fss/ssp/model/Constants"
], function(CreateAssignment, Filter, FilterOperator, MessageBox, util, JSONModel, formatter, Constants) {
	"use strict";

	/**
	 * This controller manages create/edit functionality for Assignments. It performs the required validations.
	 */
	return CreateAssignment.extend("fss.ssp.controller.CreatePoAssignment", {
		formatter: formatter,
		constants: Constants,
		
		/**
		 * Sets the default values for this controller. This will enable the extension of the controller 
		 */
		setDefaultValues: function(){
			this.parentEntitySet = "PurchaseOrderLIs";
		}
		
	});

});