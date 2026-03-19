/*global location */
sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/formatter",
  "fss/ssp/model/util",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "fss/ssp/model/Constants"
], function(BaseController, JSONModel, formatter, util, ResourceModel, MessageBox, Constants) {
  "use strict";

  /**
   * Manages the Display of a contract and the event handlers related to it.
   */
  return BaseController.extend("fss.ssp.controller.DisplayContract", {

    formatter: formatter,

    /* =========================================================== */
    /* lifecycle methods                                           */
    /* =========================================================== */

    onInit: function() {
      this.busyDialog = this.getById(this.createId("displayBusyDlg"));
      if(!this.busyDialog){
        this.busyDialog = new sap.m.BusyDialog(this.createId("displayBusyDlg"));
      }
      this.setModel(new JSONModel({}), "viewModel");
      this.oIconTabBar = this.byId("CreateView").byId("iconTabBar");

      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();

      var jsonModel = new JSONModel({});
      jsonModel.setSizeLimit(5000);
      this.setModel(jsonModel);
      this.setModel(this.mainModel, "mainModel");

      // this.getRouter().getRoute("displayContract").attachPatternMatched(this._onRouteMatched, this);
      // this.getRouter().getRoute("displayPoStandalone").attachPatternMatched(this._onRouteMatched, this);
      this.getRouter().attachRouteMatched(this._onRouteMatched, this);

      util.makeFormReadOnly(this.byId("CreateView").getContent());
      this.setDefaultValues();
    },



    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      this.mainEntitySet = "Contracts";
      this.mainLiEntitySet = "ContractLIs";
      this.mainEntityKey = "ContractNumber";
    },

    onUnassignDoc: function(oEvent){
      var sPath = util.getContextPath(this.getView());
      var data = $.extend(true, {}, this.getModel().getProperty(sPath));
      data.UserAction = Constants.USER_ACTION_UNASSIGN;
      var oResourceModel = this.getResourceBundle();
      this.busyDialog.setTitle(oResourceModel.getText("unassign.busy.title"));
      this.busyDialog.setText(oResourceModel.getText("unassign.busy.text"));
      this.busyDialog.open();
      util.removeMetadata(data);
      util._escapeDecimals(data);

      if(this.getModel("viewModel").getProperty("/isPO")){
        delete data.ContractLIs;
      }

      this.mainModel.create("/" + this.mainEntitySet, data, {
        success: function(oData, response) {
          var docNumber = oData[this.mainEntityKey];
          var message = oResourceModel.getText("unassign.success.msg", [docNumber]);
                this.busyDialog.close();
          MessageBox.success(message,{
            title: "Success",
            onClose: function() {
              this.getRouter().navTo("worklist", {}, true);
            }.bind(this)
          });

        }.bind(this),
        error: function(oError){
          this.busyDialog.close();
          var aErrors = util.processODataError(oError, this.getResourceBundle());
          MessageBox.error(this.getResourceBundle().getText("unassign.error", [data[this.mainEntityKey], aErrors[0].message]), {
            actions: [MessageBox.Action.OK],
            onClose: function() {
              this.getRouter().navTo("worklist", {}, true);
            }.bind(this)
          });
          }.bind(this),
          async: true
          });
    },

    onCloseDoc: function(oEvent){
      MessageBox.warning(
        this.getResourceBundle().getText("doc.close.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction !== MessageBox.Action.OK){
              return;
            }
            if(!this.liController){
              this.liController = this.getView().byId("CreateView").byId("CreateLIView").getController();
            }

            var sPath = util.getContextPath(this.getView());
            var aLines = this.getModel().getProperty(sPath + this.liController.liEntitySet);

            for(var i in aLines){
              if(aLines[i].IsCloseable){
                this.liController.closeLine(aLines[i]);
              }
              else{
                aLines[i].Status = Constants.STATUS_LI_DELETED;
              }
            }

            // this.getModel().updateBindings(true);
            var data = $.extend(true, {}, this.getModel().getProperty(sPath));
            data.UserAction = Constants.USER_ACTION_CLOSE_DOC;
            var oResourceModel = this.getResourceBundle();
            this.busyDialog.setTitle(oResourceModel.getText("closeDoc.busy.title"));
            this.busyDialog.setText(oResourceModel.getText("closeDoc.busy.text"));
            this.busyDialog.open();
            util.removeMetadata(data);
            util._escapeDecimals(data);

            if(this.getModel("viewModel").getProperty("/isPO")){
              delete data.ContractLIs;
            }

            this.mainModel.create("/" + this.mainEntitySet, data, {
              success: function(oData, response) {
                var docNumber = oData[this.mainEntityKey];
                var message = oResourceModel.getText("closeDoc.success.msg", [docNumber]);
                      this.busyDialog.close();
                MessageBox.success(message,{
                  title: "Success",
                  onClose: function() {
                    this.getRouter().navTo("worklist", {}, true);
                  }.bind(this)
                });

              }.bind(this),
              error: function(oError){
                this.busyDialog.close();
                var aErrors = util.processODataError(oError, this.getResourceBundle());
                MessageBox.error(this.getResourceBundle().getText("closeDoc.error", [data[this.mainEntityKey], aErrors[0].message]), {
                  actions: [MessageBox.Action.OK],
                  onClose: function() {
                    this.getRouter().navTo("worklist", {}, true);
                  }.bind(this)
                });
                }.bind(this),
                async: true
                });
          }.bind(this)
        }
      );



    },

    /**
     * Event handler when Send PDF button gets pressed. It sends a request to oData to perform the function.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSendPdf: function(oEvent) {
      var oViewModel = this.getModel("viewModel");
      oViewModel.setProperty("/busy", true);

      this.mainModel.callFunction("/MailPo", {
        method: "GET",
        urlParameters: {
          "DocNo": oEvent.getSource().getBindingContext().getProperty("PONumber") || oEvent.getSource().getBindingContext().getProperty("ContractNumber")
        },
        success: function(oData, response) {
          oViewModel.setProperty("/busy", false);
          sap.m.MessageBox.success(this.getResourceBundle().getText("sendPdf.success.msg"));
        }.bind(this),
        error: function(oError) {
          oViewModel.setProperty("/busy", false);

          var aErrors = util.processODataError(oError, this.getResourceBundle());

          MessageBox.error(this.getResourceBundle().getText("sendAsPdf.error.msg", [aErrors[0].message]),
                {actions: [MessageBox.Action.OK]});
        }.bind(this)
      });
    },

    /**
     * Event handler when Edit button gets pressed. Depending on document type, it navigates to corresponding route.
     * It shows a warning if status is awaiting approval
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

      if([Constants.STATUS_AWAITING_PRF, Constants.STATUS_AWAITING_APPROVAL, Constants.STATUS_AWAITING_ASSET].indexOf(obj.Status) >= 0&& !obj.IsLegacy){
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
        var sRouteName = "editDoc";
        // if (obj.IsDraft) {
        //  sRouteName = "editDraft";
        // } else {
        //  sRouteName = "editDoc";
        // }
        if(!obj.ContractNumber){
          this.getRouter().navTo("editPOStandalone", {
            docId: obj.PONumber
          });
        }
        else{
          this.getRouter().navTo(sRouteName, {
            docId: obj.ContractNumber
          });
        }
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
      var viewData = {
        busy: false,
        delay: 0,
        displayMode: true,
        enableEdit: true,
        isContract: true,
        isPO: false,
        title: "",
        vhDisplay: {}
      };
      this.setDefaultValues();
      this.getModel("viewModel").setData(viewData);

      this.getModel().setData({});
      var sRouteName = oEvent.getParameters().name;
      var aValidRoutes = ["displayContract", "displayPoStandalone"];

      if(aValidRoutes.indexOf(sRouteName) >= 0){
        var sDocId = oEvent.getParameter("arguments").docId;

        if(["displayContract"].indexOf(sRouteName) >= 0){
          this._bindView(sDocId).then(function(oData) {
            if (oData) {
              var docType = (oData.IsContractOnly) ? "title.createContract" : "title.createSingle";
              var docSaveType = "";//(oData.IsDraft) ? this.getResourceBundle().getText("title.draft") : "";
              var title = this.getResourceBundle().getText("displayContractTitle", [docSaveType,
                this.getResourceBundle().getText(docType)
              ]);
              this.getModel("viewModel").setProperty("/title", title);
              this.setFLPTitle(title);

            }
          }.bind(this));
        }
        if(["displayPoStandalone"].indexOf(sRouteName) >= 0){
          this.getModel("viewModel").setProperty("/isContract", false);
          this.getModel("viewModel").setProperty("/isPO", true);
          this.mainEntitySet = "PurchaseOrders";
          this.mainEntityKey = "PONumber";

          this._bindViewPo(sDocId).then(function(oData) {
            if (oData) {
              // var docType = (oData.IsContractOnly) ? "title.createContract" : "title.createSingle";
              var docSaveType = "";//(oData.IsDraft) ? this.getResourceBundle().getText("title.draft") : "";
              var title = this.getResourceBundle().getText("displayPoTitle", [docSaveType]);
              this.getModel("viewModel").setProperty("/title", title);
              this.setFLPTitle(title);
            }
            oData.IsSinglePO = true;
            oData.ContractLIs = oData.PurchaseOrderLIs;
            this.getModel().updateBindings();
          }.bind(this));
        }
      }
    }
  });

});