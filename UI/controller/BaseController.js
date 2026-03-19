jQuery.sap.require("fss/ssp/CustomTypes/YesNoRadio");
jQuery.sap.require("fss/ssp/CustomTypes/Email");
jQuery.sap.require("fss/ssp/CustomTypes/PhoneNumber");
jQuery.sap.require("fss/ssp/CustomTypes/CustomCurrency");
jQuery.sap.require("fss/ssp/CustomTypes/CustomBoolean");
jQuery.sap.require("sap/base/strings/formatMessage");

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "fss/ssp/model/util",
  "sap/m/MessageBox",
  "fss/ssp/model/Constants",
  "fss/ssp/controls/ComboBox",
  "sap/base/strings/formatMessage"

], function(Controller, History, JSONModel, formatter, Filter, FilterOperator, util, MessageBox, Constants, ComboBox, formatMessage) {
  "use strict";

  /**
   * This is the parent (super class) for all UI controllers used in this application. It holds the common
   * functions which are used by more than a controller
   */
  return Controller.extend("fss.ssp.controller.BaseController", {
    formatter: formatter,
    /**
     * Extends byId function. It tries to find the control in associated view or it's main child CreateView.
     * @param {String} sId control's ID
     * @returns {Control} found control or null if not found
     */
    getById: function(sId){
      var ctrl = this.byId(sId);
      if(!ctrl){
        ctrl = this.byId("CreateView").byId(sId);
      }
      return ctrl;
    },

    setFLPTitle: function(sTitle){
      var bFLP = this.getOwnerComponent().getModel("componentModel").getProperty("/inFLP");
      if (bFLP === true) {
        this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
          oShellService.setTitle(sTitle);
          });
          }
    },

    /**
     * Event handler when Error button gets pressed. It opens the popover for error list
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onErrorBtnPress: function(oEvent) {
      var errorBtn = oEvent.getSource();
      this.showErrorPopover(errorBtn);
    },

    /**
     * It shows the error list's popover
     * @param {sap.m.Button} errorBtn The associated button
     * @public
     */
    showErrorPopover: function(errorBtn) {
      var errorPopover;
      if (!errorBtn.getDependents() || errorBtn.getDependents().length === 0) {
        errorPopover = new sap.m.MessagePopover(this.createId("errorPopover"));//sap.ui.xmlfragment("fss.ssp.view.fragments.errorPopover", this);
        // errorPopover.setModel(errorBtn.getModel("ErrorModel"));
        errorBtn.addDependent(errorPopover);
      } else {
        errorPopover = errorBtn.getDependents()[0];
      }
      errorPopover.close();

      errorPopover.removeAllItems();
      var oData = errorBtn.getModel("ErrorModel").getData();

      for(var i in oData.errors){
        errorPopover.addItem(new sap.m.MessageItem({type: sap.ui.core.MessageType[oData.errors[i].type], title: oData.errors[i].message}));
      }

      //adding some delay as sometimes the button is not displayed yet.
      $.sap.delayedCall(100, this, function() {
        errorPopover.openBy(errorBtn);
      });
    },


    onCopyContract:function(oEvent){
      oEvent.preventDefault();
      oEvent.cancelBubble();

      this.getRouter().navTo("copyContractDoc", {
          docId: oEvent.getSource().getBindingContext().getProperty("ContractNumber")
        });
    },

    onCopyPo: function(oEvent) {
      oEvent.preventDefault();
      oEvent.cancelBubble();
      var oCtx = oEvent.getSource().getBindingContext("PoTabModel") || oEvent.getSource().getBindingContext();
      var obj = oCtx.getObject();
      this.getRouter().navTo("copyPODoc", {
        docId: obj.ParentNumber || obj.PONumber
      });
    },

    /**
     * Event handler when user clicks on a file. It will Download the file
     * @param {sap.ui.base.Event} oEvent the file press event
     * @public
     */
    onFilePress: function(oEvent){
      var deviceData = this.getModel("device").getData();

      var oSrc = oEvent.getSource();
      var sPath = oSrc.getBindingContext().getObject().__metadata.uri + "/$value";
      var oViewModel = this.getModel("viewModel");

      if(deviceData.browser.name === "sf"){
        sap.m.URLHelper.redirect(sPath, true);
      }
      else{
        var sFileName = oSrc.getFileName();
        var oFileNameAndExtension = oSrc._splitFileName(sFileName, false);
        var data = null;
        var oXhr = new window.XMLHttpRequest();
        // oXhr.open("GET", oSrc.getUrl());
        oXhr.open("GET", sPath);
        // For "csv" type response type should be "string" as sap.ui.core.util.File.save API expects data to be in string.
        // To .csv files prepend utf-8 byte-order-mark will be added to string so blob type will fail.
        if (oFileNameAndExtension.extension !== "csv") {
          oXhr.responseType = "blob";// force the HTTP response, response-type header to be blob. Note:- by default it will be string.
        }
        oXhr.onreadystatechange = function(xhrEvent){
          var iStatus = xhrEvent.target.status;
          var iState = xhrEvent.target.readyState;

          if(iState === Constants.READY_STATE_FINISHED){
            // oViewModel.setProperty("/busy", false);
            oSrc.getParent().setBusy(false);
          }
        };
        oXhr.onload = function() {
          var sFileExtension = oFileNameAndExtension.extension;
          sFileName = oFileNameAndExtension.name;
          data = oXhr.response; // oXhr.response is now a blob object
          sap.ui.core.util.File.save(data, sFileName, sFileExtension, this.getMimeType(), "utf-8");
        }.bind(oSrc);
        // oViewModel.setProperty("/busy", true);
        oSrc.getParent().setBusyIndicatorDelay(0);
        oSrc.getParent().setBusy(true);
        oXhr.send();
      }
    },

    /**
     * Event handler when user clicks on a file's view option. It will open the file in browser.
     * @param {sap.ui.base.Event} oEvent the file press event
     * @public
     */
    onFileView: function(oEvent){
      sap.m.URLHelper.redirect(oEvent.getSource().getBindingContext().getObject().SourceURI, true);
    },

    /**
     * Event handler when user clicks on User button. It displays the user details.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onUserPress: function(oEvent){
      var oButton = oEvent.getSource();

      // create popover
      if (!this.oUserPopover) {
        this.oUserPopover = sap.ui.xmlfragment("fss.ssp.view.fragments.userDetails", this);
        this.getView().addDependent(this.oUserPopover);

      }
      this.oUserPopover.openBy(oButton);
    },

    /**
     * Reads the errors and if Mandatory Delegate is set, it sets the neccessary field on screen
     * @param {Array} oErrors list of errors
     * @public
     */
    applyOdataErrors: function(oErrors){
      for(var i = oErrors.length - 1; i >= 0; i--){
        if(oErrors[i].code === Constants.MANDATORY_DELEGATE_ERROR_CODE){
          this.getModel("viewModel").setProperty("/approvalMandatory", true);
          oErrors.splice(i, 1);
        }
      }
    },

    /**
     * Constructs an object of GRs and IRs
     * @param {int} lineNumber line number to check
     * @returns {object} Returns an object with consumption details for a line
     * @public
     */
    getConsumptionsPerLine: function(lineNumber){
      var sPath = util.getContextPath(this.getView());
      var consumptionGRs = [],
        consumptionIRs = [];
      var aConsumptions = this.getModel().getProperty(sPath + "ConsumptionGRs");

      for(var i in aConsumptions){
        if(aConsumptions[i].POLineNumber === lineNumber){
          consumptionGRs.push(aConsumptions[i]);
        }
      }

      aConsumptions = this.getModel().getProperty(sPath + "ConsumptionIRs");

      for(i in aConsumptions){
        if(aConsumptions[i].POLineNumber === lineNumber){
          consumptionIRs.push(aConsumptions[i]);
        }
      }

      return {consumptionIRs: consumptionIRs, consumptionGRs: consumptionGRs};
    },


    amountValidationError: function(oEvent) {

      if (oEvent.getParameter("newValue") === "") {
        return;
      }

      oEvent.cancelBubble();
      MessageBox.error(oEvent.getParameter("message"), {//this.getResourceBundle().getText("validation.error.invalidAmount"), {
        actions: [MessageBox.Action.OK],
        onClose: function() {
          // oSrc.setValue(oldValue);
          // oSrc.focus();
        }
      });
    },


    /**
     * Event handler for amount live change. Stops user from entering invalid decimal points
     * @param {sap.ui.base.Event} oEvent the live change event
     * @public
     */
    onAmountLiveChange: function(oEvent){
      var oSrc = oEvent.getSource();

      if(!oSrc.getBinding("value") || !oSrc.getBinding("value").getType() || !oSrc.getBinding("value").getType().getAmountAndCurrency){
        return;
      }
      var oValues = oSrc.getBinding("value").getType().getAmountAndCurrency(oSrc);
      if(!oValues.currency){
        return;
      }

      var newValue = oEvent.getParameter("newValue");
      newValue = newValue.replace(/,/g, "");
      var sFormatted = formatter.currencyValueNonFormatString(newValue, oValues.currency);
      if(sFormatted.length < newValue.length ){
        var oBinding = oSrc.getBindingInfo("value");
        var amountModel = oBinding.parts[0].model;
        var amountPath = oBinding.parts[0].path;
        amountPath = oSrc.getBinding("value").getType().__getContextPath(oSrc, amountModel) + amountPath;

        oSrc.getModel(amountModel).setProperty(amountPath, null);
        oSrc.getModel(amountModel).setProperty(amountPath, Number(sFormatted));
        oSrc._lastValue = newValue;
      }
    },

    /**
     * Event handler for amount live change. Stops user from entering invalid decimal points
     * @param {sap.ui.base.Event} oEvent the live change event
     * @public
     */
    onQtyLiveChange: function(oEvent){
      var oSrc = oEvent.getSource();
      if(!oSrc.getBinding("value") || !oSrc.getBinding("value").getType()){
        return;
      }
      var newValue = oEvent.getParameter("newValue");
      try{
        var sFormatted = oSrc.getBinding("value").getType().formatValue(oSrc.getBinding("value").getType().parseValue(newValue, "string"), "string");
      }
      catch(exception){
        return;
      }
      newValue = newValue.replace(/,/g, "");

      if((sFormatted || "").length < newValue.length ){
        var oBinding = oSrc.getBindingInfo("value");
        var qtyModel = oBinding.parts[0].model;
        var qtyPath = oBinding.parts[0].path;
        qtyPath = util.getContextPath(oSrc, qtyModel) + qtyPath;

        oSrc.getModel(qtyModel).setProperty(qtyPath, null);
        oSrc.getModel(qtyModel).setProperty(qtyPath, Number(sFormatted));
        oSrc._lastValue = newValue;
      }

      //***********************for adding the ability to format quantities.
      // var oSrc = oEvent.getSource();
      // if(!oSrc.getBinding("value") || !oSrc.getBinding("value").getType()){
      //  return;
      // }
      // var newValue = oEvent.getParameter("newValue");

      // newValue = newValue.replace(/,/g, "");
      // var sFormatted = oSrc.getBinding("value").getType().formatValue(newValue, "string").replace(/,/g, "");

      // if(sFormatted.length < newValue.length ){
      //  var oBinding = oSrc.getBindingInfo("value");
      //  var qtyModel = oBinding.parts[0].model;
      //  var qtyPath = oBinding.parts[0].path;
      //  qtyPath = util.getContextPath(oSrc, qtyModel) + qtyPath;

      //  oSrc.getModel(qtyModel).setProperty(qtyPath, null);
      //  oSrc.getModel(qtyModel).setProperty(qtyPath, Number(oSrc.getBinding("value").getType().parseValue(sFormatted, "string")));
      //  oSrc._lastValue = newValue;
      // }
    },


    /**
     * Event handler to open change log url in a new window
     * @param {sap.ui.base.Event} oEvent the url press event
     * @public
     */
    onChangeLogPress: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();
      if(obj && obj.ChangeLogUrl){
        sap.m.URLHelper.redirect(obj.ChangeLogUrl, true);
      }
    },

    // onSelfApprovalSelect: function(oEvent){
    //  if(!oEvent.getSource().getBindingContext().getObject().IsSelfApproval){
    //    return;
    //  }
    //  if(!this.selfApprovalWarning){
    //    this.selfApprovalWarning = sap.ui.xmlfragment(this.createId("selfApprovalWarning"), "fss.ssp.view.fragments.selfApprovalWarning", this);
    //    this.getView().addDependent(this.selfApprovalWarning);
    //  }
    //  this.selfApprovalWarning.open();
    // },

    // onSelfApproveConfirm: function(oEvent){
    //  this.selfApprovalWarning.close();
    // },

    // onSelfApproveCancel: function(oEvent){
    //  this.getModel().setProperty("/IsSelfApproval", false);
    //  this.selfApprovalWarning.close();

    // },

    /**
     * Returns the non-deleted phasings related to a Line Item
     * @param {int} sLineNumber line number to check
     * @public
     */
    getPhasingsForLine: function(sLineNumber){
      var aResults = [];
      var sPath = util.getContextPath(this.getView());
      var aPhasings = this.getModel().getProperty(sPath + "Phasings");
      if(!aPhasings){
        return null;
      }
      for(var i in aPhasings){
        if(aPhasings[i].ItemLineNumber === sLineNumber && aPhasings[i].IsDeleted !== true){
          aResults.push(aPhasings[i]);
        }
      }
      return aResults;
    },

    /**
     * Returns the non-deleted Assignments related to a Line Item
     * @param {int} sLineNumber line number to check
     * @public
     */
    getAssignmentsForLine: function(sLineNumber){
      var aResults = [];
      var sPath = util.getContextPath(this.getView());
      var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");
      if(!aAssignments){
        return null;
      }
      for(var i in aAssignments){
        if(aAssignments[i].ItemLineNumber === sLineNumber && aAssignments[i].IsDeleted !== true){
          aResults.push(aAssignments[i]);
        }
      }
      return aResults;
    },


    deleteAssignmentsForLine: function(sLineNumber){
      var sPath = util.getContextPath(this.getView());
      var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");

      for(var i = aAssignments.length - 1; i >= 0; i--){
        if(aAssignments[i].ItemLineNumber === sLineNumber){
          if(aAssignments[i].ParentNumber){
            aAssignments[i].IsDeleted = true;
          }
          else{
            aAssignments.splice(i, 1);
          }
        }
      }
      this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
    },

    /**
     * Finds out the next assignment line number for the supplied line item number
     * @param {String} lineItemNumber associated line item number
     * @returns {String} calculated assignment line number
     * @public
     */
    getNextAssignmentLine: function(lineItemNumber){
      var sPath = util.getContextPath(this.getView());
      var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");
      var lineNumber = 1;
      var tempLineNumber = 0;
      for(var i in aAssignments){
        if(aAssignments[i].ItemLineNumber === lineItemNumber){
          lineNumber++;
          if(aAssignments[i].AssignmentLineNumber > tempLineNumber){
            tempLineNumber = Number(aAssignments[i].AssignmentLineNumber);
          }
        }
      }
      if((tempLineNumber + 1) > lineNumber){
        lineNumber = tempLineNumber + 1;
      }
      return lineNumber + "";
    },

    /**
     * Event handler when COA link gets pressed. It opens that app in a new tab.
     * @param {sap.ui.base.Event} oEvent the link press event
     * @public
     */
    onCOAPress: function(oEvent){
      var bFLP = this.getOwnerComponent().getModel("componentModel").getProperty("/inFLP");
      if (bFLP === true) {
        this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
          var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
          var sUrl = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
              target: {
                semanticObject: "ZMYFI",
                action: "COA_SEARCH"
              }
            })) || "";
          sap.m.URLHelper.redirect( sUrl, true);

        });
      }else{
        var sUrl = this.getResourceBundle().getText("coa.app.url");
        sap.m.URLHelper.redirect(sUrl, true);
        }
      // var sUrl = this.getResourceBundle().getText("coa.app.url");
      // sap.m.URLHelper.redirect(sUrl, true);
    },

    /**
     * A generic function to handle Select(dropdowns) data change event. It makes the control
     * enabled(if data exists) and it selects the first item.
     * @param {Cotrol} oSelect select control to update
     * @public
     */
    selectLiDataChange: function(oSelect){
      if(oSelect){
        var oItems = oSelect.getItems();
        oSelect.setEnabled(oItems.length > 0);

        //if there are items in Select but none has been selected, select the first one.
        if(oItems.length > 0 && !oSelect.getSelectedItem()){
          oSelect.setSelectedItem(oItems[0]);
        }
        oSelect.fireChange({selectedItem: oSelect.getSelectedItem()});
      }
    },

    // onDelegateLiveChange: function(oEvent){
    //  var temp = oEvent.getParameter("newValue");
    //  this.getModel().setProperty("/ApprovalDetails/DelegateID", null);
    //  this.getModel("viewModel").setProperty("/vhDisplay/DelegateEID", null);
    //  this.getModel("viewModel").setProperty("/vhDisplay/DelegateName", null);
    //  oEvent.getSource().setValue(temp);
    // },

    /**
     * A custom event handler for Delegate VH so it sets delegate's total before change happens
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSearchHelpValueChangeDelegate: function(oEvent){
      // this.getModel().setProperty("/ApprovalDetails/DelegateID", null);
      // this.getModel("viewModel").setProperty("/vhDisplay/DelegateEID", null);
      // this.getModel("viewModel").setProperty("/vhDisplay/DelegateName", null);
      this._setDelegateTotalValue();
      this.onSearchHelpValueChange(oEvent);
    },

    /**
     * A custom event handler for Delegate VH so it sets delegate's total before request happens
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onValueHelpRequestDelegate: function(oEvent){
      this._setDelegateTotalValue();
      this.onValueHelpRequest(oEvent);
    },

    /**
     * A utility function to set the total value for the delegate's filter. Either the total value field or sum of all LIs
     * @public
     */
    _setDelegateTotalValue: function(){
      var delegateTotalValue = 0;
      var sPath = util.getContextPath(this.getView());
      if(this.getModel("viewModel").getProperty("/isContract")){
        delegateTotalValue = this.getModel().getProperty(sPath + "TotalValue");
      }
      if(this.getModel("viewModel").getProperty("/isPO")){
        delegateTotalValue = this.getModel("viewModel").getProperty("/totalInc");
        delegateTotalValue = formatter.currencyValueNumber(delegateTotalValue, this.getModel().getProperty(sPath + "TotalValue"));
      }
      this.getModel("viewModel").setProperty("/delegateTotalValue", delegateTotalValue);
    },

    /**
     * Event handler for when Header Text button is pressed. It opens the related dialog and sets the data
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onHeaderTextPress: function(oEvent){
      var oBtn = oEvent.getSource();
      var viewModel = this.getModel("viewModel");
      if (!this.headerTextDlg) {
        this.headerTextDlg = sap.ui.xmlfragment(this.createId(this.createPhasingDlgId), "fss.ssp.view.fragments.headerTextDialog", this);
        this.headerTextDlg.setModel(new JSONModel({}));
        this.getView().addDependent(this.headerTextDlg);
        if(viewModel.getProperty("/displayMode") === true){
          util.makeFormReadOnly(this.headerTextDlg.getContent());
        }
      }
      this.clearMandatoryDlg(this.headerTextDlg);

      var obj = oBtn.getBindingContext().getObject();

      if(obj && obj.HeaderTexts){
        obj = $.extend({}, obj.HeaderTexts);
      }
      else{
        obj = {};
      }

      this.headerTextDlg.getModel().setData(obj);
      this.headerTextDlg.open();
    },

    /**
     * Event handler for when Header Text's Cancel is pressed. It closes the dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onHeaderTextCancel: function(oEvent){
      if(this.headerTextDlg){
        this.headerTextDlg.close();
      }
    },

    /**
     * Event handler for when Header Text's Ok is pressed. It sets the data and then closes the dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onHeaderTextConfirm: function(oEvent){
      var obj = this.headerTextDlg.getModel().getData();
      var sPath = util.getContextPath(this.getView());

      this.getModel().setProperty(sPath + "HeaderTexts", obj);
      this.headerTextDlg.close();
    },

    /**
     * This method reads the list of attachments for a document using its path and retruns the
     * data as part of resolving the promise. The promise will resolve to null if there is an error
     * @param {string} sPath the path to attachments entity
     * @param {Promise} promise the promise to be resolved
     * @public
     */
    readAttachments: function(sPath, promise) {
      var oViewModel = this.getModel("viewModel");

      oViewModel.setProperty("/busy", true);
      var mParameters = {
        method: "GET",
        success: function(oData) {
          oViewModel.setProperty("/busy", false);
          // util.removeMetadata(oData.results);
          if (promise) {
            promise.resolve(oData.results);
          }
        },
        error: function(oError) {
          oViewModel.setProperty("/busy", false);
          if (promise) {
            promise.resolve([]);
          }

          var aErrors = util.processODataError(oError, this.getResourceBundle());
          this.getModel("ErrorModel").setProperty("/errors", aErrors);
          var errorBtn = this.getById("errorBtn");
          this.showErrorPopover(errorBtn);

        }.bind(this)
      };
      this.mainModel.read(sPath, mParameters);
    },

    /**
     * This method clears all error states for all required fields in the dialog and resets the error model
     * @param {sap.m.Dialog} oDialog the dialog to be checked
     * @public
     */
    clearMandatoryDlg: function(oDialog) {
      if (!oDialog.requiredControls) {
        oDialog.requiredControls = [];
        util.getRequiredControls(oDialog.getContent(), oDialog.requiredControls);
      }
      util.clearRequiredControls(oDialog.requiredControls, oDialog);
      //clear any non mandatory field where a validation can happen
      util.clearRequiredControls(oDialog.getControlsByFieldGroupId(["NonMandatoryStatus"]), oDialog);

      var oErrorModel = oDialog.getModel("ErrorModel");
      if (oErrorModel) {
        oErrorModel.setProperty("/errors", []);
        oErrorModel.updateBindings(true);
      }
    },

    /**
     * This method checks all mandatory fields for a dialog to ensure they all have a value
     * @param {sap.m.Dialog} oDialog the dialog to be checked
     * @return {boolean} Returns true if all valid, false otherwise
     * @public
     */
    validateMandatoryDlg: function(oDialog) {
      var bResult = true;

      if (!oDialog.requiredControls) {
        oDialog.requiredControls = [];
        util.getRequiredControls(oDialog.getContent(), oDialog.requiredControls);
      }
      util.clearRequiredControls(oDialog.requiredControls, oDialog);
      bResult = util.checkRequiredControls(oDialog.requiredControls, [], oDialog);

      return bResult;
    },

    /**
     * Event handler when Value help button gets pressed. It manages the creation and display of the value
     * help dialog using vhConfigModel JSON model. It creates the Filterbar and result's table
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onValueHelpRequest: function(oEvent) {
      var sDialogName = oEvent.getSource().data().dialogName;
      var vhConfigData = this.getModel("vhConfigModel").getData();
      var vhConfig = vhConfigData[sDialogName];

      //there is no custom data for dialog name or there is no config available for the dialog, can't do much :). Should never happen.
      if (!sDialogName || !vhConfig) {
        return;
      }
      var oComponenet = this.getOwnerComponent();
      var oResourceBundle = this.getResourceBundle();
      var aFilters = [];
      if (!oComponenet.vhDialogs[sDialogName]) {
        var oDialog = sap.ui.xmlfragment("fss.ssp.view.fragments.valueHelpDialog", this);
        oDialog._sTableTitleNoCount = oResourceBundle.getText("VH.table.header");
        oEvent.getSource().addDependent(oDialog);
        var filterModel = new JSONModel({});
        oDialog.setModel(filterModel, "filterModel");

        var displayModel = new JSONModel({});
        oDialog.setModel(displayModel, "displayModel");

        if(vhConfig.message){

          //Display a message strip in VH dialog
          oDialog.insertContent(new sap.m.MessageStrip({text:oResourceBundle.getText(vhConfig.message),
                                showIcon:true,
                                enableFormattedText: true,
                                type:vhConfig.messageType || "Information"
          }).addStyleClass("sapUiTinyMargin"), 0);
        }

        oDialog.setTitle(oResourceBundle.getText(vhConfig.dialogTitle));
        oDialog.addCustomData(new sap.ui.core.CustomData({
          key: "dialogName",
          value: sDialogName
        }));

        var oFilterBar = oDialog.getFilterBar();
        //Hide 'Hide Advanced Search' button
        oFilterBar._oHideShowButton = new sap.m.Button();//.setVisible(false);
        var FilterGroupItem = sap.ui.requireSync("sap/ui/comp/filterbar/FilterGroupItem");

        if(vhConfig.widthPath){
          var oBindingInfo = {path: vhConfig.widthPath};
          if(vhConfig.widthFormatter){
            oBindingInfo.formatter = formatter[vhConfig.widthFormatter];
          }
          oDialog.attachBeforeOpen(function(){
            this.bindProperty("contentWidth", oBindingInfo);
            });
        }

        var keyCodes = sap.ui.requireSync("sap/ui/events/KeyCodes");
        oDialog.attachBrowserEvent("keydown", function(evt) {
          //add an event handler so that user can use ENTER to search
          if (evt.keyCode === keyCodes.ENTER) {
            evt.stopImmediatePropagation();
            evt.preventDefault();
            // var filterBar = util.getImmediateChildByType(oDialog, "sap.ui.comp.filterbar.FilterBar");
            if (oFilterBar) {
              oFilterBar.fireSearch();
            }
          }
        });

        oDialog.getTableAsync().then(function(oTable) {
          // oFilterBar.addFilterGroupItem(
          //        new FilterGroupItem({
          //          groupName: sap.ui.comp.filterbar.FilterBar.INTERNAL_GROUP,
          //          name: "abc",
          //          visibleInFilterBar: true,
          //          control: new sap.m.MessageStrip({text:"Ensure you Asset number and not the Serial number",
          //            showIcon:true,
          //            type:"Warning"})}));
          oTable.setBusyIndicatorDelay(1);
          oTable.setEnableBusyIndicator(true);
          oTable.setSelectionBehavior(sap.ui.table.SelectionBehavior.RowOnly);
          oTable.setSelectionMode(sap.ui.table.SelectionMode.Single);

          var colData = {
            cols: []
          };
          for (var fieldName in vhConfig.fieldList) {
            if (!vhConfig.fieldList[fieldName]) {
              continue;
            }
            if (vhConfig.fieldList[fieldName].isKey) {
              oDialog.setKey(fieldName);
            }
            if (vhConfig.fieldList[fieldName].isDescription) {
              oDialog.setDescriptionKey(fieldName);
            }
            //if the field is filterable
            if (vhConfig.fieldList[fieldName].filterOperator) {
              var enabled = true;
              if (vhConfig.fieldList[fieldName].hasOwnProperty("value")) {
                // filterModel.getData()[fieldName] = vhConfig.fieldList[fieldName].value;
                enabled = false;
              }

              if (vhConfig.fieldList[fieldName].label && vhConfig.fieldList[fieldName].keySearchOnly !== true) {
                var label = oResourceBundle.getText(vhConfig.fieldList[fieldName].searchLabel || vhConfig.fieldList[fieldName].label);
                var placeholder = oResourceBundle.getText(vhConfig.fieldList[fieldName].placeholderLabel || vhConfig.fieldList[fieldName].searchLabel || vhConfig.fieldList[fieldName].label);
                var placeHolder = oResourceBundle.getText("vh." + vhConfig.fieldList[fieldName].filterOperator + ".placeholder", [placeholder]);
                var sFilterFieldName = fieldName.replace("_FROM", "").replace("_TO", "");

                var oControl = "";
                switch(vhConfig.fieldList[fieldName].controlType){
                  case "boolean":
                    oControl = new sap.m.CheckBox({
                        selected: "{filterModel>/" + fieldName + "}",
                        enabled: enabled
                      });
                    break;

                  case "date":
                    oControl = new sap.m.DatePicker({
                        value: "{path: 'filterModel>/" + fieldName + "'}",
                        displayFormat: "dd.MM.yyyy",
                        valueFormat: "dd.MM.yyyy",
                        editable: enabled,
                        placeholder: placeHolder
                      });
                    break;

                  case "comboBox":
                    oControl = new ComboBox({
                        selectedKey: "{path: 'filterModel>/" + fieldName + "'}",
                        items: {
                          path: vhConfig.fieldList[fieldName].items,
                          template: new sap.ui.core.Item({
                            key: {
                              path: vhConfig.fieldList[fieldName].itemKey
                            },
                            text: {
                              parts: [
                                {path: vhConfig.fieldList[fieldName].itemKey},
                                {path: vhConfig.fieldList[fieldName].itemValue}
                                ],
                              formatter: formatter[vhConfig.fieldList[fieldName].formatter] ? formatter[vhConfig.fieldList[fieldName].formatter].bind(this) : formatter.valueHelpDisplay.bind(this)
                            }
                          })
                        },
                        editable: enabled
                        // placeholder: placeHolder

                      });
                    break;

                  case "dateRange":
                    oControl = new sap.m.DateRangeSelection({
                        dateValue: "{path: 'filterModel>/" + fieldName + "_FROM'}",
                        secondDateValue: "{path: 'filterModel>/" + fieldName + "_TO'}",
                        displayFormat: "dd.MM.yyyy",
                        valueFormat: "dd.MM.yyyy",
                        editable: enabled
                      });
                    break;

                  case "valueHelp":
                    var oFormatter = formatter[vhConfig.fieldList[fieldName].formatter] ? formatter[vhConfig.fieldList[fieldName].formatter].bind(this) :
                                    formatter.valueHelpDisplay.bind(this);
                    var aParts = [{path: "filterModel>/" + fieldName}];
                    if(vhConfig.fieldList[fieldName].vhDescription){
                      aParts.push({path: "displayModel>/" + vhConfig.fieldList[fieldName].vhDescription});
                    }

                    oControl = new sap.m.Input({
                      value: { parts: aParts, formatter: oFormatter},
                      editable: enabled,
                      // maxLength: {
                      //    path: (vhConfig.modelName ? vhConfig.modelName + ">" : "") + vhConfig.entitySet + "/" + sFilterFieldName + "/0/#@maxLength",
                      //    formatter: formatter.fieldLengthFormatter
                      // },
                      placeholder: placeHolder + " " + this.getResourceBundle().getText("VH.vhfield.placeholder"),
                      showValueHelp: true,
                      valueHelpRequest: vhConfig.fieldList[fieldName].valueHelpRequest ?
                            this[vhConfig.fieldList[fieldName].valueHelpRequest].bind(this) : this.onValueHelpRequest.bind(this),
                      change: vhConfig.fieldList[fieldName].change ?
                            this[vhConfig.fieldList[fieldName].change].bind(this) : this.onSearchHelpValueChange.bind(this),
                      customData: new sap.ui.core.CustomData({key: "dialogName", value: vhConfig.fieldList[fieldName].dialogName})
                      });
                    break;

                  default:
                    oControl = new sap.m.Input({
                        value: "{filterModel>/" + fieldName + "}",
                        editable: enabled,
                        maxLength: {
                            path: (vhConfig.modelName ? vhConfig.modelName + ">" : "") + vhConfig.entitySet + "/" + sFilterFieldName + "/0/#@maxLength",
                            formatter: formatter.fieldLengthFormatter
                        },
                        placeholder: placeHolder,
                        valueLiveUpdate: true
                      });
                    break;
                }
                oFilterBar.addFilterGroupItem(
                  new FilterGroupItem({
                    groupName: sap.ui.comp.filterbar.FilterBar.INTERNAL_GROUP,
                    name: fieldName,
                    label: label,
                    visibleInFilterBar: true,
                    control: oControl
                      // (vhConfig.fieldList[fieldName].type && vhConfig.fieldList[fieldName].type === "boolean") ?
                      // new sap.m.CheckBox({
                      //  editable: "{filterModel>/" + fieldName + "}",
                      //  enabled: enabled
                      // }) : (vhConfig.fieldList[fieldName].type && vhConfig.fieldList[fieldName].type === "date") ?
                      // new sap.m.DatePicker({
                      //  value: "{path: 'filterModel>/" + fieldName + "',type: 'sap.ui.model.type.Date',formatOptions: {pattern:'dd.MM.yyyy', strictParsing:true, UTC: true}}",
                      //  displayFormat: "dd.MM.yyyy",
                      //  valueFormat: "dd.MM.yyyy",
                      //  editable: enabled,
                      //  placeholder: placeHolder
                      // }) :
                      // new sap.m.Input({
                      //  value: "{filterModel>/" + fieldName + "}",
                      //  editable: enabled,
                      //  maxLength: {
                      //      path: (vhConfig.modelName ? vhConfig.modelName + ">" : "") + vhConfig.entitySet + "/" + sFilterFieldName + "/0/#@maxLength",
                      //      formatter: formatter.fieldLengthFormatter
                      //  },
                      //  placeholder: placeHolder,
                      //  valueLiveUpdate: true
                      // })
                  })
                );
              }
            }
            if (vhConfig.fieldList[fieldName].label  && !vhConfig.fieldList[fieldName].searchOnly && vhConfig.fieldList[fieldName].keySearchOnly !== true) {
              colData.cols.push({
                label: oResourceBundle.getText(vhConfig.fieldList[fieldName].tableLabel || vhConfig.fieldList[fieldName].label),
                template: (vhConfig.modelName ? vhConfig.modelName + ">" : "") + fieldName,
                width: vhConfig.fieldList[fieldName].width,
                type: (vhConfig.fieldList[fieldName].type) ? vhConfig.fieldList[fieldName].type : "string",
                oType: vhConfig.fieldList[fieldName].oType,
                tooltip: oResourceBundle.getText(vhConfig.fieldList[fieldName].tableTooltip || vhConfig.fieldList[fieldName].label)
              });
            }
          }
          oTable.setModel(new JSONModel(colData), "columns");

          var cols = oTable.getColumns();
          for(var k in cols){
            cols[k].setAutoResizable(true);
          }
          util.setDefaultPlacementTextVH(oDialog.getContent(), this);

        }.bind(this));
        oComponenet.vhDialogs[sDialogName] = oDialog;
      }else{
        oComponenet.vhDialogs[sDialogName].setModel(oEvent.getSource().getModel());
        oComponenet.vhDialogs[sDialogName].setModel(oEvent.getSource().getModel("DocumentModel"), "DocumentModel");
        oComponenet.vhDialogs[sDialogName].setModel(oEvent.getSource().getModel("viewModel"), "viewModel");
      }
      oEvent.getSource().addDependent(oComponenet.vhDialogs[sDialogName]);
      oComponenet.vhDialogs[sDialogName].getModel("filterModel").setData({});
      oComponenet.vhDialogs[sDialogName].getTableAsync().then(function(oTable) {
        for (var fieldName in vhConfig.fieldList) {
          if (!vhConfig.fieldList[fieldName]) {
            continue;
          }
          //if the field is filterable
          if (vhConfig.fieldList[fieldName].filterOperator && vhConfig.fieldList[fieldName].hasOwnProperty("value") && vhConfig.fieldList[
              fieldName].value !== undefined) {
            var value = this._getBoundValue(vhConfig.fieldList[fieldName].value, oComponenet.vhDialogs[sDialogName]);
            if(!value && value !== false){
              if(!vhConfig.fieldList[fieldName].optional){
                MessageBox.error(this.getResourceBundle().getText("VH.noFilterBound.error",
                  [this.getResourceBundle().getText(vhConfig.fieldList[fieldName].label || vhConfig.fieldList[fieldName].valueName),
                    this.getResourceBundle().getText(vhConfig.dialogType)]),
                    {actions: [MessageBox.Action.OK]});
                if(oComponenet.vhDialogs[sDialogName].isOpen()){
                  oComponenet.vhDialogs[sDialogName].close();
                }else{
                  var that = this;
                  var openFunc = function(oEvent1){
                      oEvent1.getSource().close();
                      oEvent1.getSource().detachAfterOpen(openFunc, that);
                    };
                  oComponenet.vhDialogs[sDialogName].attachAfterOpen(openFunc, that);
                }
                return;
              }
            }
            else{
              aFilters.push(new Filter(fieldName, FilterOperator[vhConfig.fieldList[fieldName].filterOperator], value));
              oComponenet.vhDialogs[sDialogName].getModel("filterModel").getData()[fieldName] = value;
            }
          }
        }
        oComponenet.vhDialogs[sDialogName].getModel("filterModel").refresh();

        if (oTable.bindRows) {
          oTable.unbindRows();
          //oTable.bindAggregation("rows", {path: (vhConfig.modelName ? vhConfig.modelName + ">" : "") + vhConfig.entitySet, filters: aFilters});
        }
      }.bind(this));
      oComponenet.vhDialogs[sDialogName].setTokens([]);
      // //Hide 'Hide Advanced Search' button
      // oComponenet.vhDialogs[sDialogName].getFilterBar()._oHideShowButton = new sap.m.Button();//.setVisible(false);
      oComponenet.vhDialogs[sDialogName].open();

    },

    /**
     * Event handler when Search button within value help dialog gets pressed. It uses the values user has entered to
     * filter and update the result's table
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onValueHelpSearch: function(oEvent) {
      var oFilterData = oEvent.getSource().getModel("filterModel").getData();
      var aFilters = [];
      var aDefaultFilters = [];
      var oFilter, keyField;
      var oDialog = util.getImmediateParentByType(oEvent.getSource(), "sap.ui.comp.valuehelpdialog.ValueHelpDialog");
      var sDialogName = oDialog.data().dialogName;
      var vhConfigData = this.getModel("vhConfigModel").getData();
      var vhConfig = vhConfigData[sDialogName];
      var bNonDefault = false;

      for (var fieldName in vhConfig.fieldList) {
        if (vhConfig.fieldList[fieldName].isKey) {
          keyField = fieldName;
          break;
        }
      }

      var to, from, sFilterFieldName;
      for (var oFilterItem in oFilterData) {
        if ((oFilterData[oFilterItem] || oFilterData[oFilterItem] === false) && oFilterData[oFilterItem] !== "" && vhConfig.fieldList[oFilterItem].filterOperator && oFilterData[
            oFilterItem] !== undefined) {
              //Remove FROM and TO if this is a range filter
          sFilterFieldName = oFilterItem;
          if (oFilterItem.indexOf("_FROM") > -1) {
            to = oFilterItem.replace("_FROM", "_TO");
            sFilterFieldName = sFilterFieldName.replace("_FROM", "");
            if(oFilterData[to]){
              if(Number(oFilterData[oFilterItem]) > Number(oFilterData[to])){
                MessageBox.error(this.getResourceBundle().getText(vhConfig.fieldList[sFilterFieldName].label) +
                        this.getResourceBundle().getText("fromMoreThanTo.error"),
                        {actions: [MessageBox.Action.OK]});
                return;
              }
              oFilter = new Filter(sFilterFieldName, FilterOperator.BT, oFilterData[oFilterItem], oFilterData[to]);
              // aFilters.push(new Filter(sFilterFieldName, FilterOperator.BT,
              //          oFilterData[oFilterItem], oFilterData[to]));
            }
            else{
              oFilter = new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]);
              // aFilters.push(new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]));
            }

          }
          else if(oFilterItem.indexOf("_TO") > -1){
            from = oFilterItem.replace("_TO", "_FROM");
            sFilterFieldName = sFilterFieldName.replace("_TO", "");

            //if from field exists, this was handled by FROM above
            if(!oFilterData[from]){
              oFilter = new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]);
              // aFilters.push(new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]));
            }
          }
          else{
            oFilter = new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]);
            // aFilters.push(new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]));
          }
          if(oFilter){
            aFilters.push(oFilter);
            bNonDefault = !vhConfig.fieldList[oFilterItem].hasOwnProperty("value");
            if(!bNonDefault){
              aDefaultFilters.push(oFilter);
            }
          }

        }
      }

      if (!bNonDefault && !vhConfig.allowNoFilter) {
        MessageBox.error(this.getResourceBundle().getText("vh.noFilter.error"), {actions: [MessageBox.Action.OK]});
        return;
      }

      oFilter = aFilters.length > 1 ? [new Filter({
        filters: aFilters,
        and: true
      })] : aFilters;
      var resourceBundle = this.getResourceBundle();
      oDialog.getTableAsync().then(function(oTable) {
        if (oTable.bindRows) {
          if (oTable.getBinding("rows")) {
            oTable.unbindAggregation("rows");
          }
          oTable.bindAggregation("rows", {
            path: (vhConfig.modelName ? vhConfig.modelName + ">" : "") + vhConfig.entitySet,
            filters: oFilter,
            events:{
              dataReceived: function(oReceivedEvent){
                // oDialog._updateTitles();
                if(keyField){
                  var aTemp;
                  if(!oReceivedEvent.getParameter("data")){
                    return;
                  }
                  var aData = oReceivedEvent.getParameter("data").results;
                  for(var i in aData){
                    aTemp = [new Filter(keyField, FilterOperator.EQ, aData[i][keyField])].concat(aDefaultFilters);
                    if(vhConfig.entitySet.indexOf("Assets") >= 0){
                      aTemp = [new Filter("AssetNumber", FilterOperator.EQ, aData[i].AssetNumber)].concat(aTemp);
                    }
                    this.addValueToCache(aData[i], vhConfig.entitySet, aTemp);
                  }
                }
              }.bind(this)
            }
          });

        }

        if (oTable.bindItems) {
          oTable.getBinding("items").filter(oFilter);
        }

        oTable.setNoData(resourceBundle.getText("noDataWithFilterOrSearchText"));
      }.bind(this));

    },

    /**
     * Event handler when Cancel button within value help dialog gets pressed. It closes the value help dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onValueHelpCancel: function(oEvent) {
      oEvent.getSource().close();
    },

    /**
     * Event handler when an Item within the result's table is selected. It uses vhConfigModel JSON model
     * to bind the values to the view's model.
     * @param {sap.ui.base.Event} oEvent the item selection event
     * @public
     */
    onValueHelpSelect: function(oEvent) {
      var oDialog = oEvent.getSource();
      var sDialogName = oDialog.data().dialogName;
      var vhConfigData = this.getModel("vhConfigModel").getData();
      var vhConfig = vhConfigData[sDialogName];
      var oToken = oEvent.getParameter("tokens")[0];

      //there is no custom data for dialog name or there is no config available for the dialog, or nothing has been selected, can't do much :). Should never happen.
      if (!sDialogName || !vhConfig || !oToken) {
        oDialog.close();
        return;
      }

      this.setValueHelpBoundValues(oToken.data().row, vhConfig.fieldList, oDialog.getParent());
      oDialog.close();
    },

    /**
     * Event handler when a value is changed in input field. It uses vhConfigModel JSON model
     * to read the data from oData and bind the correct values. If key is invalid, an error is displayed.
     * @param {sap.ui.base.Event} oEvent the input change event
     * @public
     */
    onSearchHelpValueChange: function(oEvent) {
      var oSrc = oEvent.getSource();
      var sKeyVal = oEvent.getParameter("newValue");
      if(sKeyVal){
        sKeyVal = sKeyVal.split("(")[0].trim();
      }
      var initialLoad = oEvent.getParameter("initialLoad");
      var sDialogName = oSrc.data().dialogName;
      if (!this.getModel("vhConfigModel")) {
        return;
      }
      var vhConfigData = this.getModel("vhConfigModel").getData();
      var vhConfig = vhConfigData[sDialogName];

      //there is no custom data for dialog name or there is no config available for the dialog, can't do much :). Should never happen.
      if (!sDialogName || !vhConfig) {
        return;
      }

      var keyField = null;
      var aFilters = [];

      for (var fieldName in vhConfig.fieldList) {
        if (vhConfig.fieldList[fieldName].boundField && (!sKeyVal || sKeyVal === "")) {
          // this._setBoundValue(vhConfig.fieldList[fieldName].boundField, "", oSrc);
          for (fieldName in vhConfig.fieldList) {
            if (vhConfig.fieldList[fieldName].boundField) {
              this._setBoundValue(vhConfig.fieldList[fieldName].boundField, "", oSrc);
            }
          }
          break;
        }
        if (vhConfig.fieldList[fieldName].isKey) {
          keyField = fieldName;

          var oDataPath = (vhConfig.modelName ? vhConfig.modelName + ">" : "") + vhConfig.entitySet + "/" + fieldName + "/0/#@maxLength";
          var oModelPath = this.getModelAndPath(oDataPath);
          var sModel = oModelPath.sModel;
          var sPath = oModelPath.sPath;

          var oDataLength = formatter.fieldLengthFormatter(this.getModel(sModel).getProperty(sPath));
          if(oDataLength < sKeyVal.length){
            if(!initialLoad){
              MessageBox.error(this.getResourceBundle().getText("VH.lengthExceed.error", [this.getResourceBundle().getText(vhConfig.dialogType),
                    this.getResourceBundle().getText(vhConfig.fieldList[keyField].label),
                    oDataLength
                  ]), {actions: [MessageBox.Action.OK]});
            }
            oModelPath = this.getModelAndPath(vhConfig.fieldList[keyField].boundField);
            // this._setBoundValue(vhConfig.fieldList[keyField].boundField, this._getBoundValue("{" + vhConfig.fieldList[keyField].boundField, oSrc), oSrc);
            //reset all values
            for (fieldName in vhConfig.fieldList) {
              if (vhConfig.fieldList[fieldName].boundField) {
                this._setBoundValue(vhConfig.fieldList[fieldName].boundField, this._getBoundValue("{" + vhConfig.fieldList[fieldName].boundField, oSrc), oSrc);
              }
            }

            // oSrc.getModel(oModelPath.sModel).updateBindings(true);
            return;
          }
        }
        //if there is a default filter
        if (vhConfig.fieldList[fieldName].filterOperator && vhConfig.fieldList[fieldName].hasOwnProperty("value") && vhConfig.fieldList[
              fieldName].value !== undefined) {
          var value = this._getBoundValue(vhConfig.fieldList[fieldName].value, oEvent.getSource());

          if(!initialLoad && !value && value !== false){
            if(!vhConfig.fieldList[fieldName].optional){
              MessageBox.error(this.getResourceBundle().getText("VH.noFilterBound.error",
                [this.getResourceBundle().getText(vhConfig.fieldList[fieldName].label || vhConfig.fieldList[fieldName].valueName),
                  this.getResourceBundle().getText(vhConfig.dialogType)]), {actions: [MessageBox.Action.OK]});
              return;
            }
          }else{
            aFilters.push(new Filter(fieldName, vhConfig.fieldList[fieldName].filterOperator, value));
          }
        }
      }
      if (keyField && sKeyVal && sKeyVal !== "") {
        aFilters.push(new Filter(keyField, FilterOperator.EQ, sKeyVal));
        var oFilter = aFilters.length > 1 ? [new Filter({
          filters: aFilters,
          and: true
        })] : aFilters;


        var cacheFilters = aFilters;

        if(vhConfig.entitySet.indexOf("Assets") >= 0){
          var sSubNumber = oSrc.getBindingInfo("value").binding.getValue()[1];
          cacheFilters = [new Filter("AssetNumber", FilterOperator.EQ, sSubNumber)].concat(cacheFilters);
        }

        var vhData = this.findValueInCache(vhConfig.entitySet, cacheFilters);

        if(vhData){
          this.setValueHelpBoundValues(vhData, vhConfig.fieldList, oSrc, initialLoad);
          return;
        }

        oSrc.setBusyIndicatorDelay(0);
        oSrc.setBusy(true);
        oSrc.getModel((vhConfig.modelName ? vhConfig.modelName : undefined)).read(
          vhConfig.entitySet, {
            method: "GET",
            filters: oFilter, //[new Filter(keyField, FilterOperator.EQ, sKeyVal )],
            success: function(oData) {
              // this.getModel("searchModel").refresh(true);
              oSrc.setBusy(false);
              if (!oData || !oData.results || oData.results.length === 0) {
                if(!initialLoad){
                  MessageBox.error(this.getResourceBundle().getText("VH.notFound.error", [this.getResourceBundle().getText(vhConfig.dialogType),
                    "",
                    // this.getResourceBundle().getText(vhConfig.fieldList[keyField].label),
                    sKeyVal
                  ]), {actions: [MessageBox.Action.OK]});
                }


                //reset all values to their previous value as the search was unsuccessful
                for (fieldName in vhConfig.fieldList) {
                  if (vhConfig.fieldList[fieldName].boundField) {
                    this._setBoundValue(vhConfig.fieldList[fieldName].boundField, this._getBoundValue("{" + vhConfig.fieldList[fieldName].boundField, oSrc), oSrc);
                  }
                }
                return;
              }

              if(vhConfig.entitySet.indexOf("Assets") >= 0){
                oData.results[0].SubNumber = sSubNumber;
              }

              this.setValueHelpBoundValues(oData.results[0], vhConfig.fieldList, oSrc, initialLoad);
              this.addValueToCache(oData.results[0], vhConfig.entitySet, cacheFilters);

            }.bind(this),
            error: function(oError) {
              var aErrors = util.processODataError(oError, this.getResourceBundle());
              if(!initialLoad){
                MessageBox.error(this.getResourceBundle().getText("vh.search.error", [this.getResourceBundle().getText(vhConfig.dialogType),
                  aErrors[0].message
                ]), {actions: [MessageBox.Action.OK]});
                for (fieldName in vhConfig.fieldList) {
                  if (vhConfig.fieldList[fieldName].boundField) {
                    this._setBoundValue(vhConfig.fieldList[fieldName].boundField, this._getBoundValue("{" + vhConfig.fieldList[fieldName].boundField, oSrc), oSrc);
                  }
                }
              }
              oSrc.setBusy(false);
            }.bind(this)
          }
        );
      }
    },

    findValueInCache: function(sEntitySet, aFilters){
      //////********DO NOT DELETE - VH CHACHING SOLUTION**********/////////
      // var sFilters = util.convertFiltersToString(aFilters);
      // var oModel = this.getModel("ValueHelpModel");
      // var modelData = oModel.getData();
      // if(modelData[sEntitySet] && modelData[sEntitySet][sFilters]){
      //  return modelData[sEntitySet][sFilters];
      // }
      return null;
    },

    addValueToCache: function(oData, sEntitySet, aFilters){
      //////********DO NOT DELETE - VH CHACHING SOLUTION**********/////////
      // var sFilters = util.convertFiltersToString(aFilters);
      // var oModel = this.getModel("ValueHelpModel");
      // var modelData = oModel.getData();
      // if(!modelData[sEntitySet]){
      //  modelData[sEntitySet] = {};
      // }

      // modelData[sEntitySet][sFilters] = oData;
      // oModel.setData(modelData);
    },

    setValueHelpBoundValues: function(oData, aFieldList, oSrc, initialLoad){
      var sBoundField, fieldValue;
      for (var fieldName in aFieldList) {
        if (aFieldList[fieldName].boundField) {
          if(!(initialLoad && aFieldList[fieldName].isKey)){
            sBoundField = aFieldList[fieldName].boundField;
            fieldValue = oData[fieldName];
            this._setBoundValue(sBoundField, fieldValue, oSrc);
          }
        }
      }
    },


    /**
     *This method binds a value to a field on screen.
     * @param {string} sBoundField field to be bound.
     * @param {var} fieldValue value to be bound to the field
     * @param {sap.m.Dialog} oDialog the dialog where the field exists. If null, the field is assumed to be on view.
     * @public
     */
    _setBoundValue: function(sBoundField, fieldValue, oDialog) {
      var parentControl = oDialog ? oDialog : this.getView();

      var oBinding = this.getModelAndPath(sBoundField);
      var sModel = oBinding.sModel;

      var sPath = oBinding.sPath; //(sBoundField.indexOf(">") >= 0) ? sBoundField.split(">")[1] : sBoundField;

      if (!sPath.startsWith("/")) {
        if (!parentControl.getBindingContext(sModel)) {
          return;
        }
        sPath = util.getContextPath(parentControl, sModel) + oBinding.sPath;
      }

      if (parentControl.getModel(sModel)) {
        //we need this dummy setting so that UI updates if the binding value is the same as before.
        parentControl.getModel(sModel).setProperty(sPath, null);

        parentControl.getModel(sModel).setProperty(sPath, fieldValue);

      }
    },

    /**
     *This method returns the bound value within a view/dialog.
     * @param {string} sBoundField field to be bound.
     * @param {sap.ui.core.Control} oControl the control which raised the request. If null, the View will be used.
     * @returns {object} Value of the bound filed
     * @public
     */
    _getBoundValue: function(sBoundField, oControl){
      //if it's a hardcoded value
      if(typeof sBoundField !== "string" || sBoundField.indexOf("{") < 0){
        return sBoundField;
      }

      var sTempBoundField = sBoundField.replace("{", "").replace("}", "");

      var parentControl = oControl ? oControl : this.getView();

      var oBinding = this.getModelAndPath(sTempBoundField);
      var sModel = oBinding.sModel;

      var sPath = oBinding.sPath; //(sBoundField.indexOf(">") >= 0) ? sBoundField.split(">")[1] : sBoundField;

      if (!sPath.startsWith("/")) {
        if (!parentControl.getBindingContext()) {
          return null;
        }
        sPath = util.getContextPath(parentControl) + oBinding.sPath;
      }

      if (parentControl.getModel(sModel)) {
        //we need this dummy setting so that UI updates if the binding value is the same as before.
        return parentControl.getModel(sModel).getProperty(sPath);
      }
    },

    /**
     *This method resolved filed binding name to its model and path.
     * @param {string} sBoundField field to be resolved.
     * @return {Object} returns an object with sPath and sModel of the resolved values
     * @public
     */
    getModelAndPath: function(sBoundField) {
      if(!sBoundField){
        return {sModel: undefined, sPath:undefined};
      }
      return {
        sModel: (sBoundField.indexOf(">") >= 0) ? sBoundField.split(">")[0] : undefined,
        sPath: (sBoundField.indexOf(">") >= 0) ? sBoundField.split(">")[1] : sBoundField
      };
    },

    /**
     * Event handler when More button gets pressed. It opens the list of extra buttons
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onMorePress: function(oEvent){
      var oButton = oEvent.getSource();

      // create action sheet only once
      if (!this._moreActionSheet) {
        this._moreActionSheet = sap.ui.xmlfragment(
          "fss.ssp.view.fragments.AddMoreActionSheet",
          this
        );
        this.getView().addDependent(this._moreActionSheet);
      }
      this._moreActionSheet.openBy(oButton);
    },

    onHomePress: function() {
      window.location.replace("../../../bsp/sap/zfss_myfi/index.html");
    },

    /**
     * Event handler when Help button gets pressed. It opens the help url in a new tab.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onHelpPress: function(oEvent) {
      var helpUrl = this.getModel("dropDownModel").getData().HelpUrl;
      if(helpUrl && Array.isArray(helpUrl) && helpUrl[helpUrl.length - 1] && helpUrl[helpUrl.length - 1].Value){
        var url = helpUrl[helpUrl.length - 1].Value;
        sap.m.URLHelper.redirect(url, true);
      }
      // var url = this.getResourceBundle().getText("btn.help.url");
      // sap.m.URLHelper.redirect(url, true);
    },

    /**
     * Event handler when PRF Worklist button gets pressed. It opens the worklist url in a new tab.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onPrfWorklistPress: function(oEvent) {
      var prfUrl = this.getModel("dropDownModel").getData().PRFURL;
      if(prfUrl && Array.isArray(prfUrl) && prfUrl[prfUrl.length - 1] && prfUrl[prfUrl.length - 1].Value){
        var url = formatter.escapePRFUrl(prfUrl[prfUrl.length - 1].Value);
        sap.m.URLHelper.redirect(url, true);
      }
    },

    /**
     * Event handler when PRF Display button gets pressed. It opens the PRF in a different tab
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onPrfActionPress: function(oEvent) {
      var btn = oEvent.getSource();
      var dataElement = btn.data().dataElement;
      var prfUrl = btn.getBindingContext().getProperty(dataElement);

      var url = formatter.escapePRFUrl(prfUrl);
      sap.m.URLHelper.redirect(url, true);

    },

    onPrfPress: function(oEvent) {
      var oButton = oEvent.getSource();

      // create action sheet only once
      if (!this._prfActionSheet) {
        this._prfActionSheet = sap.ui.xmlfragment(
          "fss.ssp.view.fragments.prfActionSheet",
          this
        );
        this.getView().addDependent(this._prfActionSheet);
      }
      this._prfActionSheet.openBy(oButton);
    },

    /**
     * Convenience method for accessing the router in every controller of the application.
     * @public
     * @returns {sap.ui.core.routing.Router} the router for this component
     */
    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    },

    /**
     * Convenience method for getting the view model by name in every controller of the application.
     * @public
     * @param {string} sName the model name
     * @returns {sap.ui.model.Model} the model instance
     */
    getModel: function(sName) {
      return this.getView().getModel(sName);
    },

    /**
     * Convenience method for setting the view model in every controller of the application.
     * @public
     * @param {sap.ui.model.Model} oModel the model instance
     * @param {string} sName the model name
     * @returns {sap.ui.mvc.View} the view instance
     */
    setModel: function(oModel, sName) {
      return this.getView().setModel(oModel, sName);
    },

    /**
     * Convenience method for getting the resource bundle.
     * @public
     * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
     */
    getResourceBundle: function() {
      if (this.getModel("i18n")) {
        return this.getModel("i18n").getResourceBundle();
      } else {
        return this.getOwnerComponent().getResourceBundle();
      }

    },

    /**
     * Event handler for navigating back.
     * It there is a history entry we go one step back in the browser history
     * If not, it will replace the current entry of the browser history with the worklist route.
     * @public
     */
    onNavBack: function() {
      // var sPreviousHash = History.getInstance().getPreviousHash();

      // if (sPreviousHash !== undefined) {
        history.go(-1);
        // sap.ui.core.routing.HashChanger.getInstance().replaceHash(sap.ui.core.routing.History.getInstance().getPreviousHash());
      // } else {
      //  this.getRouter().navTo("worklist", {}, true);
      // }
    },

    /**
     * Checks all tabs and returns the visible ones
     * @public
     * @returns {Array} Array of visible tabs
     */
    getVisibleTabs: function() {
      var oItems = this.oIconTabBar.getItems();
      var aVisibleItems = [];
      for (var i in oItems) {
        if (oItems[i].getKey && oItems[i].getVisible && oItems[i].getVisible()) {
          aVisibleItems.push(oItems[i].getKey());
        }
      }
      return aVisibleItems;
    },

    /**
     * Event handler when a value is changed in combobox. It ensures the value selected/typed is from the list
     * @param {sap.ui.base.Event} oEvent the input change event
     * @return {boolean} True if a valid entry was selected, false otherwise
     * @public
     */
    validateComboBoxChange: function(oEvent) {
      var oValidatedComboBox = oEvent.getSource(),
        sSelectedKey = oValidatedComboBox.getSelectedKey(),
        sValue = oValidatedComboBox.getValue(),
        bResult = true;

      if (!sSelectedKey && sValue) {
        oValidatedComboBox.setValueState("Error");
        oValidatedComboBox.setValueStateText("Please select a value from the list");
        oValidatedComboBox.setShowValueStateMessage(true);
        bResult = false;
      }
      else if(oValidatedComboBox.getSelectedItem() && !oValidatedComboBox.getSelectedItem().getEnabled()){
        oValidatedComboBox.setValueState("Error");
        oValidatedComboBox.setValueStateText("Value selected in not valid");
        oValidatedComboBox.setShowValueStateMessage(true);

        var oBinding = oValidatedComboBox.getBindingInfo("selectedKey");
        var comboModel = oBinding.parts[0].model;
        var comboPath = oBinding.parts[0].path;
        // comboPath = oValidatedComboBox.getBinding("selectedKey").getType().__getContextPath(oValidatedComboBox, comboModel) + comboPath;

        oValidatedComboBox.getModel(comboModel).setProperty(comboPath, "");

        bResult = false;
      }
      else {
        oValidatedComboBox.setValueState("None");
        oValidatedComboBox.setShowValueStateMessage(false);
        bResult = true;
      }
      return bResult;
    },

    /**
     * Binds the view to the contract specified in route change. It reads the contract's data and sets the JSON model.
     * @param {sap.ui.base.Event} oEvent the route change event
     * @param {boolean} isEdit whether its a Display or Edit
     * @return {Promise} a promise which will be resolved when the binding is completed.
     * @public
     */
    _bindView: function(sDocId, isEdit, isCopy) {
      return new Promise(function(fResolve, fReject) {
        var aFilters = [];
        var oViewModel = this.getModel("viewModel");

        //sap.ui.core.routing.History.getInstance().iHistoryPosition
        if(history.length < 2){
          oViewModel.setProperty("/disableBackBtn", true);
        }

        if(isEdit){
          aFilters.push(new Filter("UserAction", FilterOperator.EQ, Constants.USER_ACTION_EDIT_READ));
        }

        var aVisibleItems = this.getVisibleTabs(this.getById("iconTabBar"));
        this.oIconTabBar.setSelectedKey(aVisibleItems[0]);
        this.oIconTabBar.fireSelect();

        this.mainModel.metadataLoaded().then(function() {
          // this.getView().unbindElement();
          var sDocPath = this.mainModel.createKey("Contracts", {
            ContractNumber: sDocId
          });

          oViewModel.setProperty("/busy", true);
          oViewModel.setProperty("/isContract", true);
          // oViewModel.setProperty("/enableEdit", false);

          var mParameters = {
            urlParameters: {
              "$expand": "AccountAssignments,AdminDetails,ContractLIs,Attachments,PurchaseOrders,ApprovalDetails,ContactDetails,DeliveryAddresses,Phasings,IndigenousSubcontractors,ConsumptionSummary,ConsumptionGRs,ConsumptionIRs,Approvals,HeaderTexts"
            },
            method: "GET",
            filters: aFilters,
            success: function(oData) {
              oViewModel.setProperty("/busy", false);

              util.removeResults(oData);

              this.getModel().setData(oData);
              this.getView().bindElement({
                path: "/"
              });

              if(isCopy && this.resetDataForCopy){
                this.resetDataForCopy();
              }

              oViewModel.setProperty("/enableEdit", true);

              // /****************If SUBMITTED but not approved, only submitter can change **********/
              // if (oData.Status === Constants.STATUS_AWAITING_APPROVAL) {
              //  this.getOwnerComponent().loadUser().then(
              //    function(oUser) {
              //      if (!oUser || oUser.UserId !== oData.ChangedByID) {
              //        oViewModel.setProperty("/enableEdit", false);
              //      }
              //    }.bind(this));
              // }

              if(this.determineSON){
                this.determineSON(true);
              }
              else if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineSON){
                this.byId("CreateView").getController().determineSON(true);
              }
              if(!isCopy){
                if(this.determineDuplicate){
                  this.determineDuplicate();
                }
                else if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineDuplicate){
                  this.byId("CreateView").getController().determineDuplicate();
                }
              }

              if(this.determineInvParty){
                this.determineInvParty();
              }
              else if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineInvParty){
                this.byId("CreateView").getController().determineInvParty();
              }

              var delegateField = this.getById("delegateIDInput");
              if(delegateField){
                delegateField.setValue(oData.ApprovalDetails.DelegateID);
              }

              //displaying the name for VHs
              var vhControls = this.getView().getControlsByFieldGroupId(["CreateContractVH"]);
              for (var i in vhControls) {
                if (vhControls[i] && vhControls[i].getFieldGroupIds().indexOf("CreateContractVH") >= 0 && vhControls[i].getValue &&
                  vhControls[i].getValue()) {
                  vhControls[i].fireChange({
                    newValue: vhControls[i].getValue(),
                    initialLoad: true
                  });
                }
              }

              if(!isCopy){
                this.setConsumption(oData);
              }

              fResolve(oData);

            }.bind(this),
            error: function(oError) {
              oViewModel.setProperty("/busy", false);
              fReject(null);
              var aErrors = util.processODataError(oError, this.getResourceBundle());

              if(aErrors[0].code === Constants.LEGACY_DISPLAY_ERROR_CODE || aErrors[0].code === Constants.LEGACY_EDIT_ERROR_CODE){
                MessageBox.error(aErrors[0].message, {
                  actions: [MessageBox.Action.OK],
                  onClose: function() {
                    this.getRouter().navTo("worklist", {}, true);
                  }.bind(this)
                });
                return;
              }

              MessageBox.error(this.getResourceBundle().getText("bindview.error", [sDocId, aErrors[0].message]), {
                actions: [MessageBox.Action.OK],
                onClose: function() {
                  this.getRouter().navTo("worklist", {}, true);
                }.bind(this)
              });

            }.bind(this)
          };
          this.mainModel.read("/" + sDocPath, mParameters);
          sap.ui.getCore().getEventBus().publish("bindView", "bindView", {docId: sDocId, docPath: sDocPath});

          oViewModel.setProperty("/poTableBusy", true);
          aFilters = [new Filter("ContractNumber", FilterOperator.EQ, sDocId)];
          this.mainModel.read("/ConsumptionSummary", {
            method: "GET",
            filters: aFilters,
            success: function(oData) {
              oViewModel.setProperty("/poTableBusy", false);

              var oConsModel = new JSONModel(oData.results);
              oConsModel.setSizeLimit(5000);
              this.setModel(oConsModel, "PoTabModel");

            }.bind(this),
            error: function(oError) {
              oViewModel.setProperty("/poTableBusy", false);
              var aErrors = util.processODataError(oError, this.getResourceBundle());

              MessageBox.error(this.getResourceBundle().getText("bindview.error", [sDocId, aErrors[0].message]), {
                actions: [MessageBox.Action.OK],
                onClose: function() {
                  // this.getRouter().navTo("worklist", {}, true);
                }.bind(this)
              });

            }.bind(this)
          });


        }.bind(this));
      }.bind(this));
    },

    /**
     * Binds the view to the document specified in route change. It reads the documents data and sets the JSON model.
     * @param {sap.ui.base.Event} oEvent the route change event
     * @return {Promise} a promise which will be resolved when the binding is completed.
     * @public
     */
    _bindViewPo: function(sDocId, isEdit, isCopy) {
      return new Promise(function(fResolve, fReject) {

        var aFilters = [];
        if(isEdit){
          aFilters.push(new Filter("UserAction", FilterOperator.EQ, Constants.USER_ACTION_EDIT_READ));
        }
        var aVisibleItems = this.getVisibleTabs(this.getById("iconTabBar"));
        this.oIconTabBar.setSelectedKey(aVisibleItems[0]);
        this.oIconTabBar.fireSelect();
        var oViewModel = this.getModel("viewModel");

        if(history.length < 2){
          oViewModel.setProperty("/disableBackBtn", true);
        }
        this.mainModel.metadataLoaded().then(function() {
          // this.getView().unbindElement();
          var sDocPath = this.mainModel.createKey("PurchaseOrders", {
            PONumber: sDocId
          });

          oViewModel.setProperty("/busy", true);
          oViewModel.setProperty("/isPO", true);
          // oViewModel.setProperty("/enableEdit", false);

          var mParameters = {
            urlParameters: {
              "$expand": "AccountAssignments,PurchaseOrderLIs,Attachments,ApprovalDetails,ContactDetails,Phasings,DeliveryAddresses,ConsumptionSummary,Approvals,HeaderTexts"
            },
            method: "GET",
            filters: aFilters,
            success: function(oData) {
              oViewModel.setProperty("/busy", false);

              util.removeResults(oData);
              if(oData.IsSinglePO){
                fResolve(oData);
                return;
              }
              if(oData.ContractNumber){
                oViewModel.setProperty("/busy", true);
                //this.setModel(new JSONModel(), "ContractModel");
                //read contract details
                var sContractPath = this.mainModel.createKey("Contracts", {
                  ContractNumber: oData.ContractNumber
                });
                var mContractParameters = {
                  urlParameters: {
                    "$expand": "ContractLIs,AdminDetails,AccountAssignments"
                  },
                  method: "GET",
                  success: function(oData1) {
                    oViewModel.setProperty("/busy", false);
                    util.removeResults(oData1);

                    if(oData1.ContractLIs){
                      var liObj = this.mainModel.createEntry("/LineItems").getObject();
                      liObj.Status = "";
                      oData1.ContractLIs.unshift(liObj);
                    }
                    this.getModel("ContractModel").setData(oData1);//(new JSONModel(oData1), "ContractModel");
                    if(this.determineSON){
                      this.determineSON();
                    }
                    else if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineSON){
                      this.byId("CreateView").getController().determineSON();
                    }

                  }.bind(this),
                  error: function(oError) {
                    oViewModel.setProperty("/busy", false);

                    var aErrors = util.processODataError(oError, this.getResourceBundle(), oData.PONumber, oData.ContractNumber);

                    if(aErrors[0].code === Constants.LEGACY_DISPLAY_ERROR_CODE || aErrors[0].code === Constants.LEGACY_EDIT_ERROR_CODE){
                      MessageBox.error(aErrors[0].message, {
                        actions: [MessageBox.Action.OK],
                        onClose: function() {
                          this.getRouter().navTo("worklist", {}, true);
                        }.bind(this)
                      });
                      return;
                    }

                    MessageBox.error(this.getResourceBundle().getText("bindview.error", [sDocId, aErrors[0].message]), {
                      actions: [MessageBox.Action.OK],
                      onClose: function() {
                        this.getRouter().navTo("worklist", {}, true);
                      }.bind(this)
                    });

                  }.bind(this)
                };
                this.mainModel.read("/" + sContractPath, mContractParameters);
              }

              this.getModel().setData(oData);
              this.getView().bindElement({
                path: "/"
              });

              if(isCopy && this.resetDataForCopy){
                this.resetDataForCopy();
              }

              oViewModel.setProperty("/enableEdit", true);

              // /****************If SUBMITTED but not approved, only submitter can change **********/
              // if (oData.Status === Constants.STATUS_AWAITING_APPROVAL) {
              //  this.getOwnerComponent().loadUser().then(
              //    function(oUser) {
              //      if (!oUser || oUser.UserId !== oData.ChangedByID) {
              //        oViewModel.setProperty("/enableEdit", false);
              //      }
              //    }.bind(this));
              // }

              if(this.determineInvParty){
                this.determineInvParty();
              }
              else if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineInvParty){
                this.byId("CreateView").getController().determineInvParty();
              }

              var delegateField = this.getById("delegateIDInput");
              if(delegateField){
                delegateField.setValue(oData.ApprovalDetails.DelegateID);
              }

              //displaying the name for VHs
              var vhControls = this.getView().getControlsByFieldGroupId(["CreateContractVH"]);
              for (var i in vhControls) {
                if (vhControls[i] && vhControls[i].getFieldGroupIds().indexOf("CreateContractVH") >= 0 && vhControls[i].getValue &&
                  vhControls[i].getValue()) {
                  vhControls[i].fireChange({
                    newValue: vhControls[i].getValue(),
                    initialLoad: true
                  });
                }
              }

              fResolve(oData);

            }.bind(this),
            error: function(oError) {
              oViewModel.setProperty("/busy", false);
              fReject(null);

              var aErrors = util.processODataError(oError, this.getResourceBundle());

              if(aErrors[0].code === Constants.LEGACY_DISPLAY_ERROR_CODE || aErrors[0].code === Constants.LEGACY_EDIT_ERROR_CODE){
                MessageBox.error(aErrors[0].message, {
                  actions: [MessageBox.Action.OK],
                  onClose: function() {
                    this.getRouter().navTo("worklist", {}, true);
                  }.bind(this)
                });
                return;
              }

              MessageBox.error(this.getResourceBundle().getText("bindview.error", [sDocId, aErrors[0].message]), {
                actions: [MessageBox.Action.OK],
                onClose: function() {
                  this.getRouter().navTo("worklist", {}, true);
                }.bind(this)
              });

            }.bind(this)
          };
          this.mainModel.read("/" + sDocPath, mParameters);
          sap.ui.getCore().getEventBus().publish("bindView", "bindView", {docId: sDocId, docPath: sDocPath});


          //if this is not a Copy, read consumption data(performance improvement)
          if(!isCopy){

            oViewModel.setProperty("/consumptionBusy", true);
            mParameters = {
              urlParameters: {
                "$expand": "PurchaseOrderLIs,ConsumptionGRs,ConsumptionIRs"
              },
              method: "GET",
              filters: [new Filter("IsConsumption", FilterOperator.EQ, true)],
              success: function(oData) {
                util.removeResults(oData);

                this.setConsumption(oData);
                oViewModel.setProperty("/consumptionBusy", false);
              }.bind(this),
              error: function(oError) {
                oViewModel.setProperty("/consumptionBusy", false);
                fReject(null);

                var aErrors = util.processODataError(oError, this.getResourceBundle());

                MessageBox.error(this.getResourceBundle().getText("bindview.consumption.error", [sDocId, aErrors[0].message]), {
                  actions: [MessageBox.Action.OK]
                });

              }.bind(this)
            };
            this.mainModel.read("/" + sDocPath, mParameters);

          }
        }.bind(this));
      }.bind(this));
    },

    /**
     * Prepares the data for Consumption tab and sets it to ConsumptionModel.
     * @param {sap.ui.base.Event} oData the data for the doco
     * @public
     */
    setConsumption: function(oData){
      var oConData = {};
      oConData.LineItems = $.extend(true, {}, oData.PurchaseOrderLIs || oData.ContractLIs);
      for(var i in oConData.LineItems){
        if(oConData.LineItems[i].IsGR !== false){
          oConData.LineItems[i].ToBeDelivered = Number(oConData.LineItems[i].UnitQty) - Number(oConData.LineItems[i].DvdQuantity);
        }
        else{
          oConData.LineItems[i].DvdQuantity = 0;
          oConData.LineItems[i].ToBeDelivered = 0;
        }
        oConData.LineItems[i].ToBeInvoiced = Number(oConData.LineItems[i].UnitQty) - Number(oConData.LineItems[i].InvQuantity);
      }

      oConData.Consumptions = [];
      var oConsumption = {};

      for(i in oData.ConsumptionGRs){
        oConsumption = $.extend(true, {}, oData.ConsumptionGRs[i]);
        oConsumption.Type = "GR";
        oConsumption.Reference = oConsumption.DocNumber;
        oConData.Consumptions.push(oConsumption);
      }

      for(i in oData.ConsumptionIRs){
        oConsumption = $.extend(true, {}, oData.ConsumptionIRs[i]);
        oConsumption.Type = "IR";
        oConData.Consumptions.push(oConsumption);
      }
      var oModel = new JSONModel(oConData);
      oModel.setSizeLimit(10000);
      this.setModel(oModel, "ConsumptionModel");
    },

    //Config based filter functions
    onFilterClick: function(oEvent) {
      var sDialogName = oEvent.getSource().data().dlgName;
      var filterConfigData = this.getModel("filterConfigModel").getData();
      var filterConfig = filterConfigData[sDialogName];

      if (!sDialogName || !filterConfig) {
        return;
      }
      var oComponenet = this.getOwnerComponent();
      var oResourceBundle = this.getResourceBundle();

      var oDialog = oComponenet.filterDialogs[sDialogName];
      if (!oDialog) {
        oDialog = sap.ui.xmlfragment(this.createId(sDialogName), "fss.ssp.view.fragments.filterDlg", this);
        oEvent.getSource().addDependent(oDialog);
        var filterModel = new JSONModel({});
        oDialog.setModel(filterModel, "filterModel");
        oDialog.addCustomData(new sap.ui.core.CustomData({
          key: "dlgName",
          value: sDialogName
        }));

        var keyCodes = sap.ui.requireSync("sap/ui/events/KeyCodes");
        oDialog.attachBrowserEvent("keydown", function(evt) {
          //add an event handler so that user can use ENTER to search
          if (evt.keyCode === keyCodes.ENTER) {
            evt.stopImmediatePropagation();
            evt.preventDefault();
            if (oDialog.getBeginButton()) {
              oDialog.getBeginButton().firePress();
            }
          }
        });

        oDialog.setModel(new JSONModel({
          "dlgName": sDialogName,
          "tabelName": oEvent.getSource().data().tabelName
        }), "displayModel");
        oComponenet.filterDialogs[sDialogName] = oDialog;

        var oForm = new sap.ui.layout.form.SimpleForm({
          editable: true,
          layout: "ColumnLayout",
          columnsM: 2,
          columnsL: 2,
          columnsXL: 2,
          labelSpanXL: 3,
          labelSpanL: 4,
          labelSpanM: 3
        });

        for (var fieldName in filterConfig.fieldList) {
          if (!filterConfig.fieldList[fieldName]) {
            continue;
          }

          //if the field is filterable
          if (filterConfig.fieldList[fieldName].filterOperator && filterConfig.fieldList[fieldName].label) {
            var oControl = null;
            var label = oResourceBundle.getText(filterConfig.fieldList[fieldName].label);
            var placeHolder = oResourceBundle.getText(filterConfig.fieldList[fieldName].placeholderLabel || filterConfig.fieldList[fieldName]
              .label);
            placeHolder = oResourceBundle.getText("filter." + filterConfig.fieldList[fieldName].filterOperator + ".placeholder", [
              placeHolder
            ]);
            oForm.addContent(new sap.m.Label({
              text: label
            }));

            if (filterConfig.fieldList[fieldName].hasOwnProperty("default")) {
              filterModel.setProperty("/" + fieldName, filterConfig.fieldList[fieldName].default);
            }
            switch (filterConfig.fieldList[fieldName].controlType) {
              case "boolean":
                oControl = new sap.m.CheckBox({
                  selected: "{filterModel>/" + fieldName + "}"
                });
                break;

              case "range":
                if (filterConfig.fieldList[fieldName].type === "date") {
                  oControl = new sap.m.DateRangeSelection({
                    dateValue: "{path: 'filterModel>/" + fieldName + "_FROM', formatOptions: {pattern:'dd.MM.yyyy', strictParsing:true, UTC: true}}",
                    secondDateValue: "{path: 'filterModel>/" + fieldName + "_TO', formatOptions: {pattern:'dd.MM.yyyy', strictParsing:true, UTC: true}}",
                    displayFormat: "dd.MM.yyyy",
                    valueFormat: "dd.MM.yyyy"
                  });
                } else {
                  oControl = new sap.m.Input({
                    value: "{filterModel>/" + fieldName + "_FROM}",
                    maxLength: {
                      path: (filterConfig.modelName ? filterConfig.modelName + ">" : "") + filterConfig.entitySet + "/" + fieldName +
                        "/0/#@maxLength",
                      formatter: formatter.fieldLengthFormatter
                    },
                    type: filterConfig.fieldList[fieldName].type === "number" ? sap.m.InputType.Number : sap.m.InputType.Text,
                    placeholder: "From",
                    valueLiveUpdate: true
                  });
                  oForm.addContent(oControl);
                  oControl = new sap.m.Input({
                    value: "{filterModel>/" + fieldName + "_TO}",
                    maxLength: {
                      path: (filterConfig.modelName ? filterConfig.modelName + ">" : "") + filterConfig.entitySet + "/" + fieldName +
                        "/0/#@maxLength",
                      formatter: formatter.fieldLengthFormatter
                    },
                    type: filterConfig.fieldList[fieldName].type === "number" ? sap.m.InputType.Number : sap.m.InputType.Text,
                    placeholder: "To",
                    valueLiveUpdate: true
                  });
                }
                break;

              case "comboBox":
                oControl = new sap.m.Select({
                  selectedKey: "{path: 'filterModel>/" + fieldName + "'}",
                  items: {
                    path: filterConfig.fieldList[fieldName].items,
                    sorter: filterConfig.fieldList[fieldName].itemsSorter ? new sap.ui.model.Sorter(
                                  {path: filterConfig.fieldList[fieldName].itemsSorter.path,
                                  descending:filterConfig.fieldList[fieldName].itemsSorter.descending}) : "",
                    template: new sap.ui.core.Item({
                      key: {
                        path: filterConfig.fieldList[fieldName].itemKey
                      },
                      text: {
                        parts: [{
                          path: filterConfig.fieldList[fieldName].itemKey
                        }, {
                          path: filterConfig.fieldList[fieldName].itemValue
                        }],
                        formatter: formatter[filterConfig.fieldList[fieldName].formatter] ? formatter[filterConfig.fieldList[fieldName].formatter]
                          .bind(this) : formatter.valueHelpDisplay.bind(this)
                      }
                    })
                  }

                });
                break;

              default:
                oControl = new sap.m.Input({
                  value: "{filterModel>/" + fieldName + "}",
                  maxLength: {
                    path: (filterConfig.modelName ? filterConfig.modelName + ">" : "") + filterConfig.entitySet + "/" + fieldName +
                      "/0/#@maxLength",
                    formatter: formatter.fieldLengthFormatter
                  },
                  placeholder: placeHolder,
                  type: filterConfig.fieldList[fieldName].type === "number" ? sap.m.InputType.Number : sap.m.InputType.Text,
                  valueLiveUpdate: true
                });
                break;
            }
            if (oControl) {
              oForm.addContent(oControl);
            }

          }
        }

        oDialog.addContent(oForm);
      } else {
        oDialog.setModel(oEvent.getSource().getModel());
      }
      oDialog.open();

    },

    onFilterOK: function(oEvent) {
      var sDlgName = oEvent.getSource().getModel("displayModel").getProperty("/dlgName");
      var oDialog = this.getOwnerComponent().filterDialogs[sDlgName];

      var oFilterModel = oDialog.getModel("filterModel");
      var oFilterData = oFilterModel.getData();
      var oTable = this.byId(oEvent.getSource().getModel("displayModel").getProperty("/tabelName"));
      var aFilters = [];
      var oFilter, sDataField;
      var filterConfigData = this.getModel("filterConfigModel").getData();
      var vhConfig = filterConfigData[sDlgName];
      var to, from, sFilterFieldName;
      var fromFilter, toFilter;

      for (var oFilterItem in oFilterData) {
        oFilter = null;
        if ((oFilterData[oFilterItem] || oFilterData[oFilterItem] === false) && oFilterData[oFilterItem] !== "" && oFilterData[oFilterItem] !==
          undefined) {
          //Remove FROM and TO if this is a range filter
          sFilterFieldName = oFilterItem;
          sDataField = oFilterItem.replace("_FROM", "").replace("_TO", "");
          if (vhConfig.fieldList[sDataField].type === "number" && oFilterData[oFilterItem]) {
            oFilterData[oFilterItem] = Number(oFilterData[oFilterItem]);
          }
          if (oFilterItem.indexOf("_FROM") > -1) {
            to = oFilterItem.replace("_FROM", "_TO");
            sFilterFieldName = sFilterFieldName.replace("_FROM", "");
            // if(oFilterData[to]){
            if (oFilterData[to] && oFilterData[to] && Number(oFilterData[oFilterItem]) > Number(oFilterData[to])) {
              MessageBox.error(this.getResourceBundle().getText(vhConfig.fieldList[sFilterFieldName].label) +
                this.getResourceBundle().getText("fromMoreThanTo.error"), {
                  actions: [MessageBox.Action.OK]
                });
              return;
            }
            if (vhConfig.fieldList[sDataField].type === "number" && oFilterData[to]) {
              oFilterData[to] = Number(oFilterData[to]);
            }

            fromFilter = oFilterData[oFilterItem];
            toFilter = oFilterData[to];
            if(fromFilter.getTimezoneOffset && fromFilter.getTimezoneOffset() !== 0){
              fromFilter = new Date(fromFilter);
              fromFilter.setUTCDate(fromFilter.getDate());
              fromFilter.setUTCHours(0);
            }

            if(toFilter.getTimezoneOffset && toFilter.getTimezoneOffset() !== 0){
              toFilter = new Date(toFilter);
              toFilter.setUTCDate(toFilter.getDate());
              toFilter.setUTCHours(0);
            }
            oFilter = new Filter(sFilterFieldName, FilterOperator.BT, fromFilter || null, toFilter || null);

          } else if (oFilterItem.indexOf("_TO") > -1) {
            from = oFilterItem.replace("_TO", "_FROM");
            sFilterFieldName = sFilterFieldName.replace("_TO", "");


            fromFilter = oFilterData[from];
            toFilter = oFilterData[oFilterItem];
            if(fromFilter.getTimezoneOffset && fromFilter.getTimezoneOffset() !== 0){
              fromFilter = new Date(fromFilter);
              fromFilter.setUTCDate(fromFilter.getDate());
              fromFilter.setUTCHours(0);
            }

            if(toFilter.getTimezoneOffset && toFilter.getTimezoneOffset() !== 0){
              toFilter = new Date(toFilter);
              toFilter.setUTCDate(toFilter.getDate());
              toFilter.setUTCHours(0);
            }

            //if from field exists, this was handled by FROM above
            if (!oFilterData[from]) {
              oFilter = new Filter(sFilterFieldName, FilterOperator.BT, fromFilter || null, toFilter || null);
            }
          } else {
            oFilter = new Filter(sFilterFieldName, FilterOperator[vhConfig.fieldList[oFilterItem].filterOperator], oFilterData[oFilterItem]);
          }
          if (oFilter) {
            aFilters.push(oFilter);
          }

        }
      }

      oFilter = aFilters.length > 1 ? [new Filter({
        filters: aFilters,
        and: true
      })] : aFilters;

      if (oTable.bindItems) {
        oTable.getBinding("items").filter(oFilter);
      }

      oDialog.close();
    },

    onFilterCancel: function(oEvent) {
      var sDlgName = oEvent.getSource().getModel("displayModel").getProperty("/dlgName");
      if (this.getOwnerComponent().filterDialogs[sDlgName]) {
        this.getOwnerComponent().filterDialogs[sDlgName].close();
      }
    },

  });

});