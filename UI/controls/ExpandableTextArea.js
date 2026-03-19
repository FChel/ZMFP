sap.ui.require("fss/ssp/model/formatter");
sap.ui.define([
	"fss/ssp/controls/TextArea",
	"sap/ui/core/IconPool",
	"sap/ui/model/json/JSONModel",
	"fss/ssp/model/formatter",
	"fss/ssp/model/util"
	
], function(TextArea, IconPool, JSONModel, formatter, util) {
	"use strict";

	return TextArea.extend("fss.ssp.controls.ExpandableTextArea", {
		formatter: formatter,
		metadata: {
			events: {
				endButtonPress: {}
			}
		},

		init: function(){
			TextArea.prototype.init.apply(this, arguments);
			this.__icon = this.addEndIcon({
				id: this.getId() + "-expandBtn",
				src: IconPool.getIconURI("inspect"),
				noTabStop: true,
				tooltip: "Information",
				press: [this.onEndButtonPress, this]
			}); // See sap.ui.core.Icon/properties for more settings
			// icon.addStyleClass(...); if even more customization required..
			
			this.setValueLiveUpdate(true);
		},

		onBeforeRendering: function() {
			TextArea.prototype.onBeforeRendering.apply(this, arguments);
			
			// var endIcons = this.getAggregation("_endIcon");
			// var isVisible = this.getEnabled() ? true : false;
			// if (Array.isArray(endIcons)) {
			// 	endIcons.map(icon => icon.setProperty("visible", isVisible, true));
			// }
		},

		onEndButtonPress: function(oEvent) {
			if (!this.getEnabled() ) {
				return;
			}
			
			if(!this.expandDialog){
				this.expandDialog = sap.ui.xmlfragment("fss.ssp.view.fragments.textAreaExpandDialog", this);
				this.addDependent(this.expandDialog);
				this.expandDialog.setModel(new JSONModel());
			}
			
			var data = {};
			var oResourceBundle = this.getModel("i18n").getResourceBundle();
			
			var sValueField = this.getBinding("value").getPath();
			var labelPath = this.getBinding("value").getPath().split("/")[this.getBinding("value").getPath().split("/").length-1];
			data.headerText = oResourceBundle.getText(labelPath);
			var sCtxPath = util.getContextPath(this);
			data.text = this.getModel().getProperty(sCtxPath + sValueField);
			data.placeholder = this.getPlaceholder();
			data.displayMode = this.getModel("viewModel").getProperty("/displayMode");    
			data.maxLength = this.getMaxLength();
			this.expandDialog.getModel().setProperty("/", data);
			try{
				this.expandDialog.open();
			}catch(exception){
					this.expandDialog.openBy(this);
			}
		},

		onExpandConfirm: function(oEvent){
			var updatedValue = this.expandDialog.getModel().getProperty("/text");
			var sCtxPath = util.getContextPath(this);
			var sValueField = this.getBinding("value").getPath();
			
			this.getModel().setProperty(sCtxPath + sValueField, updatedValue);
			
			this.expandDialog.close();
		},
		
		onExpandCancel: function(oEvent){
			this.expandDialog.close();
		},

		onsapshow: function(event) { // F4 pressed
			if (!this.getEnabled()) {
				return;
			}
			this.onEndButtonPress({});
			event.preventDefault();
			event.stopPropagation();
		},

		renderer: "sap.m.TextAreaRenderer",
	});
});