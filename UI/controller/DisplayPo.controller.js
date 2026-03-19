/*global location */
sap.ui.define([
  "fss/ssp/controller/DisplayContract.controller",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/formatter",
  "fss/ssp/model/util",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "fss/ssp/model/Constants"
], function(DisplayContract, JSONModel, formatter, util, ResourceModel, MessageBox, Constants) {
  "use strict";

  /**
   * Manages the Display of a contract and the event handlers related to it.
   */
  return DisplayContract.extend("fss.ssp.controller.DisplayPo", {

    formatter: formatter,


    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      var contractModel = new JSONModel({});
      contractModel.setSizeLimit(5000);
      this.setModel(contractModel, "ContractModel");
      this.mainEntitySet = "PurchaseOrders";
      this.mainLiEntitySet = "PurchaseOrderLIs";
      this.mainEntityKey = "PONumber";
    },


    /**
     * Event handler when Edit button gets pressed. Depending on document type, it navigates to corresponding route.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditPress: function(oEvent) {
      var obj = this.getView().getBindingContext().getObject();

      //this should never happen as we only enable the button after binding is completed.
      if (!obj) {
        return;
      }

      var editPromise = jQuery.Deferred();

      if([Constants.STATUS_AWAITING_PRF, Constants.STATUS_AWAITING_APPROVAL, Constants.STATUS_AWAITING_ASSET].indexOf(obj.Status) >= 0 && !obj.IsLegacy){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.recall.warning"),
          {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            styleClass: "sapUiSizeCompact",
            onClose: function(sAction) {
              if(sAction === MessageBox.Action.OK){
                editPromise.resolve();
              }
              else{
                editPromise.reject();
              }
            }.bind(this)
          }
        );
      }else{
        editPromise.resolve();
      }

      editPromise.then(function(){
        var sRouteName = "editPODoc";
        // if (obj.IsDraft) {
        //  sRouteName = "editPODraft";
        // } else {
        //  sRouteName = "editPODoc";
        // }

        this.getRouter().navTo(sRouteName, {
          docId: obj.PONumber
        });
      }.bind(this),
      function(){
        editPromise = null;
      });

    },

    /**
     * Binds the view to the object path and expands the aggregated line items. It sets initial values and binds VH values
     * @param {sap.ui.base.Event} oEvent pattern match event
     * @private
     */
    _onRouteMatched: function(oEvent) {
      var sRouteName = oEvent.getParameters().name;
      var aValidRoutes = ["displayPo"];

      if(aValidRoutes.indexOf(sRouteName) >= 0){
        var viewData = {
          busy: false,
          delay: 0,
          displayMode: true,
          enableEdit: true,
          isPO: true,
          title: "",
          vhDisplay: {}
        };
        this.getModel("viewModel").setData(viewData);
        var poNum = oEvent.getParameter("arguments").docId;
        this.getModel().setData({});
        this.getModel("ContractModel").setData({});
        this._bindViewPo(poNum).then(function(oData) {
          if (oData) {
            if(oData.IsSinglePO){
              this.getRouter().navTo("displayContract", {
                docId: oData.ContractNumber
              }, true);
            }
            // var docType = (oData.IsContractOnly) ? "title.createContract" : "title.createSingle";
            var docSaveType = "";//(oData.IsDraft) ? this.getResourceBundle().getText("title.draft") : "";
            var title = this.getResourceBundle().getText("displayPoTitle", [docSaveType]);
            this.getModel("viewModel").setProperty("/title", title);
            this.setFLPTitle(title);

          }

        }.bind(this));
      }
    }
  });

});