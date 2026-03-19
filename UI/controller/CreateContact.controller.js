/**
 * This controller manages the CreateContact's view and its related event handlers.
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
   * This controller manages CreateContact view and its event handlers.
   */
  return BaseController.extend("fss.ssp.controller.CreateContact", {
    formatter : formatter,
    constants: Constants,

    onInit: function(){
      this.oAddressBox = this.byId("addressBox");
    },

    onLiDataChangeAddress: function(oEvent){
      var oSelect;
      var sPath = util.getContextPath(this.getView());
      var viewModel = this.getModel("viewModel");
      if(viewModel && viewModel.getProperty("/isContract") === true || this.getModel().getProperty(sPath + "IsSinglePO") === true){
        oSelect = this.byId("addressLiContractSelect");
      }
      else if(viewModel && viewModel.getProperty("/isPO") === true && this.getModel().getProperty(sPath + "IsSinglePO") !== true){
        oSelect = this.byId("addressLiPoSelect");
      }
      else{
        return;
      }

      if(oSelect){
        this.selectLiDataChange(oSelect);
        var oItems = oSelect.getItems();
        oSelect.setEnabled(oItems.length > 0 && !this.getModel().getProperty("/IsSameAddressForAll"));
        this.byId("addressSameCheck").setEnabled(oItems.length > 0 && this.getModel("viewModel").getProperty("/displayMode") !== true);
        // this.byId("addressTypeBtn").setEnabled(oItems.length > 0 && this.getModel("viewModel").getProperty("/displayMode") !== true);
      }
    },

    onAddressLiChange: function(oEvent){
      if(!oEvent.getSource().getVisible()){
        return;
      }
      var selectedItem = oEvent.getParameter("selectedItem");
      if(!selectedItem){
        this.oAddressBox.unbindElement();
        return;
      }
      var itemLineNumber = selectedItem.getBindingContext().getObject().LineNumber;
      if(!itemLineNumber){
        return;
      }
      var sAddressesPath = util.getContextPath(oEvent.getSource()) + "DeliveryAddresses";
      var aAddresses = this.getModel().getProperty(sAddressesPath);
      var obj;
      for(var i in aAddresses){
        if(aAddresses[i].LineNumber && aAddresses[i].LineNumber === itemLineNumber){
          obj = $.extend({}, aAddresses[i]);
          this.oAddressBox.bindElement(sAddressesPath + "/" + i);

          if(obj.DeliveryType === "RomanCode" && (!obj.NewAddressName && !obj.InvoiceContactEmail)){
            var vhControls = this.getView().getControlsByFieldGroupId(["RomanCode"]);
            for (var j in vhControls) {
              if (vhControls[j] && vhControls[j].getFieldGroupIds().indexOf("RomanCode") >= 0 && vhControls[j].getValue &&
                vhControls[j].getValue()) {
                vhControls[j].fireChange({
                  newValue: vhControls[j].getValue(),
                  initialLoad: true
                });
              }
            }
          }

          this.getModel().setProperty(sAddressesPath + "/" + i + "/DeliveryType", obj.DeliveryType);
          this.getModel().setProperty(sAddressesPath + "/" + i + "/NewAddressCountry", obj.NewAddressCountry);
          delete obj.DeliveryType;
          delete obj.NewAddressCountry;
          delete obj.__metadata;
          delete obj.LineNumber;
          delete obj.ParentNumber;
          for(var j in obj){
            this.getModel().setProperty(sAddressesPath + "/" + i + "/" + j, "");
            this.getModel().setProperty(sAddressesPath + "/" + i + "/" + j, obj[j]);
          }


          // this.oAddressBox.bindElement(sAddressesPath + "/" + i);
          // var vhControls = this.getView().getControlsByFieldGroupId(["CreateContactVH"]);
          // for (var j in vhControls) {
          //  if (vhControls[j] && vhControls[j].getFieldGroupIds().indexOf("CreateContactVH") >= 0 && vhControls[j].getValue &&
          //    vhControls[j].getValue()) {
          //    vhControls[j].fireChange({
          //      newValue: vhControls[j].getValue(),
          //      initialLoad: true
          //    });
          //  }
          // }
          // for(var j in aAddresses){
          //  if(!aAddresses[j]){
          //    delete aAddresses[j];
          //  }
          // }
          return;
        }
      }
    },

    onSameAddressCheckPress:function(oEvent){
      // var oSelect;
      // var viewModel = this.getModel("viewModel");
      // if(viewModel && viewModel.getProperty("/isContract") === true){
      //  oSelect = this.byId("addressLiContractSelect");
      // }
      // else if(viewModel && viewModel.getProperty("/isPO") === true){
      //  oSelect = this.byId("addressLiPoSelect");
      // }
      // else{
      //  return;
      // }
      // oSelect.setEnabled(!oEvent.getParameter("selected"));
      this.applySameAddress();
    },

    applySameAddress: function(oData){
      var oDataTemp = oData ? oData : this.getModel().getProperty(util.getContextPath(this.getView()));
      if(!oDataTemp.IsSameAddressForAll){
        return;
      }
      var oAddress = this.oAddressBox.getBindingContext().getObject();
      if(!oAddress){
        return;
      }

      var aCopyFields = ["DeliveryType", "NewAddressName", "NewAddressStreet",
                "NewAddressCity", "NewAddressPostcode", "NewAddressCountry", "NewAddressRegion",
                "PickupLocation", "RomanAddressCode", "InvoiceContactEmail"];

      if(oDataTemp.DeliveryAddresses.length <= 1){
        return;
      }

      for(var i in oDataTemp.DeliveryAddresses){
        for(var j in aCopyFields){
          oDataTemp.DeliveryAddresses[i][aCopyFields[j]] = oAddress[aCopyFields[j]];
        }
      }

      if(!oData){
        this.getModel().updateBindings();
      }
    },

    validateAllEntries: function(aErrors){
      var sPath = util.getContextPath(this.getView());
      if(this.getModel().getProperty(sPath + "IsSameAddressForAll")){
        return;
      }

      if(!this.oAddressBoxClone){
        this.oAddressBoxClone = this.oAddressBox.clone();
        this.oAddressBoxClone.requiredControls = [];
        this.oAddressBoxClone.setModel(this.oAddressBox.getModel());
        this.oAddressBoxClone.setModel(this.oAddressBox.getModel("viewModel"), "viewModel");
      }
      var sAddressesPath = sPath + "DeliveryAddresses";
      var oDeliveryAddresses = this.getModel().getProperty(sPath + "DeliveryAddresses");

      var currObj = this.oAddressBox.getBindingContext().getObject();
      var currLine = currObj.LineNumber;
      var obj;
      for(var i in oDeliveryAddresses){
        //the current line will be checed by the generic validate function
        if(oDeliveryAddresses[i].LineNumber !== currLine){
          obj = $.extend({}, oDeliveryAddresses[i]);
          this.oAddressBoxClone.bindElement(sAddressesPath + "/" + i);
          this.getModel().setProperty(sAddressesPath + "/" + i + "/DeliveryType", obj.DeliveryType);
          this.getModel().setProperty(sAddressesPath + "/" + i + "/NewAddressCountry", obj.NewAddressCountry);
          delete obj.DeliveryType;
          delete obj.NewAddressCountry;
          delete obj.__metadata;
          delete obj.LineNumber;
          delete obj.ParentNumber;
          for(var j in obj){
            this.getModel().setProperty(sAddressesPath + "/" + i + "/" + j, "");
            this.getModel().setProperty(sAddressesPath + "/" + i + "/" + j, obj[j]);
          }
          // this.oAddressBoxClone.bindElement(sAddressesPath + "/" + i);
          // this.oAddressBoxClone.bindElement(sAddressesPath + "/" + i);
          this.oAddressBoxClone.requiredControls = [];
          util.getRequiredControls(this.oAddressBoxClone.getItems(), this.oAddressBoxClone.requiredControls);
          if(!util.checkRequiredControls(this.oAddressBoxClone.requiredControls, [], this.oAddressBoxClone)){
            aErrors.push({message: this.getResourceBundle().getText("validation.error.addressMissingMandatory",
                      [formatter.lineNumberFormatter(oDeliveryAddresses[i].LineNumber)]),
                  type: sap.ui.core.MessageType.Error });
          }
        }
      }


    }

  });

});