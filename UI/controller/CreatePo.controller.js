sap.ui.define([
  "fss/ssp/controller/BaseController",
  "fss/ssp/controller/CreateContract.controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "fss/ssp/model/formatter",
  "sap/m/MessageBox",
  "fss/ssp/model/util",
  "fss/ssp/model/Constants"
], function(BaseController, CreateContract, JSONModel, Filter, FilterOperator, formatter, MessageBox, util, Constants) {
  "use strict";

  /**
   * This controller manages the behaviour for create/edit functionality of a PO. It extends most of its functionality from CreateContract controller.
   */
  return CreateContract.extend("fss.ssp.controller.CreatePo", {

    formatter: formatter,

    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      this.mainEntitySet = "PurchaseOrders";
      this.mainLiEntitySet = "PurchaseOrderLIs";
      this.mainEntityKey = "PONumber";
      var contractModel = new JSONModel({});
      contractModel.setSizeLimit(5000);
      this.setModel(contractModel, "ContractModel");

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
      if(!obj.PurchaseOrderLIs || obj.PurchaseOrderLIs.length === 0){
        aErrors.push({message: oResourceBundle.getText("validation.error.noLineItem"),
                type: sap.ui.core.MessageType.Error });
      }
      else{
        var currType = new fss.ssp.CustomTypes.CustomCurrency({showMeasure: false}, {minimum: 0});
        var iAmtTotal = 0, iPercTotal = 0, iQtyTotal = 0;
        var aLi = obj[this.mainLiEntitySet];
        var aAssignments;
        var sAssignmentSuffix;
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


            for(var j in aAssignments){
              iAmtTotal += Number(aAssignments[j].Amount || null);
              iPercTotal += Number(aAssignments[j].Percentage || null);
              iQtyTotal += Number(aAssignments[j].Quantity || null);
            }

            if(aLi[i].Distribution === "1" && iQtyTotal !== Number(aLi[i].UnitQty || null) ){
              aErrors.push({message: this.getResourceBundle().getText("assignment.quantity.validation", [aLi[i].UnitQty, aLi[i].LineNumber]),
                type: sap.ui.core.MessageType.Error });
            }
            if(aLi[i].Distribution === "2" && iPercTotal > 100){
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

      var sUserId = this.getModel("viewModel").getProperty("/UserId");
      if(obj.ApprovalDetails.ApproverID && sUserId && sUserId === obj.ApprovalDetails.ApproverID){
        aErrors.push({message: oResourceBundle.getText("validation.error.userSameApprover"),
                type: sap.ui.core.MessageType.Error });
      }

      if(obj.ApprovalDetails.DelegateID && sUserId && sUserId === obj.ApprovalDetails.DelegateID){
        aErrors.push({message: oResourceBundle.getText("validation.error.userSameApprover"),
                type: sap.ui.core.MessageType.Error });
      }

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

      // var sTotalLinesInc = this.getModel("viewModel").getProperty("/totalInc");
      // sTotalLinesInc = formatter.currencyValueNumber(sTotalLinesInc, obj.Currency);

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
     * Event handler Ok button gets pressed on contract search dialog. It resolves the attached promise with Contract Number.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onContractSearchConfirm: function(oEvent){
      var addPromise = jQuery.Deferred();
      var sStatus = this._contractSearchDlg.getModel("viewModel").getProperty("/contractStatus");
      if(sStatus !== Constants.STATUS_APPROVED){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.nonApproved.warning"),
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
     * Event handler Ok button gets pressed on PO search dialog. It resolves the attached promise with PO Number.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onPoSearchConfirm: function(oEvent){
      var poNumber = this._poSearchDlg.getModel("viewModel").getProperty("/poNumber");
      var status = this._poSearchDlg.getModel("viewModel").getProperty("/poStatus");
      var bIsLegacy = this._poSearchDlg.getModel("viewModel").getProperty("/poLegacy");
      var contractNumber = this._poSearchDlg.getModel("viewModel").getProperty("/contractNumber");

      //if it's a standalone PO, navigate to its route
      if(!contractNumber){
        this.getRouter().navTo("editPOStandalone", {
                    docId: poNumber
                  }, true);
      }

      if([Constants.STATUS_AWAITING_PRF, Constants.STATUS_AWAITING_APPROVAL, Constants.STATUS_AWAITING_ASSET].indexOf(status) >= 0 && !bIsLegacy){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.recall.warning"),
          {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            styleClass: "sapUiSizeCompact",
            onClose: function(sAction) {
              if(sAction === MessageBox.Action.OK){
                this._poSearchDlg.createPromise.resolve(poNumber);
                this._poSearchDlg.close();
              }
            }.bind(this)
          }
        );
      }else{
        this._poSearchDlg.createPromise.resolve(poNumber);
        this._poSearchDlg.close();
      }

    },

    /**
     * Event handler cancel button gets pressed on PO search dialog. It rejects the attached promise and then navigates back.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onPoSearchCancel: function(oEvent){
      if(this._poSearchDlg.createPromise){
        this._poSearchDlg.createPromise.reject(null);
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
      var aValidRoutes = ["createPO", "createContractPO", "editPODoc", "editPOLegacy", "editPO", "copyPODoc"];

      this.clearValueStates();
      if(aValidRoutes.indexOf(sRouteName) >= 0){
        //remove pending attachments

        this.getById("uploadCollection").destroyItems();
        this.getById("uploadCollection").removeAllAggregation("items");
        this.getModel().setData({});
        this.getModel("ContractModel").setData({});
        // this.getView().unbindElement();
        var data = {
          busy : false,
          delay : 0,
          title: "",
          vhDisplay: {},
          enablePhasingAction: false,
          approvalMandatory: false,
          isPO: true,
          route: sRouteName,
          enableSubmit: false,
          enableGr:false,
          editMode:false,
          createMode: false,
          isSingle: null,
          isContractOnly: null,
          isDraft: null
          };
        this.getModel("viewModel").setData(data);
        var createPromise = jQuery.Deferred();
        if(["editPODoc", "editPO", "copyPODoc"].indexOf(sRouteName) >= 0){
          if(sRouteName === "editPO"){
            if (!this._poSearchDlg) {
              this._poSearchDlg = sap.ui.xmlfragment(this.createId("poSearchDlg"), "fss.ssp.view.fragments.poSearchDlg", this);
              this.getView().addDependent(this._poSearchDlg);
            }
            this._poSearchDlg.createPromise = createPromise;
            this._poSearchDlg.open();
          }
          else{
            createPromise.resolve();
          }
          createPromise.then(function(poNum){
            if(!poNum){
              poNum = oEvent.getParameter("arguments").docId;
            }

            this._bindViewPo(poNum, sRouteName === "copyPODoc" ? false : true, sRouteName === "copyPODoc" ? true : false).then(function(oData){
              if(!oData){
                return;
              }

              if(oData.IsSinglePO){
                if(sRouteName === "copyPODoc"){
                  this.getRouter().navTo("copyContractDoc", {
                    docId: oData.ContractNumber
                  }, true);
                }
                else{
                  this.getRouter().navTo("editDoc", {
                    docId: oData.ContractNumber
                  }, true);
                }
                return;
              }

              if(sRouteName !== "copyPODoc"){
                this.getModel("viewModel").setProperty("/editMode", true);

                var docSaveType = ""; //(oData.IsDraft) ? this.getResourceBundle().getText("title.draft") : "";
                data.title = this.getResourceBundle().getText("editPoTitle", [docSaveType]);
                this.setFLPTitle(data.title);
              }

              this.getModel("viewModel").updateBindings();
              this.getOwnerComponent().loadUser().then(function(oUser){
                if(oUser){
                  // this.getModel().setProperty("/ApprovalDetails/DelegateID", oUser.ManagerID);
                  this.getModel("viewModel").setProperty("/UserId", oUser.UserId);
                }
              }.bind(this));

            }.bind(this));
          }.bind(this),
          function(){
            if(this._poSearchDlg){
              this._poSearchDlg.createPromise = null;
            }
          }.bind(this));

        }
        else{//If Create mode
          var contractNo = oEvent.getParameter("arguments").docId;
          data.title = this.getResourceBundle().getText("createPoTitle");
          this.setFLPTitle(data.title);
          this.getModel("viewModel").setProperty("/createMode", true);

          if(contractNo){
            createPromise.resolve(contractNo);
          }
          else{
            this.getModel("viewModel").setProperty("/isDraft", false);
            this.getModel("viewModel").setProperty("/isSingle", false);
            this.getModel("viewModel").setProperty("/isContractOnly", true);
            if (!this._contractSearchDlg) {
              this._contractSearchDlg = sap.ui.xmlfragment(this.createId("contractSearchDlg"), "fss.ssp.view.fragments.contractSearchDlg", this);
              this.getView().addDependent(this._contractSearchDlg);
            }
            this._contractSearchDlg.setModel(this.getModel("viewModel"), "viewModel");
            this._contractSearchDlg.createPromise = createPromise;
            this._contractSearchDlg.open();
          }

          createPromise.then(function(contractNum){
            if(!contractNum){
              return;
            }
            this.prepareDraftData(contractNum).then(function(){
              this.getView().bindElement({path: "/"});

              if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineInvParty){
                this.byId("CreateView").getController().determineInvParty();
              }

              if(this.byId("CreateView") && this.byId("CreateView").getController() && this.byId("CreateView").getController().determineSON){
                this.byId("CreateView").getController().determineSON();
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

              var aVisibleItems = this.getVisibleTabs();
              this.oIconTabBar.setSelectedKey(aVisibleItems[0]);
              this.oIconTabBar.fireSelect();

              this.getModel("viewModel").setProperty("/busy", false);

            }.bind(this));
          }.bind(this),
          function(){
            if(this._contractSearchDlg){
              this._contractSearchDlg.createPromise = null;
            }
          }.bind(this));
        }
      }
    },

    /**
     * Sets default values based on contract details
     * @param {String} contractNumber Parent document number
     * @returns {object} default data for the route
     * @public
     */
    prepareDraftData: function(contractNumber){
      return new Promise(function(fResolve) {
        this.mainModel.metadataLoaded().then(function() {
          var oCtx = this.mainModel.createEntry("/" + this.mainEntitySet);
          var data = oCtx.getObject();

          var sContractPath = this.mainModel.createKey("Contracts", {
                ContractNumber: contractNumber
              });
          var oViewModel = this.getModel("viewModel");
          oViewModel.setProperty("/busy", true);

          var mParameters = {
            urlParameters: {
              "$expand": "ContractLIs,AdminDetails,HeaderTexts,AccountAssignments"
            },
            method: "GET",
            success: function(oData) {
              oViewModel.setProperty("/busy", false);

              util.removeResults(oData);
              if(oData.ContractLIs){
                var liObj = this.mainModel.createEntry("/LineItems").getObject();
                liObj.Status = "";
                oData.ContractLIs.unshift(liObj);
              }
              this.getModel("ContractModel").setData(oData);//setModel(new JSONModel(oData), "ContractModel");
              data.ContractNumber = contractNumber;

              data.IsLegacy = false;
              data.IsSameAddressForAll = true;
              // data.Currency = oData.Currency || "AUD";
              data.PaymentTerms = oData.PaymentTerms || "0020";
              data.IsDraft = true;
              data.Status = Constants.STATUS_NEW;
              data.StatusDesc = Constants.STATUS_NEW_DESC;
              data.StatusDescLong = Constants.STATUS_NEW_DESC;
              // data.IsSection23 = false;
              data.PurchasingGroup = oData.PurchasingGroup || "015";
              data.CompanyCode = oData.CompanyCode;
              data.VendorNumber = oData.VendorNumber;
              data.VendorName = oData.VendorName;
              data.InvoicingPartyNumber = oData.InvoicingPartyNumber;
              data.SON = oData.SON;
              data.Comment = oData.Comment;

              oCtx = this.mainModel.createEntry("/ApprovalDetails");
              data.ApprovalDetails = oCtx.getObject();
              // data.ApprovalDetails.IsSection23 = false;
              oCtx = this.mainModel.createEntry("/ContactDetails");
              data.ContactDetails = oCtx.getObject();
              // oCtx = this.mainModel.createEntry("/DeliveryAddresses");
              // data.DeliveryAddresses = oCtx.getObject();
              // data.DeliveryAddresses.DeliveryType = "RomanCode";

              this.getOwnerComponent().loadUser().then(function(oUser){
                if(oUser){
                  var oModel = this.getModel();
                  oModel.setProperty("/ContactDetails/POContactName", oUser.FullName);
                  oModel.setProperty("/ContactDetails/POContactID", oUser.UserId);
                  oModel.setProperty("/ContactDetails/POContactEmail", oUser.Email);
                  oModel.setProperty("/ContactDetails/POContactPhone", oUser.Phone);
                  // oModel.setProperty("/ContactDetails/InvoiceContactEmail", oUser.Email);
                  // this.getModel().setProperty("/ApprovalDetails/DelegateID", oUser.ManagerID);
                  oViewModel.setProperty("/UserId", oUser.UserId);
                }
              }.bind(this));
              // oCtx = this.mainModel.createEntry("/HeaderTexts");
              data.HeaderTexts = $.extend({}, oData.HeaderTexts);
              data.HeaderTexts.ParentNumber = undefined;

              data.Phasings = [];
              data.AccountAssignments = [];
              data.DeliveryAddresses = [];
              data.Attachments = [];
              data[this.mainLiEntitySet] = [];
              this.getModel().setData(data);
              fResolve();

            }.bind(this),
            error: function(oError) {
              oViewModel.setProperty("/busy", false);
              fResolve();
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

              MessageBox.error(this.getResourceBundle().getText("bindview.error", [contractNumber, aErrors[0].message]), {
                actions: [MessageBox.Action.OK],
                onClose: function() {
                  this.getRouter().navTo("worklist", {}, true);
                }.bind(this)
              });

            }.bind(this)
          };

          this.mainModel.read("/" + sContractPath, mParameters);

        }.bind(this));
      }.bind(this));
    },

    resetDataForCopy: function(){
      var oViewModel = this.getModel("viewModel");
      var sTitle = this.getResourceBundle().getText("createPoTitle");
      oViewModel.setProperty("/title", sTitle);
      this.setFLPTitle(sTitle);
      oViewModel.setProperty("/createMode", true);
      oViewModel.setProperty("/editMode", false);
      oViewModel.setProperty("/vhDisplay/DelegateEID", undefined);
      oViewModel.setProperty("/vhDisplay/DelegateName", undefined);

      var oModel = this.getModel();
      var sPath = util.getContextPath(this.getView());
      oModel.setProperty(sPath + "Attachments", []);
      oModel.setProperty(sPath + "ConsumptionGRs", []);
      oModel.setProperty(sPath + "ConsumptionIRs", []);
      oModel.setProperty(sPath + "ConsumptionSummary", {});
      oModel.setProperty(sPath + "Approvals", []);
      oModel.setProperty(sPath + "ChangeLogs", []);
      oModel.setProperty(sPath + "ApprovalDetails", this.mainModel.createEntry("/ApprovalDetails").getObject());
      oModel.setProperty(sPath + "HeaderTexts", this.mainModel.createEntry("/HeaderTexts").getObject());

      oModel.setProperty(sPath + "PONumber", undefined);
      oModel.setProperty(sPath + "YourReference", undefined);
      oModel.setProperty(sPath + "IsDraft", true);
      oModel.setProperty(sPath + "Status", Constants.STATUS_NEW);
      oModel.setProperty(sPath + "StatusDesc", Constants.STATUS_NEW_DESC);
      oModel.setProperty(sPath + "StatusDescLong", Constants.STATUS_NEW_DESC);

      var objArray = oModel.getProperty(sPath + "PurchaseOrderLIs");

      var nonCopyFields = ["ParentNumber", "IsNonDeletable", "IsFinalInvoice", "IsDeliveryComplete", "IsUOMChangeable", "StatusDesc",
                "AssignedQty", "IsCloseable", "DvdQuantity", "InvQuantity", "AssignedValDocCurr",
                      "IsRateChanged"];

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
      oModel.setProperty(sPath + "PurchaseOrderLIs", objArray);

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
    }
  });

});