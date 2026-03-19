sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "fss/ssp/model/util",
  "fss/ssp/model/formatter",
  "fss/ssp/model/Constants"

], function(BaseController, Filter, FilterOperator,JSONModel, MessageBox, util, formatter, Constants) {
  "use strict";

  /**
   * This controller manages create/edit functionality for Line items. It performs the required validations.
   */
  return BaseController.extend("fss.ssp.controller.CreateContractLI", {
    formatter : formatter,
    constants: Constants,

    fundConfig: {
      "A": ["Asset", "AssetSubNumber"],
      "F": ["GLAccount", "CostCentre"],
      "K": ["GLAccount", "CostCentre"],
      "P": ["GLAccount", "WBSElement"],
      "T": ["GLAccount", "CostCentre"],
      "X": ["GLAccount", "CostCentre"]
    },

    onInit: function() {
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.createLIDlgId = "createLIDlg";
      this.displayLIDlgId = "displayLIDlg";
      this.createLITextDlgId = "createLITextDlg";
      this.displayLITextDlgId = "displayLITextDlg";
      this.setDefaultValues();
      this.byId("liTable").bindItems({path: this.liEntitySet, template: this.byId("liListItem").clone()});
    },

    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      this.liEntitySet = "ContractLIs";
      this.liFragment = "fss.ssp.view.fragments.createLi";
      // this.liFragment = "fss.ssp.view.fragments.createLi_tabs";
    },


    _setBoundValue: function(sBoundField, fieldValue, oDialog){
      BaseController.prototype._setBoundValue.apply(this, arguments);
      sBoundField = sBoundField.replace("AssignmentModel>", "");
      if(sBoundField.replace("/", "") !== "Asset"){
        this.determineFunds(oDialog, sBoundField, fieldValue);
      }
    },


    determineFunds: function(oDialog, sUpdatedField, newValue){
      //if both params are empty, we are just getting the fund details based on current screen situation.
      var oData = oDialog.getModel().getData();
      if(!oData.AssignmentTypeCode || !this.fundConfig[oData.AssignmentTypeCode]){
        return;
      }

      //if an unrelated feild is updated
      if(!sUpdatedField || this.fundConfig[oData.AssignmentTypeCode].indexOf(sUpdatedField.replace("/", "")) < 0){
        return;
      }

      this.readFunds(oDialog);

    },

    readFunds: function(oDialog){
      //reads the funds from BE.
      var oDlgData = oDialog.getModel().getData();
      var oAssignmentData = oDialog.getModel("AssignmentModel").getData();
      var oFundData = this.getModel("dropDownModel").getProperty("/Funds").slice(0);
      oDialog.getModel("fundModel").setData(oFundData);
      if(!oDlgData.AssignmentTypeCode || !this.fundConfig[oDlgData.AssignmentTypeCode]){
        return;
      }
      var aFilters = [];
      var sCurrFund = oAssignmentData.Fund;
      if(sCurrFund){
        var aCurrFund = oDialog.getModel("fundModel").getData().filter(function(oFund){
            return oFund.Key === sCurrFund;
          });
        //if this was derived and not in the default list of fund
        if(aCurrFund.length === 0){
          // sCurrFund = null;
          aFilters.push(new Filter("Key", FilterOperator.EQ, sCurrFund));
          oDialog.getModel("AssignmentModel").setProperty("/Fund", null);
        }
      }

      var sCtxPath = util.getContextPath(this.getView());

      var oAssignmentConfig = this.fundConfig[oDlgData.AssignmentTypeCode];
      aFilters.push(new Filter("AccountAssignment", FilterOperator.EQ, oDlgData.AssignmentTypeCode));
      aFilters.push(new Filter("CompanyCode", FilterOperator.EQ, this.getModel().getProperty(sCtxPath + "CompanyCode")));

      if(oDlgData.AssignmentTypeCode === "A"){
        if(oAssignmentData.Asset){
          aFilters.push(new Filter("Asset", FilterOperator.EQ, oAssignmentData.Asset));
          aFilters.push(new Filter("AssetSubNumber", FilterOperator.EQ, oAssignmentData.AssetSubNumber || null));
        }
        else{
          return;
        }
      }
      else{
        for(var i in oAssignmentConfig){
          //if not all required data is set
          if((!oAssignmentData[oAssignmentConfig[i]] && Number(oAssignmentData[oAssignmentConfig[i]]) !== 0) || oAssignmentData[oAssignmentConfig[i]] === ""){
            return;
          }
          aFilters.push(new Filter(oAssignmentConfig[i], FilterOperator.EQ, oAssignmentData[oAssignmentConfig[i]]));
        }
      }

      var oFilter = [new Filter({ filters: aFilters, and: true})];
      oDialog.getModel("viewModel").setProperty("/busyFund", true);
      this.getModel("searchHelpModel").read("/Funds",{
          filters: oFilter,
          success: function(oData){
            oDialog.getModel("viewModel").setProperty("/busyFund", false);
            //if not fund was returned for the combination, nothing to be done
            if (!oData || !oData.results || oData.results.length === 0) {
              return;
            }

            for(var i in oData.results){
              oFundData.push({Key: oData.results[i].Key, Value: oData.results[i].Description});
            }

            oDialog.getModel("fundModel").updateBindings();
            if(!sCurrFund){
              oDialog.getModel("AssignmentModel").setProperty("/Fund", oData.results[0].Key);
            }
            else{
              oDialog.getModel("AssignmentModel").setProperty("/Fund", sCurrFund);
            }
          },
          error: function(oError){
            oDialog.getModel("viewModel").setProperty("/busyFund", false);
          }
      }
      );

      // oDialog.getModel().updateBindings(true);
    },

    onMilitaryOperation: function(oEvent){
      var oDialog = util.getImmediateParentByType(oEvent.getSource(), "fss.ssp.controls.Dialog");
      //if it was selected and now deselcted, retrieve the fund code from BE.
      if(oEvent.getParameter("selected") === false){
        oDialog.getModel("AssignmentModel").setProperty("/Fund", null);
        this.readFunds(oDialog);
      }
    },

    _setVHDescriptions: function(oDialog){
      if (!this.getModel("vhConfigModel")) {
        return;
      }
      var vhConfigData = this.getModel("vhConfigModel").getData();
      var vhConfig, fieldName, keyValue;

      var vhControls = oDialog.getControlsByFieldGroupId(["LineItemVH"]);
      for (var i in vhControls) {
        if (vhControls[i] && vhControls[i].getFieldGroupIds().indexOf("LineItemVH") >= 0 && vhControls[i].getValue &&
          vhControls[i].getValue()) {
            vhControls[i].fireChange({
                    newValue: vhControls[i].getValue(),
                    initialLoad: true
                  });
          // var sDialogName = vhControls[i].data().dialogName;
          // vhConfig = vhConfigData[sDialogName];

          // //there is no custom data for dialog name or there is no config available for the dialog, can't do much :). Should never happen.
          // if (!sDialogName || !vhConfig) {
          //  return;
          // }

          // for (fieldName in vhConfig.fieldList) {
          //  if (vhConfig.fieldList[fieldName].isKey) {
          //    keyValue = this._getBoundValue("{" + vhConfig.fieldList[fieldName].boundField, vhControls[i]);
          //    if(keyValue){
          //      vhControls[i].fireChange({
          //        newValue: keyValue,
          //        initialLoad: true
          //      });
          //    }
          //    break;
          //  }
          // }
        }
      }

    },

    onLIBeforeOpen: function(oEvent){
      var oDialog = oEvent.getSource();
      this.readFunds(oDialog);
      this._setVHDescriptions(oDialog);

      //calculate value for Operation flag
      var sFund = oDialog.getModel("AssignmentModel").getProperty("/Fund");
      var oDropDownData = this.getModel("dropDownModel").getData();
      var IsMilitaryOperation ;
      //if Fund is empty or if it's a non operational, set the flag to false, otherwise true
      if(!sFund || !util.validateValueinList(sFund, oDropDownData.Funds, "Key")){
        IsMilitaryOperation = false;
      }
      else{
        IsMilitaryOperation = true;
      }
      oDialog.getModel("viewModel").setProperty("/IsMilitaryOperation", IsMilitaryOperation);
    },

    /**
     * Event handler for table update finished. It calculates the totals and calculates the next line number.
     * @param {sap.ui.base.Event} oEvent the update finished event
     * @public
     */
    onTableUpdateFinished: function(oEvent){
      var data = this.getModel("viewModel").getData(),
        oTable = oEvent.getSource(),
        iTotalItems = oEvent.getParameter("total");
      data.enablePhasing = oEvent.getParameter("total") > 0;
      if ((iTotalItems ||  iTotalItems === 0) && oTable.getBinding("items").isLengthFinal()) {
        data.liTableTitle = this.getResourceBundle().getText("liTableTitleCount", [iTotalItems]);
      } else {
        data.liTableTitle = this.getResourceBundle().getText("liTableTitle");
      }

      var oDropData = this.getModel("dropDownModel").getData();
      var oTaxRates;
      if(oDropData && oDropData.TaxRate){
        oTaxRates = oDropData.TaxRate;
      }

      var oLines = this.getModel().getProperty("/" + this.liEntitySet);
      data.assetUnknown = false;
      data.IsPrepayment = false;
      data.isUnderPrepayThreshold = false;

      var lineTotalEx, lineTotal
      var oNow = new Date();
      var o6Month = new Date(new Date().setMonth(oNow.getMonth() + 6));
      var o31June = (oNow.getMonth() < 6) ? new Date(oNow.getFullYear(), 5, 30, 23, 59, 59) :
                          new Date(oNow.getFullYear() + 1, 5, 30, 23, 59, 59);

      //Check if 'X' has been selected for anyline. If so we need to display a message in Attachments page
      for(var i in oLines){
        if(oLines[i].AssignmentTypeCode === "X"){
          data.assetUnknown = true;
        }

        //check prepayment meets the criteria
        if(oLines[i].IsPrepayment === "Y"){
          data.IsPrepayment = true;
          var lineTotalEx = Number(oLines[i].UnitQty) * Number(oLines[i].UnitPrice);
          var lineTotal = lineTotalEx + ( lineTotalEx  * Number(oTaxRates[oLines[i].TaxCode]));

          if(lineTotal < 100000 || (oLines[i].PrepaymentCompletedDate < o6Month && oLines[i].PrepaymentCompletedDate < o31June)){
            data.isUnderPrepayThreshold = true;
          }
        }
      }

      this.getModel("viewModel").updateBindings();

      this.calculateLinesTotalValue();

      this.lineNumber = 0;
      if(this.getView().getBindingContext()){
        var sPath = util.getContextPath(this.getView());
        if(this.getModel().getProperty(sPath + this.liEntitySet)){
          this.lineNumber = this.getModel().getProperty(sPath + this.liEntitySet).length;
          if(iTotalItems > 0){
            var obj = oTable.getItems()[oTable.getItems().length - 1].getBindingContext().getObject();
            if(obj.LineNumber > this.lineNumber){
              this.lineNumber = obj.LineNumber;
            }
          }
        }
      }
      this.lineNumber++;
      // this.onLISelectionChange();
    },

    /**
     * Goes through the lines and calculates the total values
     * @returns {Object} Object including totals
     * @public
     */
    calculateLinesTotalValue: function(){
      var oResult = {totalEx: 0, totalInc: 0};
      var sPath = util.getContextPath(this.getView());
      var oLines = this.getModel().getProperty(sPath + this.liEntitySet);
      // if(!oLines || oLines.length === 0){
      //  return;
      // }
      var iLineTotal = 0, iTotalInc = 0, oTaxRates;
      var data = this.getModel("dropDownModel").getData();
      var sCurrency = this.getModel().getProperty(sPath + "Currency");
      var sFirstValidLine = null;
      if(data && data.TaxRate){
        oTaxRates = data.TaxRate;

        if(oLines && Array.isArray(oLines)){
          for(var i in oLines){
            if( oLines[i].Status !== Constants.STATUS_LI_DELETED){
              if(!sFirstValidLine){
                sFirstValidLine = oLines[i].LineNumber;
              }
              // sCurrency = oLines[i].Currency;
              if(sCurrency !== oLines[i].Currency){
                iLineTotal = formatter.currencyValueNumber(Number(oLines[i].NetPriceDocCurr) , sCurrency);
                iTotalInc = formatter.currencyValueNumber(iLineTotal + (iLineTotal * Number(oTaxRates[oLines[i].TaxCode]) || null), sCurrency);
              }
              else{
                iLineTotal = formatter.currencyValueNumber(Number(oLines[i].UnitQty || null) * Number(oLines[i].UnitPrice || null) , sCurrency);
                iTotalInc = formatter.currencyValueNumber(iLineTotal + (iLineTotal * Number(oTaxRates[oLines[i].TaxCode]) || null), sCurrency);
              }
              oResult.totalEx += iLineTotal;
              oResult.totalInc += iTotalInc;
            }
          }
        }
      }

      this.getModel("viewModel").setProperty("/firstValidLine", sFirstValidLine);

      this.getModel("viewModel").setProperty("/totalEx", formatter.currencyValueNumber(oResult.totalEx, sCurrency));
      this.getModel("viewModel").setProperty("/totalInc", formatter.currencyValueNumber(oResult.totalInc, sCurrency));
      if(this.getModel("viewModel").getProperty("/isPO")){
        this.getModel().setProperty(sPath + "TotalValue", formatter.currencyValueNumber(oResult.totalInc, sCurrency));
      }
      return oResult;
    },

    /**
     * Event handler when More button gets pressed. It opens the Actionsheet for More.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onMore: function(oEvent){
      var oButton = oEvent.getSource();

      // create action sheet only once
      if (!this._moreActionSheet) {
        this._moreActionSheet = sap.ui.xmlfragment(
          "fss.ssp.view.fragments.createContractLiMoreAction",
          this
        );
        this.getView().addDependent(this._moreActionSheet);
      }
      this._moreActionSheet.setBindingContext(oButton.getBindingContext());

      this._moreActionSheet.openBy(oButton);
    },

    /**
     * Event handler when GL value help gets pressed. It was supposed to distinguish between service
     * and non-service GL accounts. For now it just calls the standard framework request.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onGLValueHelpRequest: function(oEvent){
      //set IsGoods and IsServices from the main model
      // this.getView().getBindingContext().getObject();
      // var sPath = util.getContextPath(this.getView());
      // var obj = this.getModel().getProperty(sPath + "AdminDetails");

      // if(!obj || (!obj.IsGoods && !obj.IsServices)){
      //  MessageBox.error(this.getResourceBundle().getText("GLAccountPurchaseTypeError"));
      //  return;
      // }

      // var sDialogName = oEvent.getSource().data().dialogName;
      // var vhConfigData = this.getModel("vhConfigModel").getData();
        // var vhConfig = vhConfigData[sDialogName];
        // vhConfig.fieldList.IsServices.value = obj.IsServices ? obj.IsServices : undefined;
        // vhConfig.fieldList.IsGoods.value = obj.IsGoods ? obj.IsGoods : undefined;
        this.onValueHelpRequest(oEvent);
    },

    /**
     * It validates Form entries before openning CreateLI dilog to ensure pre-requisits are sets.
     * @returns {boolean} True if validation is successful, false otherwise
     * @public
     */
    preAddValidate: function(){
      var oCtx = this.getView().getBindingContext();
      //Show an error if contract's total value is not entered
      // if(!oCtx.getObject().TotalValue){
      //  MessageBox.error(
      //    this.getResourceBundle().getText("dlg.noTotalAmount.error"),
      //          {styleClass: "sapUiSizeCompact", actions: [MessageBox.Action.OK]}
      //  );
      //  return false;
      // }
      //Show an error if Company Code is not selected
      if(!oCtx.getObject().CompanyCode){
        MessageBox.error(
          this.getResourceBundle().getText("dlg.noCompanyCode.error"),
                {styleClass: "sapUiSizeCompact", actions: [MessageBox.Action.OK]}
        );
        return false;
      }
      return true;
    },


    /**
     * Event handler when Add line item button gets pressed. It opens the line item dialog. It's used for Copy too.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @param {Object} initObj the initial object for Copy scenario
     * @public
     */
    onAddLI: function(oEvent, initObj, initAssignment){
      var oCtx = this.getView().getBindingContext();

      if(!this.preAddValidate()){
        return;
      }

      this.initAddDlg();

      this.clearMandatoryDlg(this.addLiDlg);
      this.addLiDlg.setModel(this.getView().getModel(), "DocumentModel");
      this.addLiDlg.setBindingContext(oCtx, "DocumentModel");
      var sCtxPath = util.getContextPath(this.getView());
      var aLis = this.getModel().getProperty(sCtxPath + this.liEntitySet);
      var bEnableCopy = aLis.length > 0 && aLis[aLis.length - 1].Distribution === "0";
      var viewModelData = {IsAdd: true, EnableCopy: bEnableCopy, InitObj: initObj ? $.extend({}, initObj) : null};
      this.addLiDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");

      var obj = {};
      var oAssignment;
      if(initObj){
        obj = initObj;
        oAssignment = initAssignment ? initAssignment : this.mainModel.createEntry("/AccountAssignments").getObject();
      }
      else{
        obj = this.mainModel.createEntry("/LineItems").getObject();
        if(this.getModel("viewModel").getProperty("/isContract", true)){
          obj.OrderUnit = Constants.ORDER_UNIT_DEFAULT;
          obj.MaterialGroup = Constants.MATERIAL_GROUP_DEFAULT;
          // if(this.getModel().getProperty(sCtxPath + "AdminDetails/IsServices") && !this.getModel().getProperty(sCtxPath + "AdminDetails/IsGoods")){
          //  obj.MaterialGroup = Constants.MATERIAL_GROUP_DEFAULT_SERVICE;
          // }
          // else{
          //  obj.MaterialGroup = Constants.MATERIAL_GROUP_DEFAULT_GOODS;
          // }
        }
        obj.NetPrice = null;
        obj.Distribution = "0";
        obj.Currency = oCtx.getObject().Currency;
        obj.ESP = this.getModel().getProperty(sCtxPath + "AdminDetails/IsContractorConsultant") === "Y" ? null : "NONSERVICE";
        oAssignment = this.mainModel.createEntry("/AccountAssignments").getObject();
      }

      this.addLiDlg.getModel("DisplayModel").setData({});
      this.addLiDlg.getModel().setData(obj);
      this.addLiDlg.getModel("AssignmentModel").setData(oAssignment);
      this.addLiDlg.getModel("AssignmentModel").updateBindings(true);
      this.addLiDlg.getModel().updateBindings(true);
      // this.readFunds(this.addLiDlg);

      this.addLiDlg.open();
    },

    // onAddAccountAssignment: function(oEvent){
    //  var obj = this.mainModel.createEntry("/AccountAssignments").getObject();
    //  var aAAList = oEvent.getSource().getModel().getData().AccountAssignments;
    //  aAAList.push(obj);
    //  oEvent.getSource().getModel().updateBindings();
    // },

    /**
     * Event handler when Add button gets pressed. It validates and adds a line to line items
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddLIConfirm: function(oEvent){
      if(!this.validateDialog()){
        this.addLiDlg.getModel("ErrorModel").updateBindings(true);
        return;
      }
      var obj = this.addLiDlg.getModel().getData();
      var oAssignment = null;
      if(obj.Distribution === "0"){//Single Account Assignment. Assignment will be added in addLineItem function
        oAssignment = this.addLiDlg.getModel("AssignmentModel").getData();
      }
      else{//Multi Account Assignment
        var oCopyObj = this.addLiDlg.getModel("viewModel").getData().InitObj;

        //see if this was a copy operation and Distribution and AAType was not changed in the dialog, copy the AAs from the original line
        if(oCopyObj && obj.Distribution === oCopyObj.Distribution && obj.AssignmentTypeCode === oCopyObj.AssignmentTypeCode &&
            Number(obj.ParentLineNumber || null) === Number(oCopyObj.ParentLineNumber || null)){
          var sPath = util.getContextPath(this.getView());
          var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");

          //clone the existing assignments
          var aLiAssignments = JSON.parse(JSON.stringify(this.getAssignmentsForLine(oCopyObj.LineNumber)));
          var aLockedLines = [];
          for(var i in aLiAssignments){
            aLiAssignments[i].ParentNumber = undefined;
            aLiAssignments[i].ItemLineNumber = this.lineNumber + "";
            aLiAssignments[i].AssignmentLineNumber = Number(i) + 1 + "";
            aLiAssignments[i].IsDeleted = false;

            if(aLiAssignments[i].IsLocked_Asset){
              aLockedLines.push("Seq " + formatter.lineNumberFormatter(aLiAssignments[i].AssignmentLineNumber) +
                  ", Asset " + formatter.assetValueHelpDisplay.bind(this)(aLiAssignments[i].Asset, aLiAssignments[i].AssetSubNumber, aLiAssignments[i].AssetDesc));
              aLiAssignments[i].Asset = null;
              aLiAssignments[i].AssetDesc = null;
              aLiAssignments[i].AssetSubNumber = null;
              aLiAssignments[i].IsLocked_Asset = false;
            }
            if(aLiAssignments[i].IsLocked_GLAccount){
              aLockedLines.push("Seq " + formatter.lineNumberFormatter(aLiAssignments[i].AssignmentLineNumber) +
                  ", GL Account " + formatter.valueHelpDisplay.bind(this)(aLiAssignments[i].GLAccount, aLiAssignments[i].GLAccountDesc));
              aLiAssignments[i].GLAccount = null;
              aLiAssignments[i].GLAccountDesc = null;
              aLiAssignments[i].IsLocked_GLAccount = false;
            }
            if(aLiAssignments[i].IsLocked_WBSElement){
              aLockedLines.push("Seq " + formatter.lineNumberFormatter(aLiAssignments[i].AssignmentLineNumber) +
                  ", WBS Element " + formatter.valueHelpDisplay.bind(this)(aLiAssignments[i].WBSElement, aLiAssignments[i].WBSElementDesc));
              aLiAssignments[i].WBSElement = null;
              aLiAssignments[i].WBSElementDesc = null;
              aLiAssignments[i].IsLocked_WBSElement = false;
            }
            if(aLiAssignments[i].IsLocked_InternalOrder){
              aLockedLines.push("Seq " + formatter.lineNumberFormatter(aLiAssignments[i].AssignmentLineNumber) +
                  ", Internal Order " + formatter.valueHelpDisplay.bind(this)(aLiAssignments[i].InternalOrder, aLiAssignments[i].InternalOrderDesc));
              aLiAssignments[i].InternalOrder = null;
              aLiAssignments[i].InternalOrderDesc = null;
              aLiAssignments[i].IsLocked_InternalOrder = false;
            }
            if(aLiAssignments[i].IsLocked_CostCentre){
              aLockedLines.push("Seq " + formatter.lineNumberFormatter(aLiAssignments[i].AssignmentLineNumber) +
                  ", Cost Centre " + formatter.valueHelpDisplay.bind(this)(aLiAssignments[i].CostCentre, aLiAssignments[i].CostCentreDesc));
              aLiAssignments[i].CostCentre = null;
              aLiAssignments[i].CostCentreDesc = null;
              aLiAssignments[i].IsLocked_CostCentre = false;
            }

            aAssignments.push(aLiAssignments[i]);
          }
          if(aLockedLines.length > 0){
            util.displayWarnings(aLockedLines, "Please update the following Account Assignments for the new line item as they are locked.");
          }
          this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
        }
      }

      this.addLineItem(obj, oAssignment);

      this.addLiDlg.close();
    },

    addLineItem: function(obj, oAssignment){
      var sPath = util.getContextPath(this.getView());

      obj.LineNumber =  this.lineNumber + "";
      obj.Status = "";
      obj.IsRateChanged = true;

      if(obj.Distribution === "0" && oAssignment){
        oAssignment.ItemLineNumber = obj.LineNumber;
        oAssignment.AssignmentLineNumber = this.getNextAssignmentLine(obj.LineNumber);
        oAssignment.IsDeleted = false;
        oAssignment.ParentNumber = undefined;
        var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");
        aAssignments.push($.extend({}, oAssignment));
        this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
      }

      var currencyFactors = this.getModel("dropDownModel").getProperty("/CurrencyFactor") || {};
      var sDocCurr = this.getModel().getProperty(sPath + "Currency");
      var iFactor = (sDocCurr !== obj.Currency && obj.Currency) ? currencyFactors[obj.Currency] || 1 : 1;

      obj.NetPriceDocCurr = (obj.UnitPrice || 0) * (obj.UnitQty || 0) * (Number(obj.ExchangeRate) || 1) / iFactor;

      var aContractLIs = this.getModel().getProperty(sPath + this.liEntitySet);

      if(!this.getModel().getProperty(sPath + "IsContractOnly")){
        var aPhasings = this.getModel().getProperty(sPath + "Phasings");
        if(aPhasings){
          var phasingObj = this.mainModel.createEntry("/Phasings").getObject();
          phasingObj.PhasingLineNumber = "1";
          phasingObj.ItemLineNumber = obj.LineNumber;
          phasingObj.LineDescription = obj.LineDescription;
          phasingObj.SchQuantity = obj.UnitQty;
          phasingObj.DeliveryDate = obj.DeliveryDate;
          phasingObj.IsDeleted = false;
          aPhasings.push(phasingObj);
          this.getModel().setProperty(sPath + "Phasings", aPhasings);
        }

        var oAddressObj = this.mainModel.createEntry("/DeliveryAddresses").getObject();
        oAddressObj.LineNumber = obj.LineNumber;
        var aAddresses = this.getModel().getProperty(sPath + "DeliveryAddresses");
        aAddresses.push(oAddressObj);
        this.getModel().setProperty(sPath + "DeliveryAddresses", aAddresses);

        //if sameAddress checkbox is ticked, make sure the new line gets that address
        if(!this.addressController){
          this.addressController = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView").byId("CreateContactView").getController();
        }

        this.addressController.applySameAddress();
      }
      aContractLIs.push(obj);
      this.getModel().setProperty(sPath + this.liEntitySet, aContractLIs);
      this.getModel().updateBindings();
    },

    /**
     * Event handler when Cancel button gets pressed. It closes the associating dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddLICancel: function(oEvent){
      if(this.addLiDlg){
        this.addLiDlg.close();
      }
      if(this.displayLiDlg){
        this.displayLiDlg.close();
      }

    },

    initAddDlg: function(){
      if (!this.addLiDlg) {
        this.addLiDlg = sap.ui.xmlfragment(this.createId(this.createLIDlgId), this.liFragment, this);
        this.addLiDlg.setModel(new JSONModel({}));
        this.addLiDlg.setModel(this.getView().getModel(), "DocumentModel");
        this.addLiDlg.setModel(new JSONModel({}), "ErrorModel");
        this.addLiDlg.setModel(new JSONModel({}), "DisplayModel");
        this.addLiDlg.setModel(new JSONModel({}), "AssignmentModel");
        util.setDefaultPlacementTextVH(this.addLiDlg.getContent(), this);
        this.getView().addDependent(this.addLiDlg);
        this.addLiDlg.setModel(new JSONModel({}), "fundModel");
        this.addLiDlg.getModel("fundModel").setSizeLimit(1000);
      }
    },

    validateAllEntries: function(aErrors){
      this.initAddDlg();
      var oCtx = this.getView().getBindingContext();
      this.addLiDlg.setBindingContext(oCtx, "DocumentModel");
      var sPath = util.getContextPath(this.getView());
      var aLIs = this.getModel().getProperty(sPath + this.liEntitySet);

      var obj, aPhasings, enableQtyDate, oConsumptions, hasConsumption, viewModelData;
      for(var i in aLIs){
        obj = aLIs[i];
        if(obj.Status === Constants.STATUS_LI_NONE){
          aPhasings = this.getPhasingsForLine(obj.LineNumber);
          enableQtyDate = (aPhasings && aPhasings.length > 1) ? false : true;
          oConsumptions = this.getConsumptionsPerLine(obj.LineNumber);
          hasConsumption = (oConsumptions.consumptionIRs.length > 0 || oConsumptions.consumptionGRs.length > 0);
          viewModelData = {IsEdit: true, enableQtyDate: enableQtyDate, hasConsumption: hasConsumption};
          this.addLiDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
          var oData = $.extend({}, obj);
          this.addLiDlg.getModel().setData(oData);
          if(oData.Distribution === "0"){
            oData = $.extend({}, this.getAssignmentsForLine(oData.LineNumber)[0]);
          }
          else{
            oData = {};
          }
          this.addLiDlg.getModel("AssignmentModel").setData(oData);

          this.addLiDlg.getModel("DisplayModel").setData({});
          if(!this.validateMandatoryDlg(this.addLiDlg)){
            aErrors.push({message: this.getResourceBundle().getText("validation.error.liMissingMandatory", [formatter.lineNumberFormatter(obj.LineNumber)]),
                  type: sap.ui.core.MessageType.Error });
          }
        }
      }

    },

    /**
     * Performs UI validation for a line item dialog
     * @param {Object} editObj the object representing the line before edit
     * @returns {boolean} True if no issues and false otherwise
     * @public
     */
    validateDialog: function(editObj){
      // var bResult = true;

      var aErrors = [];
      if(!this.validateMandatoryDlg(this.addLiDlg)){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.mandatory"),
                type: sap.ui.core.MessageType.Error });
      }
      var data = this.getModel("dropDownModel").getData();
      var oTaxRates;
      if(data && data.TaxRate){
        oTaxRates = data.TaxRate;
      }

      var oLine = this.addLiDlg.getModel().getData();
      var iContractTotal;
      var decimal = new sap.ui.model.odata.type.Decimal({decimals: 3, groupingEnabled: false});
      oLine.UnitQty = decimal.formatValue(oLine.UnitQty, "string");
      oLine.UnitPrice = formatter.currencyValueNumber(oLine.UnitPrice, oLine.Currency);

      var lineTotalEx = Number(oLine.UnitQty) * Number(oLine.UnitPrice);
      var lineTotal = lineTotalEx + ( lineTotalEx  * Number(oTaxRates[oLine.TaxCode]));

      if((Number(oLine.UnitQty) === 0 || Number(oLine.UnitPrice) === 0) && !oLine.IsZeroLine){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.lineTotalZero"),
              type: sap.ui.core.MessageType.Error });
      }
      else{
        // var lineTotalEx = Number(oLine.UnitQty) * Number(oLine.UnitPrice);
        // var lineTotal = lineTotalEx + ( lineTotalEx  * Number(oTaxRates[oLine.TaxCode]));
        // iContractTotal = this.getModel().getProperty("/TotalValue");
        // if(!iContractTotal ||  lineTotal > iContractTotal){
        //  aErrors.push({message: this.getResourceBundle().getText("validation.error.lineValueExceedTotal"),
        //        type: sap.ui.core.MessageType.Error });
        // }


        // var oTotals = this.calculateLinesTotalValue();
        // var data = this.getModel("dropDownModel").getData();
        // var oTaxRates;
        // if(data && data.TaxRate){
        //  oTaxRates = data.TaxRate;
        // }
        // var iLineEx = Number(oLine.UnitQty) * Number(oLine.UnitPrice);
        // var iNewTotal = oTotals.totalInc + iLineEx + ( iLineEx  * Number(oTaxRates[oLine.TaxCode]));
        // if(editObj){//if this is an edit, make sure we deduct the old total from newTotal
        //  var iOldLineEx = Number(editObj.UnitQty) * Number(editObj.UnitPrice);
        //  var iOldLineTotal = iOldLineEx + ( iOldLineEx  * Number(oTaxRates[editObj.TaxCode]));
        //  iNewTotal -= iOldLineTotal;
        // }
        // var iContractTotal = this.getModel().getProperty("/TotalValue");
        // if(!iContractTotal ||  iNewTotal > iContractTotal ){
        //  aErrors.push({message: this.getResourceBundle().getText("validation.error.lineTotalExceed"),
        //        type: sap.ui.core.MessageType.Error });

        // }
      }
      if(oLine.AssignmentTypeCode === "X" && oLine.Distribution !== "0"){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.assetUnknowsNonSingle"),
              type: sap.ui.core.MessageType.Error });
      }
      if(oLine.AssignmentTypeCode === "U" && oLine.Distribution !== "0"){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.unknowsNonSingle"),
              type: sap.ui.core.MessageType.Error });
      }

      if(!oLine.IsReturn && Number(oLine.UnitQty) < 0 ){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.liQtyNeg"),
              type: sap.ui.core.MessageType.Error });
      }

      if(oLine.IsReturn && Number(oLine.UnitQty) > 0 ){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.liQtyReturn"),
              type: sap.ui.core.MessageType.Error });
      }

      var bResult = aErrors.length === 0;
      this.addLiDlg.getModel("ErrorModel").setProperty("/errors", aErrors);
      this.addLiDlg.getModel("ErrorModel").updateBindings();

      if(!bResult){
        var errorBtn = this.byId(sap.ui.core.Fragment.createId(this.createLIDlgId, "errorBtn"));
        this.showErrorPopover(errorBtn);
      }
      else{
        var viewModel = this.getModel("viewModel");

        if(!viewModel.getProperty("/isPO")){
          var sPath = util.getContextPath(this.getView());
          var startDate = this.getModel().getProperty(sPath + "StartDate"),
          endDate = this.getModel().getProperty(sPath + "EndDate");
          var aWarningMsg = [];//"";
          var dNow = new Date(new Date().setHours(0,0,0,0));
          var dFuture = new Date(new Date(new Date().setFullYear(new Date().getFullYear() + Constants.DELIVERY_DATE_FUTURE_YEARS)).setHours(23,59,59,0));

          if(oLine.DeliveryDate && ((startDate && startDate > oLine.DeliveryDate) || (endDate && endDate < oLine.DeliveryDate))){
            aWarningMsg.push(this.getResourceBundle().getText("li.date.warning"));
          }
          else if(oLine.DeliveryDate && (oLine.DeliveryDate < dNow || oLine.DeliveryDate > dFuture)){
            aWarningMsg.push(this.getResourceBundle().getText("li.deldate.warning"));
          }

          var oNow = new Date()
          var o6Month = new Date(new Date().setMonth(oNow.getMonth() + 6));
          var o31June = (oNow.getMonth() < 6) ? new Date(oNow.getFullYear(), 5, 30, 23, 59, 59) :
                          new Date(oNow.getFullYear() + 1, 5, 30, 23, 59, 59);
          if(oLine.IsPrepayment === 'Y' && (lineTotal < 100000 || (oLine.PrepaymentCompletedDate < o6Month && oLine.PrepaymentCompletedDate < o31June))){
              aWarningMsg.push(this.getResourceBundle().getText("li.prepaymentThreshold.warning"));
          }

          // var lineTotalEx = Number(oLine.UnitQty) * Number(oLine.UnitPrice);
          // if(this.getModel().getProperty(sPath + "Currency") !== oLine.Currency){
          //  lineTotalEx = lineTotalEx * (Number(oLine.ExchangeRate) || 1);
          // }
          // var lineTotal = lineTotalEx + ( lineTotalEx  * Number(oTaxRates[oLine.TaxCode]));
          // iContractTotal = formatter.currencyValueNumber(this.getModel().getProperty(sPath + "TotalValue"),
          //            this.getModel().getProperty(sPath + "Currency"));
          // lineTotal = formatter.currencyValueNumber(lineTotal, this.getModel().getProperty(sPath + "Currency"));
          // if(iContractTotal &&  lineTotal > iContractTotal){
          //  aWarningMsg.push(this.getResourceBundle().getText("validation.error.lineValueExceedTotal"));
          // }
        }


        var isServices = this.getModel().getProperty(sPath + "AdminDetails/IsServices");
        if(isServices &&  Number(oLine.UnitQty) === 1.0){
          // aWarningMsg = (aWarningMsg === "") ? aWarningMsg : aWarningMsg + "\n\n";
          aWarningMsg.push(this.getResourceBundle().getText("validation.warning.serviceQty"));
        }


        if(aWarningMsg){
          util.displayWarnings(aWarningMsg);
          // MessageBox.warning(aWarningMsg,  {styleClass: "sapUiSizeCompact", actions: [MessageBox.Action.OK]});
        }
      }

      return bResult;
    },

    /**
     * Event handler when a line gets pressed. if in Display Mode, it displays the dialog in display,
     * otherwise, set the table's selection to this item and call Edit
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onLIPress: function(oEvent){
      var viewModel = this.getModel("viewModel");
      var obj = oEvent.getSource().getBindingContext().getObject();
      if(viewModel.getProperty("/displayMode") || obj.Status === Constants.STATUS_LI_LOCKED || obj.Status === Constants.STATUS_LI_DELETED){
        if (!this.displayLiDlg) {
          this.displayLiDlg = sap.ui.xmlfragment(this.createId(this.displayLIDlgId), this.liFragment, this);
          this.displayLiDlg.setModel(new JSONModel({}));
          this.displayLiDlg.setModel(this.getView().getModel(), "DocumentModel");
          this.displayLiDlg.setModel(new JSONModel({}), "AssignmentModel");
          this.getView().addDependent(this.displayLiDlg);
          util.makeFormReadOnly(this.displayLiDlg.getContent());
          this.displayLiDlg.setModel(new JSONModel({errors: []}), "ErrorModel");
          this.displayLiDlg.setModel(new JSONModel({}), "fundModel");
          this.displayLiDlg.getModel("fundModel").setSizeLimit(1000);
          this.displayLiDlg.setModel(new JSONModel({}), "DisplayModel");
        }

        // this.displayLiDlg.getModel("fundModel").setData(this.getModel("dropDownModel").getProperty("/Funds").slice(0));

        var viewModelData = {IsEdit: false, EnableCopy: false};
        this.displayLiDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
        // var obj = oEvent.getSource().getBindingContext().getObject();
        this.displayLiDlg.setModel(this.getView().getModel(), "DocumentModel");
        this.displayLiDlg.setBindingContext(this.getView().getBindingContext(), "DocumentModel");
        var oData = $.extend({}, obj);
        var lineAssignment = this.mainModel.createEntry("/AccountAssignments").getObject();
        if(oData.Distribution === "0"){
          var aAssignments = this.getAssignmentsForLine(oData.LineNumber);
          if(aAssignments.length > 0){
            lineAssignment = $.extend({}, aAssignments[0]);
          }
        }
        this.displayLiDlg.getModel("AssignmentModel").setData(lineAssignment);
        this.displayLiDlg.getModel().setData(oData);
        this.displayLiDlg.getModel("DisplayModel").setData({});
        // this.readFunds(this.displayLiDlg);
        // this.displayLiDlg.getModel().updateBindings(true);
        this.displayLiDlg.open();
      }
      else{
        this.onEditLI(oEvent);
      }
    },

    /**
     * Event handler when Edit line item button gets pressed. It opens the line item dialog with the line's data prefilled.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditLI: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();

      if(!this.preAddValidate()){
        return;
      }

      this.initAddDlg();

      // this.addLiDlg.getModel("fundModel").setData(this.getModel("dropDownModel").getProperty("/Funds").slice(0));
      this.clearMandatoryDlg(this.addLiDlg);
      this.addLiDlg.setModel(this.getView().getModel(), "DocumentModel");
      this.addLiDlg.setBindingContext(this.getView().getBindingContext(), "DocumentModel");

      var aPhasings = this.getPhasingsForLine(obj.LineNumber);
      var enableQtyDate = (aPhasings && aPhasings.length > 1) ? false : true;
      var oConsumptions = this.getConsumptionsPerLine(obj.LineNumber);
      var hasConsumption = (oConsumptions.consumptionIRs.length > 0 || oConsumptions.consumptionGRs.length > 0);
      var sCtxPath = util.getContextPath(this.getView());
      var aLis = this.getModel().getProperty(sCtxPath + this.liEntitySet);
      var iPos = this.getLiPosition(obj.LineNumber);
      var bEnableCopy = iPos > 0 && aLis[iPos - 1].Distribution === "0";
      var viewModelData = {IsEdit: true, EnableCopy: bEnableCopy, enableQtyDate: enableQtyDate, hasConsumption: hasConsumption};
      this.addLiDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
      var oData = $.extend({}, obj);
      this.addLiDlg.getModel().setData(oData);
      this.addLiDlg.getModel().updateBindings();
      var lineAssignment = this.mainModel.createEntry("/AccountAssignments").getObject();
      if(oData.Distribution === "0"){
        var aAssignments = this.getAssignmentsForLine(oData.LineNumber);
        if(aAssignments.length > 0){
          lineAssignment = $.extend({}, aAssignments[0]);

          //if any of the AA is locked, wipe out the value so the user selects a new one
          if(lineAssignment.IsLocked_Asset){
            lineAssignment.Asset = null;
            lineAssignment.AssetDesc = null;
            lineAssignment.AssetSubNumber = null;
          }
          if(lineAssignment.IsLocked_GLAccount){
            lineAssignment.GLAccount = null;
            lineAssignment.GLAccountDesc = null;
          }
          if(lineAssignment.IsLocked_WBSElement){
            lineAssignment.WBSElement = null;
            lineAssignment.WBSElementDesc = null;
          }
          if(lineAssignment.IsLocked_InternalOrder){
            lineAssignment.InternalOrder = null;
            lineAssignment.InternalOrderDesc = null;
          }
          if(lineAssignment.IsLocked_CostCentre){
            lineAssignment.CostCentre = null;
            lineAssignment.CostCentreDesc = null;
          }
        }
      }

      this.addLiDlg.getModel("AssignmentModel").setData(lineAssignment);
      // this.readFunds(this.addLiDlg);
      this.addLiDlg.getModel("DisplayModel").setData({});
      this.addLiDlg.open();
    },

    /**
     * Event handler when Edit's Ok button gets pressed. It validates the data and makes changes to the line.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditLIConfirm: function(oEvent){
      var obj = this.addLiDlg.getModel().getData();
      var oAssignment = $.extend({}, this.addLiDlg.getModel("AssignmentModel").getData());
      var sPath = util.getContextPath(this.getView());
      var aContractLIs = this.getModel().getProperty(sPath + this.liEntitySet);
      var i, j;
      for(i in aContractLIs){
        if(aContractLIs[i].LineNumber === obj.LineNumber){
          if(!this.validateDialog(aContractLIs[i])){
            return;
          }
          obj.Status = obj.Status === Constants.STATUS_LI_DRAFT ? "" : obj.Status;
          if(obj.ExchangeRate !== aContractLIs[i].ExchangeRate){
            obj.IsRateChanged = true;
          }

          var currencyFactors = this.getModel("dropDownModel").getProperty("/CurrencyFactor") || {};
          var sDocCurr = this.getModel().getProperty(sPath + "Currency");
          var iFactor = (sDocCurr !== obj.Currency && obj.Currency) ? currencyFactors[obj.Currency] || 1 : 1;

          obj.NetPriceDocCurr = Number(obj.AssignedValDocCurr || 0) + ((Number(obj.UnitPrice || 0) * (Number(obj.UnitQty || 0) - Number(obj.AssignedQty || 0))) * (Number(obj.ExchangeRate) || 1) / iFactor);

          //if Distribution has changed, delete all AA for line. If new Distribution is Single, if the old is single, replace, if the old is non single, delete then add
          if(aContractLIs[i].Distribution !== obj.Distribution || (obj.Distribution !== "0" && aContractLIs[i].AssignmentTypeCode !== obj.AssignmentTypeCode)){
            this.deleteAssignmentsForLine(obj.LineNumber);
          }


          var bAssignmentFound = false;
          var aAssignments;
          if(obj.Distribution === "0"){
            aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");
            for(j in aAssignments){
              //update the first assignment for the LI if it's not deleted
              if(aAssignments[j].ItemLineNumber === obj.LineNumber && !aAssignments[j].IsDeleted){
                bAssignmentFound = true;
                oAssignment.IsDeleted = false;
                oAssignment.ItemLineNumber = obj.LineNumber;
                oAssignment.AssignmentLineNumber = aAssignments[j].AssignmentLineNumber;

                oAssignment.IsLocked_Asset = false;
                oAssignment.IsLocked_GLAccount = false;
                oAssignment.IsLocked_WBSElement = false;
                oAssignment.IsLocked_InternalOrder = false;
                oAssignment.IsLocked_CostCentre = false;

                aAssignments[j] = oAssignment;
                this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
                break;
              }
            }

            if(!bAssignmentFound){
              oAssignment.ItemLineNumber = obj.LineNumber;
              oAssignment.AssignmentLineNumber = this.getNextAssignmentLine(obj.LineNumber);
              oAssignment.IsDeleted = false;
              aAssignments.push(oAssignment);
              this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
            }
          }
          else{//If Multi AA, check all related AAs and delete LOCKED ones
            aAssignments = this.getAssignmentsForLine(obj.LineNumber);
            var aLockedLines = [];
            for(j in aAssignments){
              if(aAssignments[j].IsLocked_Asset){
                aLockedLines.push("Seq " + formatter.lineNumberFormatter(aAssignments[j].AssignmentLineNumber) +
                    ", Asset " + formatter.assetValueHelpDisplay.bind(this)(aAssignments[j].Asset, aAssignments[j].AssetSubNumber, aAssignments[j].AssetDesc));
                aAssignments[j].Asset = null;
                aAssignments[j].AssetDesc = null;
                aAssignments[j].AssetSubNumber = null;
                aAssignments[j].IsLocked_Asset = false;
              }
              if(aAssignments[j].IsLocked_GLAccount){
                aLockedLines.push("Seq " + formatter.lineNumberFormatter(aAssignments[j].AssignmentLineNumber) +
                    ", GL Account " + formatter.valueHelpDisplay.bind(this)(aAssignments[j].GLAccount, aAssignments[j].GLAccountDesc));
                aAssignments[j].GLAccount = null;
                aAssignments[j].GLAccountDesc = null;
                aAssignments[j].IsLocked_GLAccount = false;
              }
              if(aAssignments[j].IsLocked_WBSElement){
                aLockedLines.push("Seq " + formatter.lineNumberFormatter(aAssignments[j].AssignmentLineNumber) +
                    ", WBS Element " + formatter.valueHelpDisplay.bind(this)(aAssignments[j].WBSElement, aAssignments[j].WBSElementDesc));
                aAssignments[j].WBSElement = null;
                aAssignments[j].WBSElementDesc = null;
                aAssignments[j].IsLocked_WBSElement = false;
              }
              if(aAssignments[j].IsLocked_InternalOrder){
                aLockedLines.push("Seq " + formatter.lineNumberFormatter(aAssignments[j].AssignmentLineNumber) +
                    ", Internal Order " + formatter.valueHelpDisplay.bind(this)(aAssignments[j].InternalOrder, aAssignments[j].InternalOrderDesc));
                aAssignments[j].InternalOrder = null;
                aAssignments[j].InternalOrderDesc = null;
                aAssignments[j].IsLocked_InternalOrder = false;
              }
              if(aAssignments[j].IsLocked_CostCentre){
                aLockedLines.push("Seq " + formatter.lineNumberFormatter(aAssignments[j].AssignmentLineNumber) +
                    ", Cost Centre " + formatter.valueHelpDisplay.bind(this)(aAssignments[j].CostCentre, aAssignments[j].CostCentreDesc));
                aAssignments[j].CostCentre = null;
                aAssignments[j].CostCentreDesc = null;
                aAssignments[j].IsLocked_CostCentre = false;
              }
            }
            if(aLockedLines.length > 0){
              util.displayWarnings(aLockedLines, "Please update the following Account Assignments as they are locked.");
            }
          }

          aContractLIs[i] = obj;

          if(!this.getModel().getProperty(sPath + "IsContractOnly")){
            var aPhasings = this.getPhasingsForLine(obj.LineNumber);
            if(aPhasings && aPhasings.length === 1){
              aPhasings[0].SchQuantity = obj.UnitQty;
              aPhasings[0].DeliveryDate = obj.DeliveryDate;
              this.getModel().updateBindings();
            }
            else if(aPhasings.length === 0){//this was a draft LI which is not ADDED.
              aPhasings = this.getModel().getProperty(sPath + "Phasings");
              if(aPhasings){
                var phasingObj = this.mainModel.createEntry("/Phasings").getObject();
                phasingObj.PhasingLineNumber = "1";
                phasingObj.ItemLineNumber = obj.LineNumber;
                phasingObj.LineDescription = obj.LineDescription;
                phasingObj.SchQuantity = obj.UnitQty;
                phasingObj.DeliveryDate = obj.DeliveryDate;
                phasingObj.IsDeleted = false;
                aPhasings.push(phasingObj);
                this.getModel().setProperty(sPath + "Phasings", aPhasings);
              }
            }
          }

          break;
        }
      }

      this.getModel().setProperty(sPath + this.liEntitySet, aContractLIs);

      this.getModel().updateBindings();
      this.addLiDlg.close();
    },

    getLiPosition: function(lineNumber){
      var sCtxPath = util.getContextPath(this.getView());
      var aLis =  this.getModel().getProperty(sCtxPath + this.liEntitySet);

      for(var i in aLis){
        if(aLis[i].LineNumber === lineNumber){
          return i;
        }
      }
      return null;
    },


    /**
     * Event handler when Copy button gets pressed. It takes the data for the line and calls the Add function
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onCopyLI: function(oEvent){

      var lineObj = $.extend({}, oEvent.getSource().getBindingContext().getObject());
      // List of fields not to be copied.
      var lineAssignment;
      if(lineObj.Distribution === "0"){
        var aAssignments = this.getAssignmentsForLine(lineObj.LineNumber);
        if(aAssignments.length > 0){
          lineAssignment = $.extend({}, aAssignments[0]);
        }
      }
      this.copyLine(lineObj, lineAssignment);

      this.onAddLI(oEvent, lineObj, lineAssignment);
    },

    copyLine: function(lineObj, lineAssignment){
      if (lineObj.__metadata) {
        delete lineObj.__metadata;
      }
      if(lineObj.ParentNumber){
        lineObj.ParentNumber = undefined;
      }
      lineObj.Status = lineObj.Status === Constants.STATUS_LI_DRAFT ? Constants.STATUS_LI_DRAFT : Constants.STATUS_LI_NONE;

      // List of fields not to be copied.
      var nonCopyFields = ["ItemLineNumber", "ParentNumber"];
      if(lineAssignment){
        for(var i in nonCopyFields){
          lineAssignment[nonCopyFields[i]] = undefined;
        }
        if(lineAssignment.IsLocked_Asset){
          lineAssignment.Asset = null;
          lineAssignment.AssetDesc = null;
          lineAssignment.AssetSubNumber = null;
          lineAssignment.IsLocked_Asset = false;
        }
        if(lineAssignment.IsLocked_GLAccount){
          lineAssignment.GLAccount = null;
          lineAssignment.GLAccountDesc = null;
          lineAssignment.IsLocked_GLAccount = false;
        }
        if(lineAssignment.IsLocked_WBSElement){
          lineAssignment.WBSElement = null;
          lineAssignment.WBSElementDesc = null;
          lineAssignment.IsLocked_WBSElement = false;
        }
        if(lineAssignment.IsLocked_InternalOrder){
          lineAssignment.InternalOrder = null;
          lineAssignment.InternalOrderDesc = null;
          lineAssignment.IsLocked_InternalOrder = false;
        }
        if(lineAssignment.IsLocked_CostCentre){
          lineAssignment.CostCentre = null;
          lineAssignment.CostCentreDesc = null;
          lineAssignment.IsLocked_CostCentre = false;
        }
      }

      nonCopyFields = ["IsNonDeletable", "IsFinalInvoice", "IsDeliveryComplete", "IsUOMChangeable",
            "StatusDesc", "AssignedQty", "IsCloseable", "DvdQuantity", "InvQuantity", "AssignedValDocCurr",
            "IsRateChanged"];
      for(i in nonCopyFields){
        lineObj[nonCopyFields[i]] = null;
      }
    },

    onTransferLi: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();
      MessageBox.warning(
        this.getResourceBundle().getText("li.transfer.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              this.transferLine(obj);
            }

          }.bind(this)
        }
      );

    },

    transferLine: function(oLi){
      var newQty = Number(oLi.UnitQty) - Number(oLi.InvQuantity);
      this.closeLine(oLi);

      //if there is no quantity to transfer
      if(Number(newQty) <= 0){
        return;
      }
      var oNewLine = $.extend({}, oLi);
      this.copyLine(oNewLine);
      oNewLine.UnitQty = newQty;
      this.addLineItem(oNewLine);
    },

    onReopenLi: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();
      MessageBox.warning(
        this.getResourceBundle().getText("li.reopen.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              obj.IsFinalInvoice = false;
              this.getModel().updateBindings();
            }
          }.bind(this)
        }
      );
    },

    onCloseLi: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();
      MessageBox.warning(
        this.getResourceBundle().getText("li.close.warning"),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              this.closeLine(obj);
            }
          }.bind(this)
        }
      );

    },

    closeLine: function(oLi){
      oLi.UnitQty = oLi.InvQuantity;
      oLi.IsFinalInvoice = true;
      oLi.IsDeliveryComplete = true;

      if(!this.phasingController){
        this.phasingController = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView").byId("CreatePhasingView").getController();
      }

      this.phasingController.closeLineItem(oLi.LineNumber, oLi.IsGR, oLi.UnitQty);
    },

    /**
     * Event handler when Lock button gets pressed. It changes the status of the line to
     * Locked if it is not. If current status is Locked, it sets the status to Unlocked..
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onLockLi: function(oEvent){
      var oBtn = oEvent.getSource();
      var obj = oBtn.getBindingContext().getObject();
      oBtn.getModel().setProperty(oBtn.getBindingContext().getPath() + "/Status",
      obj.Status === Constants.STATUS_LI_LOCKED ? Constants.STATUS_LI_NONE : Constants.STATUS_LI_LOCKED);

      var sLiPath = util.getContextPath(this.getView()) + this.liEntitySet;
      var aLIs = this.getModel().getProperty(sLiPath);
      this.getModel().setProperty(sLiPath, []);
      this.getModel().setProperty(sLiPath, aLIs);
    },

    /**
     * Event handler when Un-Delete button gets pressed. it calls performDeleteLi to do it.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onUndeleteLi: function(oEvent){
      this.performDeleteLi(oEvent.getSource());
    },

    /**
     * Event handler when Delete button gets pressed. It confirms the delete and if confirmed,
     * it calls performDeleteLI to do it.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onDeleteLI: function(oEvent){
      var oBtn = oEvent.getSource();
      var obj = oBtn.getBindingContext().getObject();

      MessageBox.warning(
        this.getResourceBundle().getText("li.delete.warning", [obj.LineNumber]),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              this.performDeleteLi(oBtn);
            }
          }.bind(this)
        }
      );
    },

    /**
     * Performs the delete action. If the line is a new line(not submitted yet), it will be deleted alongside its phasings,
     * if it has been submitted, it updates the status of the line to Deleted if the status was None or to None(undelete)
     * if the status was Deleted.
     * @param {sap.m.Button} oBtn the button that was pressed
     * @public
     */
    performDeleteLi: function(oBtn){
      var obj = oBtn.getBindingContext().getObject();
      var oModel = oBtn.getModel();

      //If line is Submitted, can be delete or undelete
      if(obj.ParentNumber){
        oModel.setProperty(oBtn.getBindingContext().getPath() + "/Status", obj.Status === Constants.STATUS_LI_DELETED ? Constants.STATUS_LI_NONE : Constants.STATUS_LI_DELETED);
      }
      //If line is created in session - cannot be undeleted.
      else{
        var sPath = util.getContextPath(this.getView());
        var aPhasings = oModel.getProperty(sPath + "Phasings");
        var itemLineNumber, i;
        if(aPhasings){
          itemLineNumber = obj.LineNumber;
          for(i = aPhasings.length - 1; i >= 0; i--){
            if(aPhasings[i].ItemLineNumber === itemLineNumber){
              aPhasings.splice(i, 1);
            }
          }
          oModel.setProperty(sPath + "Phasings", aPhasings);
        }

        this.deleteAssignmentsForLine(obj.LineNumber);

        //before deleting an address, ensure if sameAddress checkbox is ticked, the same address is applied before deletion happens
        if(!this.addressController){
          this.addressController = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView").byId("CreateContactView").getController();
        }
        this.addressController.applySameAddress();

        var aAddresses = oModel.getProperty(sPath + "DeliveryAddresses");
        if(aAddresses){
          for(i = aAddresses.length - 1; i >= 0; i--){
            if(aAddresses[i].LineNumber === obj.LineNumber){
              aAddresses.splice(i, 1);
            }
          }
          oModel.setProperty(sPath + "DeliveryAddresses", aAddresses);
        }

        sPath = oBtn.getBindingContext().getPath();
        var iSlashIndex = sPath.lastIndexOf("/");
        var iItemIndex = sPath.substr(iSlashIndex + 1, sPath.length - iSlashIndex - 1);
        var aLineItems = oModel.getProperty(sPath.substr(0, iSlashIndex));
        aLineItems.splice(iItemIndex, 1);
        oModel.setProperty(sPath.substr(0, iSlashIndex), aLineItems);
      }
      var sLiPath = util.getContextPath(this.getView()) + this.liEntitySet;
      var aLIs = this.getModel().getProperty(sLiPath);
      this.getModel().setProperty(sLiPath, []);
      this.getModel().setProperty(sLiPath, aLIs);
      this.getModel().updateBindings();
    },

    /**
     * Event handler when Save Draft button gets pressed. It adds the LI as a draft without any validation.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onDraftAddConfirm: function(oEvent){
      var sPath = util.getContextPath(this.getView());
      var obj = this.addLiDlg.getModel().getData();

      obj.LineNumber =  this.lineNumber + "";
      obj.Status = Constants.STATUS_LI_DRAFT;

      var currencyFactors = this.getModel("dropDownModel").getProperty("/CurrencyFactor") || {};
      var sDocCurr = this.getModel().getProperty(sPath + "Currency");
      var iFactor = (sDocCurr !== obj.Currency && obj.Currency)? currencyFactors[obj.Currency] || 1 : 1;

      obj.NetPriceDocCurr = (obj.UnitPrice || 0) * (obj.UnitQty || 0) * (obj.ExchangeRate || 1) / iFactor;

      if(!this.getModel().getProperty(sPath + "IsContractOnly")){
        var oAddressObj = this.mainModel.createEntry("/DeliveryAddresses").getObject();
        oAddressObj.LineNumber = obj.LineNumber;
        var aAddresses = this.getModel().getProperty(sPath + "DeliveryAddresses");
        aAddresses.push(oAddressObj);
        this.getModel().setProperty(sPath + "DeliveryAddresses", aAddresses);

        //if sameAddress checkbox is ticked, make sure the new line gets that address
        if(!this.addressController){
          this.addressController = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView").byId("CreateContactView").getController();
        }

        this.addressController.applySameAddress();
      }

      var aContractLIs = this.getModel().getProperty(sPath + this.liEntitySet);
      aContractLIs.push(obj);
      this.getModel().setProperty(sPath + this.liEntitySet, aContractLIs);

      this.getModel().updateBindings();
      this.addLiDlg.close();
    },

    /**
     * Event handler when Save Draft button gets pressed in Edit mode. It Edits the LI without any validation.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onDraftEditConfirm: function(oEvent){
      var obj = this.addLiDlg.getModel().getData();
      var sPath = util.getContextPath(this.getView());
      var aLIs = this.getModel().getProperty(sPath + this.liEntitySet);

      for(var i in aLIs){
        if(aLIs[i].LineNumber === obj.LineNumber){
          aLIs[i] = obj;
          var currencyFactors = this.getModel("dropDownModel").getProperty("/CurrencyFactor") || {};
          var sDocCurr = this.getModel().getProperty(sPath + "Currency");
          var iFactor = (sDocCurr !== obj.Currency && obj.Currency)? currencyFactors[obj.Currency] || 1 : 1;

          obj.NetPriceDocCurr = (obj.UnitPrice || 0) * (obj.UnitQty || 0) * (obj.ExchangeRate || 1) / iFactor;
          break;
        }
      }

      this.getModel().setProperty(sPath + this.liEntitySet, aLIs);

      this.getModel().updateBindings();
      this.addLiDlg.close();
    },

    /**
     * It shows the error popover by calling the function.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddLIError: function(oEvent){
      var errorBtn = oEvent.getSource();
      this.showErrorPopover(errorBtn);
    },

    /**
     * Event handler when Copy Account Assignment button gets pressed.It populates the AccountAssignment details from the previous line.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAccountAssignmentCopy: function(oEvent){
      var sPath = util.getContextPath(this.getView());
      var oLines = this.getModel().getProperty(sPath + this.liEntitySet);
      var oModel = oEvent.getSource().getModel();

      var iPos = this.getLiPosition(oModel.getProperty("/LineNumber")) || oLines.length;

      if(iPos <= 0){
        return;
      }

      oModel.setProperty("/AssignmentTypeCode", oLines[iPos - 1].AssignmentTypeCode || null );
      oModel.setProperty("/Distribution", oLines[iPos - 1].Distribution || null );
      oModel.setProperty("/ESP", oLines[iPos - 1].ESP || null );
      oModel.updateBindings();

      oModel = oEvent.getSource().getModel("AssignmentModel");
      var aFields = ["GLAccount", "GLAccountDesc", "CostCentre", "CostCentreDesc", "Fund", "Asset",
            "AssetDesc", "AssetSubNumber", "WBSElement", "WBSElementDesc", "InternalOrder", "InternalOrderDesc"];

      var aAssignments = this.getAssignmentsForLine(oLines[iPos - 1].LineNumber);

      for(var i in aFields){
        oModel.setProperty("/" + aFields[i], aAssignments[0][aFields[i]] || null );
      }

      oModel.updateBindings();
      var oDialog = util.getImmediateParentByType(oEvent.getSource(), "fss.ssp.controls.Dialog");
      this._setVHDescriptions(oDialog);
      this.readFunds(oDialog);
    },

    onAssignmentTypeChange: function(oEvent){
      if(!this.validateComboBoxChange(oEvent)){
        return;
      }
      this.readFunds(util.getImmediateParentByType(oEvent.getSource(), "fss.ssp.controls.Dialog"));
    },

    onAddLiTextClick: function(oEvent){

      var viewModel = this.getModel("viewModel");
      var obj = oEvent.getSource().getModel().getData();
      var dlg;

      var bDisplayOnly = viewModel.getProperty("/displayMode") || obj.Status === Constants.STATUS_LI_LOCKED || obj.Status === Constants.STATUS_LI_DELETED;
      if(bDisplayOnly){
        if (!this.displayLiTextDlg) {
          this.displayLiTextDlg = sap.ui.xmlfragment(this.createId(this.displayLITextDlgId), "fss.ssp.view.fragments.createLiTextDlg", this);
          this.displayLiTextDlg.setModel(new JSONModel({}));
          oEvent.getSource().addDependent(this.displayLiTextDlg);
          util.makeFormReadOnly(this.displayLiTextDlg.getContent());
        }
        dlg = this.displayLiTextDlg;
      }
      else{
        if (!this.addLiTextDlg) {
          this.addLiTextDlg = sap.ui.xmlfragment(this.createId(this.createLITextDlgId), "fss.ssp.view.fragments.createLiTextDlg", this);
          this.addLiTextDlg.setModel(new JSONModel({}));
          util.setDefaultPlacementTextVH(this.addLiTextDlg.getContent(), this);
          oEvent.getSource().addDependent(this.addLiTextDlg);
        }
        dlg = this.addLiTextDlg;
      }

      var viewModelData = {isDisplay: bDisplayOnly};
      dlg.setModel(new JSONModel($.extend(viewModelData, oEvent.getSource().getModel("viewModel").getData())), "viewModel");
      var oData = $.extend({}, obj);
      dlg.getModel().setData(oData);
      dlg.getModel().updateBindings(true);

      dlg.open();
    },

    /**
     * Event handler when Add button gets pressed. It validates and adds a line to line items
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddLiTextConfirm: function(oEvent){
      var obj = this.addLiTextDlg.getModel().getData();
      this.addLiDlg.getModel().setData(obj);
      this.addLiDlg.getModel().updateBindings(true);

      // var aContractLIs = this.getModel().getProperty(sPath + this.liEntitySet);
      // aContractLIs.push(obj);
      // this.getModel().setProperty(sPath + this.liEntitySet, aContractLIs);
      // if(!this.getModel().getProperty(sPath + "IsContractOnly")){
      //  var aPhasings = this.getModel().getProperty(sPath + "Phasings");
      //  if(aPhasings){
      //    var phasingObj = this.mainModel.createEntry("/Phasings").getObject();
      //    phasingObj.PhasingLineNumber = "1";
      //    phasingObj.ItemLineNumber = obj.LineNumber;
      //    phasingObj.LineDescription = obj.LineDescription;
      //    phasingObj.SchQuantity = obj.UnitQty;
      //    phasingObj.DeliveryDate = obj.DeliveryDate;
      //    phasingObj.IsDeleted = false;
      //    aPhasings.push(phasingObj);
      //    this.getModel().setProperty(sPath + "Phasings", aPhasings);
      //  }
      // }
      // this.getModel().updateBindings();
      this.addLiTextDlg.close();
    },

    /**
     * Event handler when Cancel button gets pressed. It closes the associating dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddLiTextCancel: function(oEvent){
      if(this.addLiTextDlg){
        this.addLiTextDlg.close();
      }
      if(this.displayLiTextDlg){
        this.displayLiTextDlg.close();
      }

    },

  });

});