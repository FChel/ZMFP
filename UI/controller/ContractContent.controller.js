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
   * This is the controller for the content within “CreateContract” view. It has been separated
   * to its own view so that it can be embedded in Approval app without the need to reimplement the functionality
   */
  return BaseController.extend("fss.ssp.controller.ContractContent", {
    formatter: formatter,

    onInit: function() {
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.oIconTabBar = this.byId("iconTabBar");
      this.attachmentCount = 0;
      this.byId("uploadCollection")._oNumberOfAttachmentsTitle = this.byId("attachmentTitle");
      var sAppId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
      this.setModel(new JSONModel({isSsp: sAppId.indexOf("ssp") > 0}), "sspIndicatorModel");

    },

    onBeforeRendering: function(){
      // this.busyDialog = sap.ui.getCore().byId("createBusyDlg");
    },

    _setBoundValue: function(sBoundField, fieldValue, oDialog){
      BaseController.prototype._setBoundValue.apply(this, arguments);
      //we need to update list of SONs whenever the vendor changes
      if (sBoundField === "VendorNumber") {
        this.determineSON();
        this.determineDuplicate();
      }

      //we need to update list of Invoicing Party whenever the vendor changes
      if (sBoundField === "VendorNumber") {
        this.determineInvParty();
      }
    },

    /**
     * Event handler when user tries to add text to Subcontractor field. It removes the entry and opens the dialog
     * @param {sap.ui.base.Event} oEvent the live change event
     * @public
     */
    onSubcontractorLiveChange: function(oEvent){
      oEvent.getSource().setValue("");
      if(oEvent.getParameter("newValue")){
        this.onAddSubContractors();
      }
    },

    /**
     * Returns the sequence number for the next subcontractor to be added
     * @returns {int} next sequence number
     * @public
     */
    getNextSubcontractorSequence: function(){
      var sPath = util.getContextPath(this.getView());
      var aContractors = this.getModel().getProperty(sPath + "IndigenousSubcontractors");
      var lastSeq = 0;

      if(aContractors.length > 0){
        lastSeq = aContractors[aContractors.length - 1].Sequence;
      }

      return (Number(lastSeq) + 1) + "";
    },

    /**
     * Event handler when a suncontractor gets pressed. It opens the dialog in Edit or Display mode based on document's mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSubcontractorPress: function(oEvent){
      var viewModel = this.getModel("viewModel");
      var oDialog, viewModelData;
      if(viewModel.getProperty("/displayMode")){
        if (!this.displaySubContractorDlg) {
          this.displaySubContractorDlg = sap.ui.xmlfragment(this.createId("displaySubContractorDlg"), "fss.ssp.view.fragments.addSubcontractorDlg", this);
          this.displaySubContractorDlg.setModel(new JSONModel({}));
          this.getView().addDependent(this.displaySubContractorDlg);
          util.makeFormReadOnly(this.displaySubContractorDlg.getContent());
          this.displaySubContractorDlg.setModel(new JSONModel({errors: []}), "ErrorModel");
        }
        oDialog = this.displaySubContractorDlg;
        viewModelData = {IsEdit: false};

      }
      else{
        if (!this.addSubContractorDlg) {
          this.addSubContractorDlg = sap.ui.xmlfragment(this.createId("addSubContractorDlg"), "fss.ssp.view.fragments.addSubcontractorDlg", this);
          this.addSubContractorDlg.setModel(new JSONModel({}));
          this.addSubContractorDlg.setModel(new JSONModel({}), "ErrorModel");
          this.getView().addDependent(this.addSubContractorDlg);
        }
        viewModelData = {IsEdit: true};
        oDialog = this.addSubContractorDlg;
      }
      this.clearMandatoryDlg(oDialog);
      oDialog.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
      var obj = oEvent.getSource().getBindingContext().getObject();
      var oData = $.extend(true, {}, obj);
      oDialog.getModel().setData(oData);

      oDialog.open();
    },

    /**
     * Event handler when Add Subcontractor button gets pressed. It initialises and opens the creation dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddSubContractors: function(oEvent){
      var viewModel = this.getModel("viewModel");
      if(viewModel.getProperty("/displayMode")){
        return;
      }

      //pass data inside ContractModel, create a new entry and set as main model of ADD fragment
      if (!this.addSubContractorDlg) {
        this.addSubContractorDlg = sap.ui.xmlfragment(this.createId("addSubContractorDlg"), "fss.ssp.view.fragments.addSubcontractorDlg", this);
        this.addSubContractorDlg.setModel(new JSONModel({}));
        this.addSubContractorDlg.setModel(new JSONModel({}), "ErrorModel");
        this.getView().addDependent(this.addSubContractorDlg);
      }
      this.clearMandatoryDlg(this.addSubContractorDlg);
      var viewModelData = {IsAdd: true};
      this.addSubContractorDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
      var oCtx = this.mainModel.createEntry("/IndigenousSubcontractors").getObject();
      this.addSubContractorDlg.getModel().setData(oCtx);

      this.addSubContractorDlg.open();
    },


    /**
     * Event handler when Delete Subcontractorbutton gets pressed. It removes the subcontractor from the list
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSubcontractorTokenUpdate: function(oEvent){
      if(oEvent.getParameter("type") === sap.m.Tokenizer.TokenUpdateType.Removed){
        var list = oEvent.getParameter("removedTokens");
        var oData = this.getView().getModel().getData();

        for(var i in oData.IndigenousSubcontractors){
          if(oData.IndigenousSubcontractors[i].Sequence === list[0].getKey()){
            oData.IndigenousSubcontractors.splice(i, 1);
            break;
          }
        }
        this.getView().getModel().updateBindings();
        oEvent.getSource().closeSuggestions();
      }
    },

    /**
     * Event handler when Cancel Subcontractorbutton gets pressed. It closes the create dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddSubcontractorCancel: function(oEvent){
      if(this.addSubContractorDlg){
        this.addSubContractorDlg.close();
      }
      if(this.displaySubContractorDlg){
        this.displaySubContractorDlg.close();
      }
    },


    /**
     * Event handler when Add Subcontractorbutton gets pressed. It validates and add the new subcontractor.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddSubcontractorConfirm: function(oEvent){
      if(!this.subcontractorValidation()){
        return;
      }

      var sPath = util.getContextPath(this.getView());
      var aContractors = this.getModel().getProperty(sPath + "IndigenousSubcontractors");
      var obj = this.addSubContractorDlg.getModel().getData();

      obj.Sequence = this.getNextSubcontractorSequence();

      aContractors.push(obj);
      this.getModel().setProperty(sPath + "IndigenousSubcontractors", aContractors);
      this.addSubContractorDlg.close();
    },

    /**
     * Event handler when Edit Subcontractorbutton gets pressed. It validates and edits the subcontractor.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditSubcontractorConfirm: function(oEvent){
      if(!this.subcontractorValidation()){
        return;
      }

      var sPath = util.getContextPath(this.getView());
      var aContractors = this.getModel().getProperty(sPath + "IndigenousSubcontractors");
      var obj = this.addSubContractorDlg.getModel().getData();

      for(var i in aContractors){
        if(aContractors[i].Sequence === obj.Sequence){
          aContractors[i] = obj;
          break;
        }
      }

      this.getModel().setProperty(sPath + "IndigenousSubcontractors", aContractors);
      this.addSubContractorDlg.close();
    },

    /**
     * Validates the Subcontractor dialog.
     * @returns {boolean} whether validation was successful or not
     * @public
     */
    subcontractorValidation: function(){
      var aErrors = [];
      if(!this.validateMandatoryDlg(this.addSubContractorDlg)){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.mandatory"),
                type: sap.ui.core.MessageType.Error });
      }

      var obj = this.addSubContractorDlg.getModel().getData();

      if(obj.ContractorABN && !util.validateABNFormat(obj.ContractorABN)){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.abnFormat"),
                type: sap.ui.core.MessageType.Error });
      }

      if(obj.ContractorABN){
        obj.ContractorABN = obj.ContractorABN.replace(/\s/g, "");
      }

      if(aErrors.length > 0){
        this.addSubContractorDlg.getModel("ErrorModel").setProperty("/errors", aErrors);
        this.addSubContractorDlg.getModel("ErrorModel").updateBindings();
        var errorBtn = this.byId(sap.ui.core.Fragment.createId("addSubContractorDlg", "errorBtn"));
        this.showErrorPopover(errorBtn);
        return false;
      }
      return true;
    },

    /**
     * Event handler when Contact search help button gets pressed. It's calling the framework search help
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onContactSearchHelpValueChange: function(oEvent){
      this.onSearchHelpValueChange(oEvent);
    },

    /**
     * Event handler when Roman address search help button gets pressed. It's calling the framework search help
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onRomanAddressSearchHelpValueChange: function(oEvent){
      this.onSearchHelpValueChange(oEvent);
    },

    /**
     * Event handler when Company Code dropdown is changed. It calls the function to determine SONs.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onCompanyCodeChange: function(oEvent){
      if(this.validateComboBoxChange(oEvent)){
        var sPath = util.getContextPath(this.getView());
        var sVendor = this.getModel().getProperty(sPath + "VendorNumber");
        if(sVendor){
          this.getModel().setProperty(sPath + "VendorNumber", null);
          // this.byId("vendorInput").setValue();
          this.byId("vendorInput").fireChange({ newValue: sVendor, initialLoad: true});
        }
        this.determineSON();
      }

    },

    onStartDateChange: function(oEvent){
      this.determineSON();
      this.determineDuplicate();
    },

    onEndDateChange: function(oEvent){
      this.determineDuplicate();
    },

    /**
     * This function is called whenever Company Code or Vendor change. If they are both set, it calls the backend to get valid SONs for this combination
     * @public
     */
    determineSON:function(initialLoad){
      if(!this.getView().getBindingContext()){
        return;
      }

      var obj = this.getView().getBindingContext().getObject();
      if(!this.sonTemplate){
        this.sonTemplate = this.byId("sonItem").clone();
      }

      var sonSelect = this.byId("sonSelect");
      //if the field doesn't exist or if it is invisible, do not make the call
      if(!sonSelect || !sonSelect.getVisible()){
        return;
      }
      if(obj.CompanyCode  && obj.VendorNumber){
        var aFilters = [];
        aFilters.push(new Filter("CompanyCode", FilterOperator.EQ, obj.CompanyCode));
        aFilters.push(new Filter("Vendor", FilterOperator.EQ, obj.VendorNumber));
        var oStartDate = obj.StartDate;
        aFilters.push(new Filter("StartDate", FilterOperator.LE, oStartDate || null));

        var oFilter = new Filter({filters: aFilters, and: true});

        var sPath = util.getContextPath(this.getView());
        var currentSon = this.getModel().getProperty(sPath + "SON");
        if(initialLoad){
          aFilters.push(new Filter("Key", FilterOperator.EQ, currentSon || null));
        }
        this.getModel().setProperty(sPath + "SON", null);

        sonSelect.setBusy(true);
        sonSelect.bindItems({path: "searchHelpModel>/SONs", template: this.sonTemplate, filters: [oFilter],
            events:{
              dataReceived: function(oEvent){
                sonSelect.setBusy(false);
                var oData = oEvent.getParameter("data");

                var isDisplayMode = this.getModel("viewModel").getProperty("/displayMode");
                sonSelect.setEditable(oData && oData.results && oData.results.length > 0 && !isDisplayMode);

                if(oData && oData.results && Array.isArray(oData.results)){
                  sonSelect.insertItem(new sap.ui.core.ListItem({key: ""}), 0);
                  if(currentSon){
                    for(var i in oData.results){
                      if(oData.results[i].Key === currentSon){
                        this.getModel().setProperty(sPath + "SON", currentSon);
                        return;
                      }
                    }
                    //if SON seleced previously is not valid anymore.
                    if(!this.getModel("viewModel").getProperty("/displayMode")){
                      MessageBox.error(
                          this.getResourceBundle().getText("dlg.invalidSON.warning"),
                          {
                            styleClass: "sapUiSizeCompact",
                            actions: [MessageBox.Action.OK]
                          }
                        );
                    }
                  }
                }

              }.bind(this)
            }});
      }
      else{
        this.getModel().setProperty("/SON", null);
        sonSelect.setEditable(false);
        sonSelect.unbindItems();
      }
    },


    /**
     * Updates the list of Invoicing Party based on current Vendor selection. If data exists, it loads the data
     * and sets corresponding Select to enabled. Otherwise it sets it to disabled.
     * @public
     */
    determineInvParty: function(){
      if(!this.getView().getBindingContext()){
        return;
      }

      var obj = this.getView().getBindingContext().getObject();
      if(!this.invPartyTemplate){
        this.invPartyTemplate = this.byId("invPartyItem").clone();
      }

      var invPartySelect = this.byId("invPartySelect");

      //if the field doesn't exist or if it is invisible, do not make the call
      if(!invPartySelect || !invPartySelect.getVisible()){
        return;
      }

      if(obj.CompanyCode  && obj.VendorNumber){
        var aFilters = [];

        aFilters.push(new Filter("CompanyCode", FilterOperator.EQ, obj.CompanyCode));
        aFilters.push(new Filter("Parent", FilterOperator.EQ, obj.VendorNumber));
        var oFilter = new Filter({filters: aFilters, and: true});

        var sPath = util.getContextPath(this.getView());
        var currentInvParty = this.getModel().getProperty(sPath + "InvoicingPartyNumber");
        this.getModel().setProperty(sPath + "InvoicingPartyNumber", null);

        invPartySelect.setBusy(true);
        invPartySelect.bindItems({path: "searchHelpModel>/Vendors", template: this.invPartyTemplate, filters: [oFilter],
            events:{
              dataReceived: function(oEvent){
                invPartySelect.setBusy(false);
                var oData = oEvent.getParameter("data");
                var isDisplayMode = this.getModel("viewModel").getProperty("/displayMode");
                invPartySelect.setEditable(oData && oData.results && oData.results.length > 0 && !isDisplayMode);

                if(oData && oData.results && Array.isArray(oData.results)){
                  invPartySelect.insertItem(new sap.ui.core.ListItem({key: ""}), 0);
                  if(currentInvParty){
                    for(var i in oData.results){
                      if(oData.results[i].LIFNR === currentInvParty){
                        this.getModel().setProperty(sPath + "InvoicingPartyNumber", currentInvParty);
                      }
                    }
                  }
                }
              }.bind(this)
            }});
      }
      else{
        this.getModel().setProperty("/InvoicingPartyNumber", null);
        invPartySelect.setEditable(false);
        invPartySelect.unbindItems();
      }
    },

    determineDuplicate: function(){
      if(!this.getView().getBindingContext()){
        return;
      }


      //vendor, amount, currency, start/end date
      var checkFields = ["VendorNumber", "TotalValue", "Currency", "StartDate", "EndDate"];
      var oDoc = $.extend(true, {}, this.getView().getBindingContext().getObject());

      var viewObj = this.getModel("viewModel").getData();


      //Only check Create/Edit of new/draft Contract or L4L, otherwise return
      if(!oDoc || !viewObj || (!viewObj.editMode && !viewObj.createMode) || !oDoc.IsDraft || (!oDoc.IsSinglePO && !oDoc.IsContractOnly)){
        return;
      }

      for(var i in checkFields){
        //if any of the fields is not set yet, return
        if(!oDoc[checkFields[i]]){
          return;
        }
      }

      oDoc.UserAction = Constants.USER_ACTION_DUPLICATE;



      var fSuccess = function(oData, response) {
        return;
      };

      var fError = function(oError){
        var aErrors = util.processODataError(oError, this.getResourceBundle());
        var sErrorStrings = [];
        var warningOnly = true;
        for(var j in aErrors){
          if(aErrors[j].type === sap.ui.core.MessageType.Error){
            warningOnly = false;
          }
          if(aErrors[j].type === sap.ui.core.MessageType.Warning){
            sErrorStrings.push(aErrors[j].message);
          }

        }

        if(warningOnly){
          util.displayWarnings(sErrorStrings);
        }

        // this.getModel("ErrorModel").setProperty("/errors", aErrors );
        // var errorBtn = this.getById("errorBtn");
        // this.showErrorPopover(errorBtn);
      }.bind(this);

      var oParent = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView", 5);
      if(oParent && oParent.getController() && oParent.getController()._submitData){
        oParent.getController()._submitData(oDoc, fSuccess, fError);
      }
    },


    getById: function(sId){
      var ctrl = this.byId(sId);
      if(!ctrl){
        var oParent = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView", 5);
        if(oParent && oParent.getController()){
          ctrl = oParent.getController().getById(sId);
        }
        // ctrl = this.byId("CreateView").byId(sId);
      }
      return ctrl;
    },

    /**
     * Event handler when TotalValue is changed. It calls the function to determine if Under 10K.
     * @param {sap.ui.base.Event} oEvent the input change event
     * @public
     */
    onTotalValueChange: function(oEvent){
      this.determineUnder10K(oEvent);
      this.determineDuplicate();
    },

    onPayTermsChanged: function(oEvent){
      if(!this.getView().getBindingContext()){
        return;
      }
      if(this.validateComboBoxChange(oEvent)){
        var obj = this.getView().getBindingContext().getObject();

        if(obj.PaymentTerms && (obj.PaymentTerms !== "0020" && obj.PaymentTerms !== "0005") ){
          var sPath = util.getContextPath(this.getView());
          this.getModel().setProperty(sPath + "HeaderTexts/AlternateTC", true);

          MessageBox.warning(
            this.getResourceBundle().getText("dlg.alternatePay.warning"),
              {
                styleClass: "sapUiSizeCompact",
                actions: [MessageBox.Action.OK]
              }
            );
        }
        var bIsPO = this.getModel("viewModel").getProperty("/isPO");
        var sContractPayTerms = bIsPO ? this.getModel("ContractModel").getProperty("/PaymentTerms") : "";

        if(obj.PaymentTerms && obj.PaymentTerms !== "0020" && obj.PaymentTerms !== "0005" ){
          MessageBox.warning(
            new sap.m.FormattedText("", { htmlText: this.getResourceBundle().getText("dlg.nonStandardPay.warning") }),
            {
              styleClass: "sapUiSizeCompact",
              actions: [MessageBox.Action.OK]
            }
          );
        }
      }
    },

    /**
     * Event handler when Currency is changed. It calls the function to determine if Under 10K and it changes the currency for all line items
     * @param {sap.ui.base.Event} oEvent the combobox change event
     * @public
     */
    onCurrencyChange: function(oEvent){
      if(this.validateComboBoxChange(oEvent)){
        this.determineUnder10K(oEvent);
        this.determineDuplicate();
        var obj = oEvent.getSource().getBindingContext().getObject();
        var bIsPO = this.getModel("viewModel").getProperty("/isPO");

        //if this is a PO or L4L, change the currency
        if(bIsPO || obj.IsSinglePO){
          var oLines = this.getModel().getData().ContractLIs;
          var sCurrency = oEvent.getSource().getSelectedKey();
          for(var i in oLines){
            oLines[i].Currency = sCurrency;
          }
          this.getModel().updateBindings();
        }
      }
    },

    onExchangeChange: function(oEvent){

    },

    /**
     * If total value is less than 10k and currency is AUD, it displays a warning message to use credit card
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    determineUnder10K: function(oEvent){
      if(!this.getView().getBindingContext()){
        return;
      }
      var obj = this.getView().getBindingContext().getObject();
      var oBinding = oEvent.getSource().getBinding("value");
      if(oBinding && oBinding.getBindings() && oBinding.getBindings()[0] && oBinding.getBindings()[0].getPath() === "TotalValue"){
        if(oEvent.getSource().getValue() === "" || isNaN(Number(oEvent.getSource().getValue().replace(",", "")))){
          return;
        }
      }

      if(obj.Currency && obj.Currency === "AUD" && obj.TotalValue && obj.TotalValue < 30000){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.under10K.warning"),
          {
            styleClass: "sapUiSizeCompact",
            actions: [MessageBox.Action.OK]
          }
        );
      }
    },

    /**
     * Event handler when Icon tab is changed. It enables/disables next and previous buttons
     * @param {sap.ui.base.Event} oEvent the tab change event
     * @public
     */
    onTabSelect: function(oEvent){
      // var aVisibleItems = this.getVisibleTabs();
      if(this.getModel("viewModel").getProperty("/createMode") || this.getModel("viewModel").getProperty("/editMode") ){
        var selectedKey = this.oIconTabBar.getSelectedKey();
        if(selectedKey === "approvalsTab"){
          var oParent = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView", 5);
          if(oParent ){
            if(oParent.byId("validateBtn")){
              oParent.byId("validateBtn").firePress();
            }
          }
        }
        else{
          this.getModel("viewModel").setProperty("/enableSubmit", false);
        }
      }
    },

    /**
     * Returns a list of visible tabs
     * @returns {sap.m.IconTabFilter[]} List of visible tabs
     * @public
     */
    getVisibleTabs: function(){
      var oItems = this.oIconTabBar.getItems();
      var aVisibleItems = [];
      for(var i in oItems){
        if(oItems[i].getKey &&  oItems[i].getVisible && oItems[i].getVisible()){
          aVisibleItems.push(oItems[i].getKey());
        }
      }
      return aVisibleItems;
    },

    /**
     * Event handler before upload starts. We set slug and CSRF token to header.
     * @param {sap.ui.base.Event} oEvent before uplaod starts event
     * @public
     */
    onBeforeUploadStarts: function(oEvent) {
      oEvent.getSource().attachmentCount++;
      var oUplColParam = new sap.m.UploadCollectionParameter({
        name: "slug",
        value: util.resolveFileNames(oEvent.getParameter("fileName"))
      });
      oEvent.getParameters().addHeaderParameter(oUplColParam);

      var sCrsfToken = this.mainModel.getSecurityToken();
      oUplColParam = new sap.m.UploadCollectionParameter({
        name: "x-csrf-token",
        value: sCrsfToken
      });
      oEvent.getParameters().addHeaderParameter(oUplColParam);
      },

    /**
     * Event handler for upload complete. it decreases the attachment count for upload collection and if none left, it resolved the promise.
     * @param {sap.ui.base.Event} oEvent upload completion event
     * @public
     */
    onUploadComplete: function(oEvent){
      // this.busyDialog.close();
      var uploadCollection = oEvent.getSource();
      uploadCollection.attachmentCount--;
      if(uploadCollection.attachmentCount === 0 && uploadCollection.attachmentPromise){
        uploadCollection.attachmentPromise.resolve();
        uploadCollection.attachmentPromise = null;
      }
    },

    // /**
    //  * Event handler for upload terminate. it decreases the attachment count for upload collection and if none left, it resolved the promise.
    //  * @param {sap.ui.base.Event} oEvent upload termination event
    //  * @public
    //  */
    // onuplUadTerminated: function(oEvent){
    //  // this.busyDialog.close();
    //  var uploadCollection = oEvent.getSource();
    //  uploadCollection.attachmentCount--;
    //  if(this.attachmentCount === 0 && uploadCollection.attachmentPromise){
    //    uploadCollection.attachmentPromise.resolve();
    //    uploadCollection.attachmentPromise = null;
    //  }
    // },

    /**
     * Event handler for file size exceed event. it displays an error message to the user.
     * @param {sap.ui.base.Event} oEvent upload file size event
     * @public
     */
    onFileSizeExceed: function(oEvent){
      MessageBox.error(this.getResourceBundle().getText("validation.error.fileSize", [oEvent.getSource().getMaximumFileSize()])
              ,{actions: [MessageBox.Action.OK]});
    },

    onFileDeleted: function(oEvent){
      var oItem = oEvent.getSource();
      var deletePromise = jQuery.Deferred();

      MessageBox.warning(
        this.getResourceBundle().getText("dlg.fileDelete.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              deletePromise.resolve();
            }
            else{
              deletePromise.reject();
            }
          }.bind(this)
        }
      );


      deletePromise.then(function(){

        var url = oItem.getBindingContext().getObject().__metadata.uri;
        var n = url.lastIndexOf('/');
        var sAttachmentPath = url.substring(n) + "/$value";

        var oViewModel = this.getModel("viewModel");
        oViewModel.setProperty("/busy", true);

        this.mainModel.remove(sAttachmentPath, {
          success: function(oData, response){
            var uploadCollection = this.getById("uploadCollection");
            uploadCollection.removeItem(oItem);
            oItem.destroy();
            oViewModel.setProperty("/busy", false);
          }.bind(this),
          error: function(oData, response){
            oViewModel.setProperty("/busy", false);
          }.bind(this),
          async: true
        });
      }.bind(this),
      function(){
        deletePromise = null;
      });
    },

    /**
     * Event handler for file type mismatch event. it displays an error message to the user.
     * @param {sap.ui.base.Event} oEvent upload file mismatch event
     * @public
     */
    onTypeMissmatch: function(oEvent){
      var aFiles = oEvent.getParameters("files").files;
      var sFType = "";
      if (aFiles) {
        for (var i = 0; i < aFiles.length; i++) {
          if (sFType === "") {
            sFType = aFiles[i].fileType;
          } else {
            sFType += ", " + aFiles[i].fileType;
          }
        }
      }
      MessageBox.error(this.getResourceBundle().getText("validation.error.fileType", [sFType]),
          {actions: [MessageBox.Action.OK]});
    },

    onUploadChange: function(oEvent){
      // var aFiles = oEvent.getParameter("files");
      // var aErrors = [];
      // var uploadCollection = this.getById("uploadCollection");
      // for(var i in aFiles){
      //  if(aFiles[i].name){
      //    try{
      //      util.isValidFilename(aFiles[i].name);
      //    }
      //    catch(exception){
      //      aErrors.push(exception.message);

      //      setTimeout(
      //        function(){
      //          for(var k in uploadCollection.getItems()){
      //            //if it's a new file
      //            if(!uploadCollection.getItems()[k].getDocumentId()){
      //              try{
      //                util.isValidFilename(uploadCollection.getItems()[k].getFileName());
      //              }
      //              catch(except){
      //                uploadCollection.getItems()[k].setFileName("abc.txt");
      //              }
      //            }
      //          }
      //        }.bind(this), 100);
      //    }
      //  }
      // }

      // if(aErrors && aErrors.length){
      //  MessageBox.error(new sap.m.FormattedText({ htmlText: util.convertListToFormatted(aErrors)}),
      //      {styleClass: "sapUiSizeCompact", actions: [MessageBox.Action.OK]});
      // }
    }

  });

});