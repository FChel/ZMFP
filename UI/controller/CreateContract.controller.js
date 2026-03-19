sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "fss/ssp/model/formatter",
  "sap/m/MessageBox",
  "fss/ssp/model/util",
  "fss/ssp/model/Constants"
], function(BaseController, JSONModel, Filter, FilterOperator, formatter, MessageBox, util, Constants) {
  "use strict";

  /**
   * This controller manages the behaviour for create/edit functionality of a Contract. It performs the validation and also submits data to oData services.
   */
  return BaseController.extend("fss.ssp.controller.CreateContract", {

    formatter: formatter,

    /**
     * Called when a controller is instantiated and its View controls (if available) are already created.
     * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
     * @memberOf fss.ssp.view.CreateContract
     */
    onInit: function() {
      this.busyDialog = this.getById(this.createId("createBusyDlg"));
      if(!this.busyDialog){
        this.busyDialog = new sap.m.BusyDialog(this.createId("createBusyDlg"));
      }
      this.oIconTabBar = this.getById("iconTabBar");
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.setModel(this.mainModel, "mainModel");
      this.setModel(new JSONModel({}), "viewModel");
      var createModel = new JSONModel({});
      createModel.setSizeLimit(5000);
      createModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
      this.setModel(createModel);
      this.setModel(new JSONModel({}), "ErrorModel");
      this.getRouter().attachRouteMatched(this._onRouteMatched, this);
      this.setDefaultValues();
      util.setDefaultPlacementTextVH(this.getView().getContent(), this);
    },

    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      this.mainEntitySet = "Contracts";
      this.mainLiEntitySet = "ContractLIs";
      this.mainEntityKey = "ContractNumber";
    },


    /**
     * Navigates through all tabs and prepares a list of REQUIRED fields per tab.
     */
    prepareRequiredList: function(){
      if(!this.requiredControls){
        this.requiredControls = {};
        var oTabs = this.oIconTabBar.getItems();

        for(var i in oTabs){
          if(oTabs[i].getKey){
            this.requiredControls[oTabs[i].getKey()] = [];
            util.getRequiredControls(oTabs[i].getContent(), this.requiredControls[oTabs[i].getKey()]);
          }
        }
      }
    },

    /**
     * Resets value states for all tabs, their required fields and resets tne error model.
     */
    clearValueStates: function(){
      util.clearRequiredControls(this.requiredControls, this.getView());
      util.clearTabsValueState(this.oIconTabBar);
      var oErrorModel = this.getModel("ErrorModel");
      if(oErrorModel){
        oErrorModel.setProperty("/errors", []);
        oErrorModel.updateBindings(true);
      }
    },

    /**
     * Performs the UI side validation. First it checks all mandatory fields are filled.
     * Then checks some other business rules. If there are any errors, errorModel is updated and the
     * list is displayed
     * @param {boolean} bIgnoreWarning if true, UI warnings will be ignored
     * @returns {boolean} ture if validation is successful, false otherwise
     */
    validateEntryUI: function(bIgnoreWarning){
      var bResult = true;
      this.prepareRequiredList();

      this.clearValueStates();
      var oResourceBundle = this.getResourceBundle();
      var oErrorList = {};
      var aErrors = this.getModel("ErrorModel").getProperty("/errors");
      var aVisTabs = this.getVisibleTabs();

      for(var i in aVisTabs){
        if(this.requiredControls[aVisTabs[i]]){
          oErrorList[aVisTabs[i]] = [];
          bResult = util.checkRequiredControls(this.requiredControls[aVisTabs[i]], oErrorList[aVisTabs[i]], this.getView()) && bResult;
        }
      }
      if(!bResult){
        aErrors.push({message: oResourceBundle.getText("validation.error.mandatory"),
                type: sap.ui.core.MessageType.Error });
      }

      util.setTabsValueState(oErrorList, this.oIconTabBar);

      var obj = this.getView().getBindingContext().getObject();
      if(!obj[this.mainLiEntitySet] || obj[this.mainLiEntitySet].length === 0){
        aErrors.push({message: oResourceBundle.getText("validation.error.noLineItem"),
                type: sap.ui.core.MessageType.Error });
      }
      else{
        var currType = new fss.ssp.CustomTypes.CustomCurrency({showMeasure: false}, {minimum: 0});
        var iAmtTotal = 0, iPercTotal = 0, iQtyTotal = 0;
        var aLi = obj[this.mainLiEntitySet];
        var aAssignments;
        for(i in aLi){
          if(aLi[i].Status !== Constants.STATUS_LI_DRAFT){
            try{
              currType.validateValueCustom([aLi[i].UnitPrice, aLi[i].Currency]);
            }
            catch(exception){
              aErrors.push({message: oResourceBundle.getText("validation.error.netPriceFormat", formatter.lineNumberFormatter([aLi[i].LineNumber])),
                  type: sap.ui.core.MessageType.Error });
            }
          }

          if(aLi[i].Distribution !== "0"){
            iAmtTotal = 0;
            iPercTotal = 0;
            iQtyTotal = 0;
            aAssignments = this.getAssignmentsForLine(aLi[i].LineNumber);

            if(aAssignments.length === 1){
              aErrors.push({message: this.getResourceBundle().getText("assignment.count.validation", [aLi[i].LineNumber]),
                type: sap.ui.core.MessageType.Error });
            }
            for(var j in aAssignments){
              iAmtTotal += Number(aAssignments[j].Amount || null);
              iPercTotal += Number(aAssignments[j].Percentage || null);
              iQtyTotal += Number(aAssignments[j].Quantity || null);
            }
            iAmtTotal = Number(iAmtTotal.toFixed(3));
            iPercTotal = Number(iPercTotal.toFixed(1));
            iQtyTotal = Number(iQtyTotal.toFixed(3));

            if(aLi[i].Distribution === "1" && iQtyTotal !== Number(aLi[i].UnitQty || null) ){
              aErrors.push({message: this.getResourceBundle().getText("assignment.quantity.validation", [aLi[i].UnitQty, aLi[i].LineNumber]),
                type: sap.ui.core.MessageType.Error });
            }
            if(aLi[i].Distribution === "2" && iPercTotal !== 100){
              aErrors.push({message: this.getResourceBundle().getText("assignment.percentage.validation", [aLi[i].LineNumber]),
                type: sap.ui.core.MessageType.Error } );
            }
            if(aLi[i].Distribution === "3" && iAmtTotal !== Number(aLi[i].UnitQty || null) * Number(aLi[i].UnitPrice || null)){
              aErrors.push({message: this.getResourceBundle().getText("assignment.amount.validation",
                  [Number(aLi[i].UnitQty || null) * Number(aLi[i].UnitPrice || null), aLi[i].LineNumber]),
                type: sap.ui.core.MessageType.Error } );
            }

          }

        }
      }
      var uploadCol = this.getById("uploadCollection");
      if(this.getById("attachmentMsgList").getVisible() && (!uploadCol.getItems() || uploadCol.getItems().length === 0)){
        aErrors.push({message: oResourceBundle.getText("validation.error.noAttachment"),
                type: sap.ui.core.MessageType.Error });
      }

      // var uploadCollection = this.getById("uploadCollection");

      // if(uploadCollection._aFileUploadersForPendingUpload.length > 0){
      //  for(var k in uploadCollection.getItems()){
      //    //if it's a new file
      //    if(!uploadCollection.getItems()[k].getDocumentId()){
      //      try{
      //        util.isValidFilename(uploadCollection.getItems()[k].getFileName());
      //      }
      //      catch(exception){
      //        aErrors.push({message: exception.message, type: sap.ui.core.MessageType.Error});
      //      }
      //    }
      //  }
      // }




      if(obj.AdminDetails && (obj.AdminDetails.QuoteInvitationCount || obj.AdminDetails.QuoteInvitationCount === 0) && obj.AdminDetails.QuoteReceivedCount && obj.AdminDetails.QuoteInvitationCount < obj.AdminDetails.QuoteReceivedCount){
        aErrors.push({message: oResourceBundle.getText("validation.error.quoteCount"),
                type: sap.ui.core.MessageType.Error });
      }

      if(obj.StartDate && obj.EndDate && obj.StartDate > obj.EndDate){
        aErrors.push({message: oResourceBundle.getText("validation.error.startEndDate"),
                type: sap.ui.core.MessageType.Error });
      }
      var sUserId = this.getModel("viewModel").getProperty("/UserId");
      if(obj.ApprovalDetails.ApproverID && sUserId && sUserId === obj.ApprovalDetails.ApproverID){
        aErrors.push({message: oResourceBundle.getText("validation.error.userSameApprover"),
                type: sap.ui.core.MessageType.Error });
      }

      if(obj.ApprovalDetails.DelegateID && sUserId && sUserId === obj.ApprovalDetails.DelegateID){
        aErrors.push({message: oResourceBundle.getText("validation.error.userSameApprover"),
                type: sap.ui.core.MessageType.Error });
      }


      // var sTotalLinesInc = this.getModel("viewModel").getProperty("/totalInc");
      // sTotalLinesInc = formatter.currencyValueNumber(sTotalLinesInc, obj.Currency);

      //check Assignments for each LI are valid






      try{
        var oController = this.getView().byId("CreateView").byId("CreateLIView").getController();
        oController.validateAllEntries(aErrors);
      }
      catch(exception){

      }

      try{
        oController = this.getView().byId("CreateView").byId("CreateContactView").getController();
        oController.validateAllEntries(aErrors);
      }
      catch(exception){

      }

      try{
        oController = this.getView().byId("CreateView").byId("CreateAssignmentView").getController();
        oController.validateAllEntries(aErrors);
      }
      catch(exception){

      }

      var sPath = util.getContextPath(this.getView());
      var aLIs = this.getModel().getProperty(sPath + this.mainLiEntitySet);

      for(i in aLIs){
        if(aLIs[i].Status === Constants.STATUS_LI_DRAFT){
          aErrors.push({message: oResourceBundle.getText("validation.error.draftLIs"),
                type: sap.ui.core.MessageType.Error });
          break;
        }
      }

      var bHasService = false;
      var bHasUnknown = false;
      for(i in aLIs){
        if(aLIs[i].ESP && aLIs[i].ESP !== "NONSERVICE" && aLIs[i].Status !== Constants.STATUS_LI_DELETED){
          bHasService = true;
        }
        if(aLIs[i].AssignmentTypeCode === "U" && aLIs[i].Status !== Constants.STATUS_LI_DELETED){
          bHasUnknown = true;
        }
      }

      if(obj.AdminDetails && obj.AdminDetails.IsContractorConsultant === "Y" && !bHasService && !bHasUnknown ){
        aErrors.push({message: oResourceBundle.getText("validation.error.serviceESP"),
                type: sap.ui.core.MessageType.Error });
      }

      if(obj.AdminDetails && obj.AdminDetails.IsContractorConsultant !== "Y" && bHasService ){
        aErrors.push({message: oResourceBundle.getText("validation.error.nonServiceESP"),
                type: sap.ui.core.MessageType.Error });
      }

      // if(obj.TotalValue && sTotalLinesInc && (obj.TotalValue < sTotalLinesInc)){
      //  aErrors.push({message: oResourceBundle.getText("validation.error.totalValue"),
      //          type: sap.ui.core.MessageType.Error });
      // }

      // if(!bIgnoreWarning  && obj.TotalValue && sTotalLinesInc && (obj.TotalValue > sTotalLinesInc)){
      //  aErrors.push({message: oResourceBundle.getText("validation.warning.totalValue"),
      //          type: sap.ui.core.MessageType.Warning });
      // }

      bResult = aErrors.findIndex(function(error) {
                  return error.type === sap.ui.core.MessageType.Error ;
              }) < 0;//aErrors.length === 0;
      if(!bResult){
        this.getModel("ErrorModel").updateBindings(true);
        var errorBtn = this.getById("errorBtn");
        this.showErrorPopover(errorBtn);
      }

      return bResult;
    },

    /**
     * Performs data submission to Contracts entiry using data and call backs passed to it
     * @param {Object} data to be submitted
     * @param {function} fSuccess success call back function
     * @param {function} fError error call back function
     * @public
     */
    _submitData: function(data, fSuccess, fError){
      util.removeMetadata(data);
      util._escapeDecimals(data);

      if(this.getModel("viewModel").getProperty("/isPO")){
        delete data.ContractLIs;
      }
      // this.cleanAddressFields(data);

      this.mainModel.create("/" + this.mainEntitySet, data, {
        success: fSuccess,
        error: fError,
        async: true
        });

    },


    resolveAddresses: function(oData){
      var oViewModel = this.getModel("viewModel");

      //if it's not a PO or L4L, or if "Add the same" is not ticked, return
      if((!oViewModel.getProperty("/isPO") && !oData.IsSinglePO) || !oData.IsSameAddressForAll){
        return;
      }

      if(!this.byId("CreateView") || !this.byId("CreateView").byId("CreateContactView")){
        return;
      }

      this.byId("CreateView").byId("CreateContactView").getController().applySameAddress(oData);
    },
    /**
     * Clears data fileds not related to selected Address Type.
     * @param {data} data screen's data
     * @public
     */
    // cleanAddressFields: function(data){
    //  // var oAddressData = data.DeliveryAddresses;
    //  // if(!oAddressData){
    //  //  return;
    //  // }

    //  // var sDeliveryType = oAddressData.DeliveryType;
    //  // if(!sDeliveryType){
    //  //  return;
    //  // }

    //  // var aAddressControls = this.getView().getControlsByFieldGroupId(["AddressFields"]);

    //  // var bindingPath;

    //  // for (var i in aAddressControls) {
    //  //  //if field is an address field but not for the selected delivery type.
    //  //  if (aAddressControls[i] && aAddressControls[i].getFieldGroupIds().indexOf("AddressFields") >= 0 &&
    //  //        aAddressControls[i].getFieldGroupIds().indexOf(sDeliveryType) < 0){

    //  //    bindingPath = "";

    //  //    //there are 2 types of Controls. If they have a value, erase their binding data
    //  //    if(aAddressControls[i].getSelectedKey && aAddressControls[i].getSelectedKey()){
    //  //      bindingPath = aAddressControls[i].getBinding("selectedKey").getPath();
    //  //    }
    //  //    else if(aAddressControls[i].getValue && aAddressControls[i].getValue()){
    //  //      bindingPath = aAddressControls[i].getBinding("value").getPath();
    //  //    }

    //  //    //set the corresponding filed to null in data
    //  //    if(bindingPath){
    //  //      oAddressData[bindingPath.replace("ContactDetails/", "")] = null;
    //  //    }
    //  //  }
    //  // }
    // },

    /**
     * Event handler when Submit button gets pressed. It manages the data and responses.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSubmitPress: function(oEvent){
      if(this.getById("delegateIDInput").getBusy()){
          return;
      }

      //if validation does not pass, do not submit
      if(!this.validateEntryUI(true)){
        return;
      }

      var data = $.extend(true, {}, this.getModel().getData());
      // data.IsDraft = false;
      data.UserAction = Constants.USER_ACTION_SUBMIT;
      this.resolveAddresses(data);

      var viewModel = this.getModel("viewModel");

      var oResourceModel = this.getResourceBundle();
      this.busyDialog.setTitle(oResourceModel.getText("submit.busy.title"));
      this.busyDialog.setText(oResourceModel.getText("submit.busy.text"));
      this.busyDialog.open();
      // viewModel.setProperty("/busy", true);

      var fSuccess = function(oData, response) {
        var docNumber = oData[this.mainEntityKey];
        var sPath = util.getContextPath(this.getView());
        this.getModel().setProperty(sPath + this.mainEntityKey, docNumber);
        this.getModel().setProperty(sPath + "RequestID", oData.RequestID);
        this.getModel().setProperty(sPath + "Status", oData.Status);
        this.getModel().setProperty(sPath + "StatusDesc", oData.StatusDesc);
        this.getModel().setProperty(sPath + "StatusDescLong", oData.StatusDescLong);

        var sPrfUrl = oData.PRFURLEdit;

        var uploadCollection = this.getById("uploadCollection");
        var url = oData.__metadata.uri + "/Attachments";
        uploadCollection.setUploadUrl(url);
        uploadCollection.attachmentPromise = jQuery.Deferred();

        if(uploadCollection._aFileUploadersForPendingUpload.length === 0){
          uploadCollection.attachmentPromise.resolve();
        }
        else{
          uploadCollection.attachmentCount = 0;
          uploadCollection.upload();
        }

                uploadCollection.attachmentPromise.then(function(){

          uploadCollection.attachmentPromise = null;
          uploadCollection.destroyItems();
          uploadCollection.removeAllAggregation("items");

          var message = oResourceModel.getText("submit.success.msg", [docNumber]);
          var messagePrf;
          //check if PRF is triggered
          if(sPrfUrl){
            messagePrf = oResourceModel.getText("prf.trigger.msg");
          }

          var docObj = {};
          docObj[this.mainEntityKey] = docNumber;
          var sDocPath = this.mainModel.createKey(this.mainEntitySet, docObj);
          url = "/" + sDocPath + "/Attachments";

          var attachReadPromise = jQuery.Deferred();
          //read attachments after upload is complete
          this.readAttachments(url, attachReadPromise);
          attachReadPromise.then(function(attachData){
            this.busyDialog.close();

            this.getModel().getData().Attachments = attachData;
            this.getModel().updateBindings();

            var oRating = this.getModel("searchHelpModel").createEntry("/FeedbackRatings").getObject();
            oRating.Rating = 0;
            oRating.Comments = "";
            oRating.SourceApp = Constants.APP_KEY;
            oRating.SourceKey = docNumber;
            var oRateModel = new JSONModel(oRating);
            var oDisplayModel = new JSONModel({prfUrl: sPrfUrl, message: message, messagePrf: messagePrf});
            if (!this.ratingDlg) {
              this.ratingDlg = sap.ui.xmlfragment(this.createId("ratingDlg"), "fss.ssp.view.fragments.ratingDlg", this);
              this.getView().addDependent(this.ratingDlg);
            }
            this.ratingDlg.setModel(oRateModel);
            this.ratingDlg.setModel(oDisplayModel, "displayModel");
            this.ratingDlg.open();

            //KEEP AS AN EXAMPLE FOR OPENNING PRF IN A DIALOG
            // MessageBox.success(message,{
            //  title: "Success",
            //  onClose: function() {
            //    if(sPrfUrl){
            //      // if(!this.prfDlg){
            //      //  this.prfDlg = sap.ui.xmlfragment(this.createId("prfDlg"), "fss.ssp.view.fragments.prfDlg", this);
            //      //  this.prfDlg.setModel(new JSONModel({}));
            //      //  this.getView().addDependent(this.prfDlg);
            //      // }
            //      // this.prfDlg.getModel().setData({url:sPrfUrl});
            //      // this.prfDlg.open();
            //      var sUrl = formatter.escapePRFUrl(sPrfUrl);
            //      sap.m.URLHelper.redirect(sUrl, true);
            //    }
            //    this.getRouter().navTo("worklist", {}, true);

            //  }.bind(this)
            // });
          }.bind(this));
                }.bind(this));

      }.bind(this);

      var fError = function(oError){
        // viewModel.setProperty("/busy", false);
        this.busyDialog.close();

        var aErrors = util.processODataError(oError, this.getResourceBundle());

        aErrors = this.getModel("ErrorModel").getProperty("/errors").concat(aErrors);

        this.getModel("ErrorModel").setProperty("/errors", aErrors );
        viewModel.setProperty("/enableSubmit", false);
        var errorBtn = this.getById("errorBtn");
        this.showErrorPopover(errorBtn);

      }.bind(this);

      this._submitData(data, fSuccess, fError);

    },

    onRatingOkPressed: function(oEvent){
      var ratingPromise = jQuery.Deferred();
      var oDisplay = oEvent.getSource().getModel("displayModel").getData();
      var oRating = oEvent.getSource().getModel().getData();
      this.ratingDlg.setBusy(true);

      if(oDisplay.prfUrl){
        var sUrl = formatter.escapePRFUrl(oDisplay.prfUrl);
        sap.m.URLHelper.redirect(sUrl, true);
      }

      if(!oRating.Rating && !oRating.Comments){
        ratingPromise.resolve();
      }
      else{
        util.removeMetadata(oRating);
        oRating.Rating += "";
        this.getModel("searchHelpModel").create("/FeedbackRatings", oRating, {
          success: function(oData){
            ratingPromise.resolve();
          }.bind(this),
          error: function(oData){
            ratingPromise.resolve();
          }.bind(this)
          });
        setTimeout(function(){ ratingPromise.resolve(); }, 700);
      }

      ratingPromise.then(function(){
        this.ratingDlg.setBusy(false);
        this.ratingDlg.close();
        this.getRouter().navTo("worklist", {}, true);
      }.bind(this));
    },

    /**
     * Event handler for PRF's after open event. It sets the URL for the iframe and its properties.
     * @param {sap.ui.base.Event} oEvent the after open event
     * @public
     */
    onAfterPrfOpen: function(oEvent){
      var iFrame = this.byId(sap.ui.core.Fragment.createId("prfDlg", "prfIFrame"));
      // iFrame.attachBrowserEvent("unload", function(oEvent){MessageBox.warning( ); }.bind(this));
      var oFrameContent = iFrame.$()[0];
      var sUrl = oEvent.getSource().getModel().getData().url;
      if(!sUrl){
        return;
      }
      oFrameContent.setAttribute("src", sUrl);
      oFrameContent.setAttribute("height", oEvent.getSource().$().height() - 15);
      oFrameContent.setAttribute("width", oEvent.getSource().$().width() - 15);
    },

    /**
     * Event handler for PRF dialog cancel button press event. It closes the dialog and destroys the iframe.
     * @param {sap.ui.base.Event} oEvent the after open event
     * @public
     */
    onPrfCancel: function(oEvent){
      this.prfDlg.close();
      var iFrame = this.byId(sap.ui.core.Fragment.createId("prfDlg", "prfIFrame"));
      iFrame.destroy();
      this.prfDlg.destroy();
      this.prfDlg = null;
      this.getRouter().navTo("worklist", {}, true);
    },

    /**
     * Event handler when Save Draft button gets pressed. It manages the data and responses.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @param {Object} oParameters list of parameters passed to this function. Its used for Assignee and Validate situations
     * @public
     */
    onDraftPress: function(oEvent, oParameters){
      this.prepareRequiredList();
      this.clearValueStates();

      var data = $.extend(true, {}, this.getModel().getData());
      // data.IsDraft = true;
      data.UserAction = Constants.USER_ACTION_DRAFT;//Save draft user action
      var oResourceModel = this.getResourceBundle();
      this.busyDialog.setTitle(oResourceModel.getText("draft.busy.title"));
      this.busyDialog.setText(oResourceModel.getText("draft.busy.text"));

      if(oParameters && oParameters.assignee){
        data.UserAction = Constants.USER_ACTION_REASSIGN;//Draft reassign action
        data.DraftAssigneeID = oParameters.assignee;
        this.busyDialog.setTitle(oResourceModel.getText("assignee.busy.title"));
        this.busyDialog.setText(oResourceModel.getText("assignee.busy.text"));
      }
      else if(oParameters && oParameters.validate){
        data.UserAction = Constants.USER_ACTION_VALIDATE;//Validate action
        this.busyDialog.setTitle(oResourceModel.getText("validate.busy.title"));
        this.busyDialog.setText(oResourceModel.getText("validate.busy.text"));
        this.resolveAddresses(data);
      }

      var viewModel = this.getModel("viewModel");

      this.busyDialog.open();
      // viewModel.setProperty("/busy", true);

      var fSuccess = function(oData, response) {

        if(oParameters && oParameters.validate){
          this.busyDialog.close();
          var selectedKey = this.oIconTabBar.getSelectedKey();
          if(selectedKey === "approvalsTab"){
            viewModel.setProperty("/enableSubmit", true);
          }
          // viewModel.setProperty("/busy", false);
          MessageBox.success(oResourceModel.getText("validation.success"));
          return;
        }

        var docNumber = oData[this.mainEntityKey];
        var sPath = util.getContextPath(this.getView());
        this.getModel().setProperty(sPath + this.mainEntityKey, docNumber);
        this.getModel().setProperty(sPath + "RequestID", oData.RequestID);
        this.getModel().setProperty(sPath + "Status", oData.Status);
        this.getModel().setProperty(sPath + "StatusDesc", oData.StatusDesc);
        this.getModel().setProperty(sPath + "StatusDescLong", oData.StatusDescLong);

        data = $.extend(true, {}, oData);

        var uploadCollection = this.getById("uploadCollection");
        var url = oData.__metadata.uri + "/Attachments";
        uploadCollection.setUploadUrl(url);
        uploadCollection.attachmentPromise = jQuery.Deferred();
        if(uploadCollection._aFileUploadersForPendingUpload.length === 0){
          uploadCollection.attachmentPromise.resolve();
        }else{
          uploadCollection.attachmentCount = 0;
          uploadCollection.upload();
        }

                uploadCollection.attachmentPromise.then(function(){


          // uploadCollection._aFileUploadersForPendingUpload = [];
          uploadCollection.destroyItems();
          uploadCollection.removeAllAggregation("items");
          uploadCollection.attachmentPromise = null;

          var docObj = {};
          docObj[this.mainEntityKey] = docNumber;
          var sDocPath = this.mainModel.createKey(this.mainEntitySet, docObj);

          url = "/" + sDocPath + "/Attachments";

          var attachReadPromise = jQuery.Deferred();
          //read attachments after upload is complete
          this.readAttachments(url, attachReadPromise);
          attachReadPromise.then(function(attachData){
                      this.getModel().getData().Attachments = attachData;
                      this.getModel().updateBindings();
                      this.busyDialog.close();
            if(oParameters && oParameters.assignee){
            /************  need to navigate to worklist.    ***********/
              MessageBox.success(oResourceModel.getText("draft.reassign.success.msg", [data[this.mainEntityKey]]),{
                  onClose: function() {
                    this.getRouter().navTo("worklist", {}, true);
                  }.bind(this)
                });
              return;

            }
            if(oParameters && oParameters.promise){
              oParameters.promise.resolve();
              return;
            }
            MessageBox.success(oResourceModel.getText("draft.success.msg", [data[this.mainEntityKey]]));
          }.bind(this));
                }.bind(this));
      }.bind(this);

      var fError = function(oError){
        this.busyDialog.close();

        if(oParameters && oParameters.promise){
          oParameters.promise.reject();
        }

        var aErrors = util.processODataError(oError, this.getResourceBundle());
        this.applyOdataErrors(aErrors);

        //if we are in Validate and the only Error was Approval Required message, show success message
        if(oParameters && oParameters.validate && aErrors.length === 0){
          MessageBox.success(oResourceModel.getText("validation.success"));
          if(this.oIconTabBar.getSelectedKey() === "approvalsTab"){
            viewModel.setProperty("/enableSubmit", true);
          }
          return;
        }

        aErrors = this.getModel("ErrorModel").getProperty("/errors").concat(aErrors);

        var warningOnly = true;
        for(var i in aErrors){
          if(aErrors[i].type === sap.ui.core.MessageType.Error){
            warningOnly = false;
          }
        }

        if(warningOnly && oParameters && oParameters.validate){
          var selectedKey = this.oIconTabBar.getSelectedKey();
          if(selectedKey === "approvalsTab"){
            viewModel.setProperty("/enableSubmit", true);
          }
        }

        this.getModel("ErrorModel").setProperty("/errors", aErrors );
        var errorBtn = this.getById("errorBtn");
        this.showErrorPopover(errorBtn);
      }.bind(this);

      this._submitData(data, fSuccess, fError);
    },



    /**
     * Event handler when Validate button gets pressed. It reuses the save draft function
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onValidatePress: function(oEvent){
      //make sure the field is optional until Validation tells us otherwise.
      this.getModel("viewModel").setProperty("/approvalMandatory", false);
      this.getModel("viewModel").setProperty("/enableSubmit", false);
      if(!this.validateEntryUI()){
        return;
      }
      this.onDraftPress(oEvent, {validate: true});
    },

    /**
     * Event handler when Delete Draft button gets pressed. If the document had not been save before
     * it simply navigates to worklist. If it had been saved, it sends a request to delete it.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onDeletePress: function(oEvent){
      MessageBox.warning(
        this.getResourceBundle().getText("dlg.delete.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              //if Draft has been saved previously - Need to delete it from oData
              var docNum = this.getView().getBindingContext().getObject()[this.mainEntityKey];
              if(docNum){
                var docObj = {};
                docObj[this.mainEntityKey] = docNum;
                var sObjectPath = this.mainModel.createKey(this.mainEntitySet, docObj);

                var oResourceModel = this.getResourceBundle();
                this.busyDialog.setTitle(oResourceModel.getText("delete.busy.title"));
                this.busyDialog.setText(oResourceModel.getText("delete.busy.text"));
                this.busyDialog.open();

                this.mainModel.remove("/" + sObjectPath, {
                  success: function(oData1, oResponse, aErrorResponse) {
                    // viewModel.setProperty("/busy", false);
                    this.busyDialog.close();
                    MessageBox.success(oResourceModel.getText("draft.delete.success.msg", [docNum]),{
                        onClose: function() {
                            this.getRouter().navTo("worklist", {}, true);
                          }.bind(this),
                        title: "Success"
                      });

                  }.bind(this),
                  error: function(oError) {
                    this.busyDialog.close();

                    var aErrors = util.processODataError(oError, this.getResourceBundle());
                    this.getModel("ErrorModel").setProperty("/errors", aErrors );

                    var errorBtn = this.getById("errorBtn");
                    this.showErrorPopover(errorBtn);
                  }.bind(this)
                });

              }
              else{//the draft has not been saved previously - only navigate to worklist
                this.getRouter().navTo("worklist", {}, true);
              }

            }
          }.bind(this)
        }
      );
    },

    /**
     * Event handler when NavBack button gets pressed. It navigates to worklist
     * @public
     */
    onNavBack: function(){
      MessageBox.warning(
        this.getResourceBundle().getText("dlg.navBack.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              BaseController.prototype.onNavBack.apply(this, arguments);
              // this.getRouter().navTo("worklist", {}, true);
            }
          }.bind(this)
        }
      );
    },

    /**
     * Event handler when Home button gets pressed. It displays a warning. It calls BaseController
     * homePress function to handle the navigation.
     * @param {sap.ui.base.Event} oEvent the after open event
     * @public
     */
    onHomePress: function(){
      MessageBox.warning(
        this.getResourceBundle().getText("dlg.home.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              BaseController.prototype.onHomePress.apply(this, arguments);
              // this.getRouter().navTo("worklist", {}, true);
            }
          }.bind(this)
        }
      );
    },

    /**
     * Event handler when Reassign button gets pressed. It opens the reassign dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAssignPress: function(oEvent){
      var oButton = oEvent.getSource();

      // create action sheet only once
      if (!this._draftAssignDlg) {
        this._draftAssignDlg = sap.ui.xmlfragment(this.createId("draftAssignDlg"), "fss.ssp.view.fragments.draftAssignDlg", this);
        this._draftAssignDlg.setModel(new JSONModel({}));
        this._draftAssignDlg.setModel(new JSONModel({}), "ErrorModel");
        this.getView().addDependent(this._draftAssignDlg);
        util.setDefaultPlacementTextVH(this._draftAssignDlg.getContent(), this);
      }
      this._draftAssignDlg.getModel().setData({});
      this.clearMandatoryDlg(this._draftAssignDlg);
      this._draftAssignDlg.open(oButton);
    },

    /**
     * Event handler when Ok button on Reassign dialog gets pressed. It reuses the save draft function
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAssignConfirm: function(oEvent){
      //check that there is a Assignee and it's not the current user
      this.getOwnerComponent().loadUser().then(function(oUser){
        if(oUser){
          var aErrors = [];
          if(!this.validateMandatoryDlg(this._draftAssignDlg)){
            aErrors.push({message: this.getResourceBundle().getText("validation.error.mandatory"),
                    type: sap.ui.core.MessageType.Error });
          }
          var oData = this._draftAssignDlg.getModel().getData();
          if(oData.DraftAssigneeID === oUser.UserId){
            aErrors.push({message: this.getResourceBundle().getText("validation.error.selfAssign"),
                    type: sap.ui.core.MessageType.Error });
          }

          this._draftAssignDlg.getModel("ErrorModel").setProperty("/errors", aErrors);
          this._draftAssignDlg.getModel("ErrorModel").updateBindings();

          if(aErrors.length > 0){
            var errorBtn = this.byId(sap.ui.core.Fragment.createId("draftAssignDlg", "errorBtn"));
            this.showErrorPopover(errorBtn);
            return;
          }

          this.onDraftPress(oEvent, {assignee: oData.DraftAssigneeID});
          this._draftAssignDlg.close();
        }
      }.bind(this));
    },

    /**
     * Event handler when Cancel button on Reassign dialog gets pressed. It closes the dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAssignCancel: function(oEvent){
      this._draftAssignDlg.close();
    },

    /**
     * Event handler Ok button gets pressed on contract search dialog. It resolves the attached promise with Contract Number.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onContractSearchConfirm: function(oEvent){
      var addPromise = jQuery.Deferred();
      var sStatus = this._contractSearchDlg.getModel("viewModel").getProperty("/contractStatus");
      var bIsLegacy = this._contractSearchDlg.getModel("viewModel").getProperty("/contractLegacy");

      if([Constants.STATUS_AWAITING_PRF, Constants.STATUS_AWAITING_APPROVAL, Constants.STATUS_AWAITING_ASSET].indexOf(sStatus) >= 0 && !bIsLegacy){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.recall.warning"),
          {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            styleClass: "sapUiSizeCompact",
            onClose: function(sAction) {
              if(sAction === MessageBox.Action.OK){
                addPromise.resolve();
              }
              else{
                addPromise.reject();
              }
            }.bind(this)
          }
        );
      }else{
        addPromise.resolve();
      }

      addPromise.then(function(){
        var contractNo = this._contractSearchDlg.getModel("viewModel").getProperty("/contractNumber");
        this._contractSearchDlg.createPromise.resolve(contractNo);
        this._contractSearchDlg.close();
      }.bind(this),
      function(){
        addPromise = null;
      });
    },

    /**
     * Event handler cancel button gets pressed on contract search dialog. It rejects the attached promise and then navigates back.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onContractSearchCancel: function(oEvent){
      if(this._contractSearchDlg.createPromise){
        this._contractSearchDlg.createPromise.reject(null);
      }
      BaseController.prototype.onNavBack.apply(this, arguments);

    },


    /**
     * Event handler for route mathced event. For new document creation, it prepares the default list.
     * For existing documents, it bind the view to its values.
     * @param {sap.ui.base.Event} oEvent the route catched event
     * @public
     */
    _onRouteMatched: function(oEvent){
      var sRouteName = oEvent.getParameters().name;
      var aValidRoutes = ["createContract", "createSingle", "createMulti", "editDoc", "editContract", "editSingle", "copyContractDoc", "editPOStandalone"];
      this.setDefaultValues();

      this.clearValueStates();
      if(aValidRoutes.indexOf(sRouteName) >= 0){

        var data = {
          busy : false,
          delay : 0,
          title: "",
          vhDisplay: {},
          enablePhasingAction: false,
          approvalMandatory: false,
          isContract: true,
          route: sRouteName,
          enableSubmit: false,
          editMode: false,
          createMode: false,
          isSingle: null,
          isContractOnly: null,
          isPO: false
          };
        this.getModel("viewModel").setData(data);

        this.getOwnerComponent().loadUser().then(function(oUser){
          if(oUser){
            // this.getModel().setProperty("/ApprovalDetails/DelegateID", oUser.ManagerID);
            this.getModel("viewModel").setProperty("/UserId", oUser.UserId);
          }
        }.bind(this));

        //remove pending attachments
        this.getView().unbindElement();
        this.getById("uploadCollection").destroyItems();
        this.getById("uploadCollection").removeAllAggregation("items");
        this.getModel().setData({});

        var createPromise = jQuery.Deferred();
        if(["editPOStandalone"].indexOf(sRouteName) >= 0){
          this.getModel("viewModel").setProperty("/isContract", false);
          this.getModel("viewModel").setProperty("/isPO", true);
          this.getModel("viewModel").setProperty("/editMode", true);
          this.mainEntitySet = "PurchaseOrders";
          this.mainEntityKey = "PONumber";

          var docId = oEvent.getParameter("arguments").docId;
          this._bindViewPo(docId, true).then(function(oData) {
            if (oData) {
              var docSaveType = ""; //(oData.IsDraft) ? this.getResourceBundle().getText("title.draft") : "";
              var title = this.getResourceBundle().getText("editPoTitle", [docSaveType]);
              this.getModel("viewModel").setProperty("/title", title);
              this.setFLPTitle(title);
            }
            oData.IsSinglePO = true;
            oData.ContractLIs = oData.PurchaseOrderLIs;
            this.getModel().updateBindings();
          }.bind(this));
        }
        else if(["editDoc", "editContract", "editSingle", "copyContractDoc"].indexOf(sRouteName) >= 0){

          if(sRouteName === "editContract" || sRouteName === "editSingle"){
            if(sRouteName === "editContract"){
              this.getModel("viewModel").setProperty("/isContractOnly", true);
              if (!this._contractOnlySearchDlg) {
                this._contractOnlySearchDlg = sap.ui.xmlfragment(this.createId("contractOnlySearchDlg"), "fss.ssp.view.fragments.contractSearchDlg", this);
                this.getView().addDependent(this._contractOnlySearchDlg);
              }
              this._contractSearchDlg = this._contractOnlySearchDlg;
            }
            else if(sRouteName === "editSingle"){
              this.getModel("viewModel").setProperty("/isSingle", true);
              if (!this._contractSingleSearchDlg) {
                this._contractSingleSearchDlg = sap.ui.xmlfragment(this.createId("contractSingleSearchDlg"), "fss.ssp.view.fragments.contractSingleSearchDlg", this);
                this.getView().addDependent(this._contractSingleSearchDlg);
              }
              this._contractSearchDlg = this._contractSingleSearchDlg;
            }

            this._contractSearchDlg.createPromise = createPromise;
            this._contractSearchDlg.open();
          }
          else{
            createPromise.resolve();
          }


          createPromise.then(function(sDocId){
            if(!sDocId){
              sDocId = oEvent.getParameter("arguments").docId;
            }
            this._bindView(sDocId, ["editDoc", "editContract", "editSingle"].indexOf(sRouteName) >= 0, sRouteName === "copyContractDoc" ? true : false).then(function(oData){
              if(!oData){
                return;
              }
              // this.getOwnerComponent().loadUser().then(function(oUser){
              //  if(oUser){
              //    // this.getModel().setProperty("/ApprovalDetails/DelegateID", oUser.ManagerID);
              //    this.getModel("viewModel").setProperty("/UserId", oUser.UserId);
              //  }
              // }.bind(this));

              if(sRouteName === "copyContractDoc"){
                // this.resetDataForCopy();
              }
              else{
                this.getModel("viewModel").setProperty("/editMode", true);
                var docType = (oData.IsContractOnly) ? "title.createContract" : "title.createSingle";
                var docSaveType = "";//(oData.IsDraft) ? this.getResourceBundle().getText("title.draft") : "";
                data.title = this.getResourceBundle().getText("editContractTitle", [docSaveType,
                                                    this.getResourceBundle().getText(docType)]);
                this.setFLPTitle(data.title);
                // data.title += formatter.headerDocNum(oData[this.mainEntityKey]);
              }
              this.getModel("viewModel").updateBindings();


            }.bind(this));
          }.bind(this),
          function(){
            if(this._contractSearchDlg){
              this._contractSearchDlg.createPromise = null;
            }
          }.bind(this));

        }
        else{//If Create mode
          this.getModel("viewModel").setProperty("/createMode", true);
          data.title = this.getResourceBundle().getText("createContractTitle", [this.getResourceBundle().getText("title." + sRouteName)]);
          this.setFLPTitle(data.title);

          this.mainModel.metadataLoaded().then( function() {
            this.prepareDraftData(sRouteName);
            this.getView().bindElement({path: "/"});

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

            // if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineSON){
            //  this.byId("CreateView").getController().determineSON();
            // }

            // if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineInvParty){
            //  this.byId("CreateView").getController().determineInvParty();
            // }

            var aVisibleItems = this.getVisibleTabs();
            this.oIconTabBar.setSelectedKey(aVisibleItems[0]);
            this.oIconTabBar.fireSelect();

            this.getModel("viewModel").setProperty("/busy", false);

          }.bind(this));
        }
      }
    },

    /**
     * Sets default values based on route name
     * @param {String} sRouteName route name for the page
     * @returns {object} default data for the route
     * @public
     */
    prepareDraftData: function(sRouteName){
      var data = {};

      var oCtx = this.mainModel.createEntry("/" + this.mainEntitySet);
      data = oCtx.getObject();
      //default to FALSE. The route will decide which one is TRUE
      data.IsContractOnly = false;
      data.IsSinglePO = false;
      data.IsMultiPO = false;
      data.Currency = "AUD";
      data.PaymentTerms = "0020";
      data.IsDraft = true;
      data.Status = Constants.STATUS_NEW;
      data.StatusDesc = Constants.STATUS_NEW_DESC;
      data.StatusDescLong = Constants.STATUS_NEW_DESC;
      data.PurchasingGroup = "015";
      data.TotalValue = 0;
      data.CompanyCode = null;
      var oModel = this.getModel();


      switch(sRouteName){
        case "createContract":
          data.IsContractOnly = true;

          this.getOwnerComponent().loadUser().then(function(oUser){
            if(oUser){
              // this.getModel().setProperty("/ApprovalDetails/DelegateID", oUser.ManagerID);
              // this.getModel("viewModel").setProperty("/UserId", oUser.UserId);
              oModel.setProperty("/CompanyCode", oUser.CompanyCode);
            }
          }.bind(this));
          break;
        case "createSingle":
          data.IsSinglePO = true;
          data.IsSameAddressForAll = true;

          oCtx = this.mainModel.createEntry("/ContactDetails");
          data.ContactDetails = oCtx.getObject();
          // oCtx = this.mainModel.createEntry("/DeliveryAddresses");
          // data.DeliveryAddresses = oCtx.getObject();
          // data.DeliveryAddresses.DeliveryType = "RomanCode";
          data.Phasings = [];
          data.DeliveryAddresses = [];

          this.getOwnerComponent().loadUser().then(function(oUser){
            if(oUser){
              oModel.setProperty("/ContactDetails/POContactName", oUser.FullName);
              oModel.setProperty("/ContactDetails/POContactID", oUser.UserId);
              oModel.setProperty("/ContactDetails/POContactEmail", oUser.Email);
              oModel.setProperty("/ContactDetails/POContactPhone", oUser.Phone);
              // oModel.setProperty("/ContactDetails/InvoiceContactEmail", oUser.Email);
              // this.getModel().setProperty("/ApprovalDetails/DelegateID", oUser.ManagerID);
              // this.getModel("viewModel").setProperty("/UserId", oUser.UserId);
              oModel.setProperty("/CompanyCode", oUser.CompanyCode);
            }
          }.bind(this));

          break;
        case "createMulti":
          data.IsMultiPO = true;

          break;
      }
      data.AccountAssignments = [];
      oCtx = this.mainModel.createEntry("/ApprovalDetails");
      data.ApprovalDetails = oCtx.getObject();
      data.ApprovalDetails.IsSection23 = false;
      oCtx = this.mainModel.createEntry("/AdminDetails");
      data.AdminDetails = oCtx.getObject();
      // data.AdminDetails.IsSp020 = "Y";
      data.AdminDetails.QuoteReceivedCount = 0;
      data.AdminDetails.QuoteInvitationCount = 0;

      oCtx = this.mainModel.createEntry("/HeaderTexts");
      data.HeaderTexts = oCtx.getObject();
      data.HeaderTexts.AlternateTC = false;
      data.IndigenousSubcontractors = [];
      data[this.mainLiEntitySet] = [];
      data.Attachments = [];

      this.getModel().setData(data);
      return data;
    },

    resetDataForCopy: function(){
      var oViewModel = this.getModel("viewModel");
      var oModel = this.getModel();
      var sPath = util.getContextPath(this.getView());

      var docType = oModel.getProperty(sPath + "IsContractOnly") ? "title.createContract" : "title.createSingle";
      var sTitle = this.getResourceBundle().getText("createContractTitle", [this.getResourceBundle().getText(docType)]);
      oViewModel.setProperty("/title", sTitle);
      this.setFLPTitle(sTitle);
      oViewModel.setProperty("/createMode", true);
      oViewModel.setProperty("/editMode", false);
      oViewModel.setProperty("/vhDisplay/DelegateEID", undefined);
      oViewModel.setProperty("/vhDisplay/DelegateName", undefined);


      oModel.setProperty(sPath + "Attachments", []);
      oModel.setProperty(sPath + "PurchaseOrders", []);
      oModel.setProperty(sPath + "ConsumptionGRs", []);
      oModel.setProperty(sPath + "ConsumptionIRs", []);
      oModel.setProperty(sPath + "ConsumptionSummary", {});
      oModel.setProperty(sPath + "Approvals", []);
      oModel.setProperty(sPath + "ChangeLogs", []);
      oModel.setProperty(sPath + "ApprovalDetails", this.mainModel.createEntry("/ApprovalDetails").getObject());
      oModel.setProperty(sPath + "HeaderTexts", this.mainModel.createEntry("/HeaderTexts").getObject());
      oModel.setProperty(sPath + "ApprovalDetails/IsSection23", false);

      oModel.setProperty(sPath + "ContractNumber", undefined);
      oModel.setProperty(sPath + "YourReference", undefined);
      oModel.setProperty(sPath + "PurchaseOrder", undefined);
      oModel.setProperty(sPath + "IsDraft", true);
      oModel.setProperty(sPath + "Status", Constants.STATUS_NEW);
      oModel.setProperty(sPath + "StatusDesc", Constants.STATUS_NEW_DESC);
      oModel.setProperty(sPath + "StatusDescLong", Constants.STATUS_NEW_DESC);

      var objArray = oModel.getProperty(sPath + "ContractLIs");

      var nonCopyFields = ["ParentNumber", "IsNonDeletable", "IsFinalInvoice", "IsDeliveryComplete", "IsUOMChangeable", "StatusDesc",
                "AssignedQty", "IsCloseable", "DvdQuantity", "InvQuantity", "AssignedValDocCurr",
                      "IsRateChanged"];
          // "ItemText", "InfoRecordNote", "InfoRecordPoText", "InfoNote", "MaterialPoText", "VendorMaterial", "TrackingNo"];
      var aNonCopyLi = [], j;
      for(var i = objArray.length - 1; i >= 0;  i--){
        if([Constants.STATUS_LI_LOCKED, Constants.STATUS_LI_DELETED].indexOf(objArray[i].Status) >= 0){
          aNonCopyLi.push(objArray[i].LineNumber);
          objArray.splice(i, 1);
          continue;
        }

        for(j in nonCopyFields){
          objArray[i][nonCopyFields[j]] = undefined;
        }
      }
      oModel.setProperty(sPath + "ContractLIs", objArray);

      var oPhasingArray = oModel.getProperty(sPath + "Phasings");
      for(i = oPhasingArray.length - 1; i >= 0;  i--){
        if(aNonCopyLi.indexOf(oPhasingArray[i].ItemLineNumber) >= 0 || oPhasingArray[i].IsDeleted){
          oPhasingArray.splice(i, 1);
          continue;
        }
        oPhasingArray[i].ParentNumber = undefined;
        oPhasingArray[i].DvdQuantity = 0;
        oPhasingArray[i].InvQuantity = 0;
      }
      oModel.setProperty(sPath + "Phasings", oPhasingArray);

      var aLinePhasings, bFound, oCtx, data;
      for(i in objArray){
        aLinePhasings = this.getPhasingsForLine(objArray[i].LineNumber);
        if(!aLinePhasings){
          continue;
        }
        bFound = false;
        for(j in aLinePhasings){
          if(Number(aLinePhasings[j].PhasingLineNumber) === 1){
            bFound = true;
            break;
          }
        }
        if(!bFound){
          oCtx = this.mainModel.createEntry("/Phasings");
          data = oCtx.getObject();
          data.PhasingLineNumber = "1";
          data.ItemLineNumber = objArray[i].LineNumber;
          data.IsDeleted = true;
          oPhasingArray.push(data);
        }
      }

      var aAssignments = oModel.getProperty(sPath + "AccountAssignments");
      for(i = aAssignments.length - 1; i >= 0;  i--){
        if(aNonCopyLi.indexOf(aAssignments[i].ItemLineNumber) >= 0 || aAssignments[i].IsDeleted){
          aAssignments.splice(i, 1);
          continue;
        }
        aAssignments[i].ParentNumber = undefined;
        aAssignments[i].IsDeleted = false;
      }
      oModel.setProperty(sPath + "AccountAssignments", aAssignments);


      objArray = oModel.getProperty(sPath + "IndigenousSubcontractors");
      for(i = objArray.length - 1; i >= 0;  i--){
        objArray[i].ContractNumber = undefined;
      }
      oModel.setProperty(sPath + "IndigenousSubcontractors", objArray);

      objArray = oModel.getProperty(sPath + "DeliveryAddresses");
      for(i = objArray.length - 1; i >= 0;  i--){
        if(aNonCopyLi.indexOf(objArray[i].LineNumber) >= 0 ){
          objArray.splice(i, 1);
          continue;
        }
        objArray[i].ParentNumber = undefined;
      }
      oModel.setProperty(sPath + "DeliveryAddresses", objArray);

      oModel.setProperty(sPath + "ContactDetails/ParentNumber", undefined);
      // oModel.setProperty(sPath + "DeliveryAddresses/ParentNumber", undefined);
      oModel.setProperty(sPath + "AdminDetails/ParentNumber", undefined);
    }
  });

});