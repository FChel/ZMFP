sap.ui.define([
  "fss/ssp/controller/CreateContractLI.controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "fss/ssp/model/util",
  "fss/ssp/model/formatter",
  "fss/ssp/model/Constants"

], function(CreateContractLI, Filter, FilterOperator,JSONModel, MessageBox, util, formatter, Constants) {
  "use strict";

  /**
   * This controller manages create/edit functionality for Line items. It extends most of its functionality from CreateContractLI controller.
   */
  return CreateContractLI.extend("fss.ssp.controller.CreatePoLI", {
    formatter : formatter,

    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      this.liEntitySet = "PurchaseOrderLIs";
      this.liFragment = "fss.ssp.view.fragments.createLiPo";
    },

    /**
     * It
     *
     tes Form entries before openning CreateLI dilog to ensure pre-requisits are sets.
     * @returns {boolean} True if validation is successful, false otherwise
     * @public
     */
    preAddValidate: function(){
      return true;
    },

    /**
     * Event handler for table update finished. It calculates the remaining qty for each line of Contract
     * excluding THIS purchase order. Then it calls ContractLI updateFinished to do the rest
     *
     * @param {sap.ui.base.Event} oEvent the update finished event
     * @public
     */
    onTableUpdateFinished: function(oEvent){
      CreateContractLI.prototype.onTableUpdateFinished.apply(this, arguments);
      this.calcContractLinesRemainingExcCurrentPO();
    },

    /**
     * Event handler when Add line item button gets pressed. It uses CreateContractLI's onAddLI and
     * it sets the focus to Select control.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @param {Object} initObj the initial object for Edit scenario
     * @public
     */
    onAddLI: function(oEvent, initObj){
      CreateContractLI.prototype.onAddLI.apply(this, arguments);
      if(!initObj){
        this.addLiDlg.getModel().setProperty("/ESP", null);
      }
      var oSelect = this.byId(sap.ui.core.Fragment.createId(this.createLIDlgId, "contractLiSelect"));
      if(oSelect && !initObj){
        oSelect.focus();
      }
    },

    onAddLIConfirm: function(oEvent){
      if(!this.validateDialog()){
        this.addLiDlg.getModel("ErrorModel").updateBindings(true);
        return;
      }
      var obj = this.addLiDlg.getModel().getData();
      CreateContractLI.prototype.onAddLIConfirm.apply(this, arguments);
      var sPath = util.getContextPath(this.getView());
      if(!this.getModel().getProperty(sPath + "Currency")){
        this.getModel().setProperty(sPath + "Currency", obj.Currency);
        this.getModel().setProperty(sPath + "ExchangeRate", Number(obj.ExchangeRate));
      }

      var oContractLi = this.getContractLineData(obj.ParentLineNumber);
      var oCopyObj = this.addLiDlg.getModel("viewModel").getData().InitObj;

      //if it's a Copy or single distribution, it will be handled by parent Function.
      //The Distribution is not single, If it's not a copy or if it's a copy but OA Line is changed, copy the AAs
      if(obj.Distribution !== "0" && (!oCopyObj || Number(obj.ParentLineNumber || null) !== Number(oCopyObj.ParentLineNumber || null))){
        //if the user has not changed the Distribution or AssignmentTypeCode, copy the AAs from parent line
        if(obj.Distribution === oContractLi.Distribution && obj.AssignmentTypeCode === oContractLi.AssignmentTypeCode){
          var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");

          //clone the existing assignments
          var aLiAssignments = JSON.parse(JSON.stringify(this.getContractAssignmentsForLine(oContractLi.LineNumber)));
          for(var i in aLiAssignments){
            aLiAssignments[i].ParentNumber = undefined;
            aLiAssignments[i].ItemLineNumber = this.lineNumber + "";
            aLiAssignments[i].AssignmentLineNumber = Number(i) + 1 + "";
            aLiAssignments[i].IsDeleted = false;
            aAssignments.push(aLiAssignments[i]);
          }
          this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
        }
      }
    },

    // onEditLIConfirm: function(oEvent){
    //  var obj = this.addLiDlg.getModel().getData();
    //  var sPath = util.getContextPath(this.getView());
    //  var aPoLIs = this.getModel().getProperty(sPath + this.liEntitySet);

    //  var bParentChanged = false;
    //  var oBeforeEdit;
    //  for(var i in aPoLIs){
    //    if(aPoLIs[i].LineNumber === obj.LineNumber){
    //      if(!this.validateDialog(aPoLIs[i])){
    //        break;
    //      }
    //      oBeforeEdit = aPoLIs[i];
    //      if(obj.ParentLineNumber !== oBeforeEdit.ParentLineNumber){
    //        bParentChanged = true;
    //      }
    //    }
    //  }

    //  CreateContractLI.prototype.onEditLIConfirm.apply(this, arguments);

    //  if(oBeforeEdit && bParentChanged){

    //  }

    // },

    getContractAssignmentsForLine: function(sLineNumber){
      var aResults = [];
      var aAssignments = this.getModel("ContractModel").getProperty("/AccountAssignments");
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

    initAddDlg: function(){
      CreateContractLI.prototype.initAddDlg.apply(this, arguments);
      var oSelect = this.byId(sap.ui.core.Fragment.createId(this.createLIDlgId, "contractLiSelect"));
      if(oSelect){
        var sPath = util.getContextPath(this.getView());
        var aLIs = this.getModel().getProperty(sPath + this.liEntitySet);
        var aFilters = [new Filter("Status", FilterOperator.NE, Constants.STATUS_LI_LOCKED),
                new Filter("Status", FilterOperator.NE, Constants.STATUS_LI_DELETED)];

        for(var i in aLIs){
          if(aLIs[i].Status !== Constants.STATUS_LI_DELETED){
            aFilters.push(new Filter("Currency", FilterOperator.EQ, aLIs[i].Currency));
            break;
          }
        }
        oSelect.getBinding("items").filter(new Filter({ filters: aFilters,  and: true}));
        // this.addLiDlg.getModel().setProperty("/ParentLineNumber", oSelect.getItems().length - 1);

        // if(!oSelect.getSelectedItem()){
        //  oSelect.setSelectedIndex(oSelect.getItems().length - 1);
        //  oSelect.fireChange({initialCall: true});
        // }
      }
    },


    /**
     * Calculates the QTY for all po lines linked to the given contract line number
     * @param {int} oAlineNumber contract's lie number
     * @returns {int} the total of QTY used within all current PO lines where Contract LI is the same as oAlineNumber
     * @public
     */
    calculateTotalQtyForLine: function(oAlineNumber){
      var iTotal = 0;

      var oLines = this.getModel().getProperty("/" + this.liEntitySet);
      if(oLines && Array.isArray(oLines)){
        for(var i in oLines){
          if( oLines[i].Status !== Constants.STATUS_LI_DELETED && oLines[i].ParentLineNumber === oAlineNumber){
            iTotal += Number(oLines[i].UnitQty);
            iTotal = Number(iTotal.toFixed(3));
          }
        }
      }
      return iTotal;

    },

    /**
     * Calculates remaining values for each line of the related contract excluding the values
     * used in THIS po. This calculation is only done once.
     * @returns {Object} The object representing remaining for each line
     * @public
     */
    calcContractLinesRemainingExcCurrentPO: function(){
      var oContractModel = this.getModel("ContractModel");
      if(!oContractModel){
        return;
      }
      var oLines = oContractModel.getProperty("/ContractLIs");
      var qtyLeftExPO = this.getModel("viewModel").getProperty("/QtyLeftExPO");

      var sPath = util.getContextPath(this.getView());
      var isDraft = this.getModel().getProperty(sPath + "IsDraft");

      //if the value has already been calculated, do not perform it again
      if(!qtyLeftExPO && oLines){
        qtyLeftExPO = {};
        var totalPoForLine;
        if(oLines && Array.isArray(oLines)){
          for(var i in oLines){
            //if an empty line, continue
            if(!oLines[i].LineNumber){
              continue;
            }
            totalPoForLine = isDraft ? 0 : this.calculateTotalQtyForLine(oLines[i].LineNumber);
            qtyLeftExPO[oLines[i].LineNumber] = Number(oLines[i].QtyLeft) + totalPoForLine;
          }
          this.getModel("viewModel").setProperty("/QtyLeftExPO", qtyLeftExPO);
        }
      }

      return qtyLeftExPO;
    },

    /**
     * Event handler when Contract's LI selection has changed. It prepopulates the
     * fields from contract LI and prepopulates QTY with quality remaining for that line.
     * @param {sap.ui.base.Event} oEvent the selection changed event
     * @public
     */
    onContractLiSelectionChanged: function(oEvent){
      if(!this.validateComboBoxChange(oEvent)){
        return;
      }

      var iContractLineNumber = oEvent.getSource().getSelectedKey();
      // if(!iContractLineNumber){
      //  return;
      // }
      var oContractLine = this.getContractLineData(iContractLineNumber);

      var oModel = oEvent.getSource().getModel();

      // if(oEvent.getParameter("initialCall")){
      //  oModel.updateBindings();
      //  return;
      // }

      var aFields = ["AssignmentTypeCode", "PartialInvoiceInd", "LineDescription", "MaterialGroup", "OrderUnit", "UnitPrice", "TaxCode", "ESP", "Currency", "ExchangeRate",
              "IsZeroLine", "IsPrepayment", "PrepaymentCompletedDate", "IsStraightLine",
              "ItemText", "InfoRecordNote", "InfoRecordPoText", "InfoNote", "MaterialPoText", "VendorMaterial", "TrackingNo"];

      oModel.setProperty("/AssignmentTypeCode",
          (oContractLine && oContractLine.AssignmentTypeCode !== "U") ? oContractLine.AssignmentTypeCode : null );
      oModel.setProperty("/Distribution",
          (oContractLine && oContractLine.AssignmentTypeCode !== "U") ? oContractLine.Distribution : null );
      oModel.setProperty("/ParentLineNumber", iContractLineNumber);
      oModel.updateBindings();

      for(var i in aFields){
        oModel.setProperty("/" + aFields[i], oContractLine ? oContractLine[aFields[i]] : null );
      }

      var lineAssignment = this.mainModel.createEntry("/AccountAssignments").getObject();
      if(oContractLine.Distribution === "0"){
        aFields = [ "GLAccount", "GLAccountDesc", "CostCentre", "CostCentreDesc", "Fund" , "Asset", "AssetDesc", "AssetSubNumber", "WBSElement",
            "WBSElementDesc", "InternalOrder", "InternalOrderDesc"];
        var aAssignments = this.getContractAssignmentsForLine(oContractLine.LineNumber);
        if(aAssignments.length > 0){
          lineAssignment = $.extend({}, aAssignments[0]);
        }

      }
      this.addLiDlg.getModel("AssignmentModel").setData(lineAssignment);



      if(oEvent.getSource().getModel("viewModel").getProperty("/IsAdd")){
        if(!oContractLine){
          oModel.setProperty("/UnitQty", null);
        }
        else{ //if(!oModel.getProperty("/UnitQty")){
          var iTotal = this.calculateTotalQtyForLine(iContractLineNumber);
          var oRemaining = this.calcContractLinesRemainingExcCurrentPO();
          oModel.setProperty("/UnitQty", oRemaining[iContractLineNumber] - iTotal );
        }
      }

      oModel.updateBindings();
      var oDialog = util.getImmediateParentByType(oEvent.getSource(), "fss.ssp.controls.Dialog");
      this._setVHDescriptions(oDialog);
      this.readFunds(oDialog);
    },

    /**
     * Gets the line details for a given contract line number
     * @param {int} iContractLineNumber contract line number
     * @returns {object} Corresponding line item object
     * @public
     */
    getContractLineData: function(iContractLineNumber){
      var oContractLines = this.getModel("ContractModel").getProperty("/ContractLIs");
      if(oContractLines && Array.isArray(oContractLines)){
        for(var i in oContractLines){
          if( oContractLines[i].LineNumber === iContractLineNumber){
            return oContractLines[i];
          }
        }
      }
      return null;
    },

    /**
     * Performs UI validation for a line item dialog
     * @param {Object} editObj the object representing the line before edit
     * @returns {boolean} True if no issues and false otherwise
     * @public
     */
    validateDialog: function(editObj){
      var aErrors = [];

      var data = this.getModel("dropDownModel").getData();
      var oTaxRates;
      if(data && data.TaxRate){
        oTaxRates = data.TaxRate;
      }

      if(!this.validateMandatoryDlg(this.addLiDlg)){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.mandatory"),
                type: sap.ui.core.MessageType.Error });
      }

      var oLine = this.addLiDlg.getModel().getData();
      var decimal = new sap.ui.model.odata.type.Decimal({decimals: 3, groupingEnabled: false});
      oLine.UnitQty = decimal.formatValue(oLine.UnitQty, "string");

      var lineTotalEx = Number(oLine.UnitQty) * Number(oLine.UnitPrice);
      var lineTotal = lineTotalEx + ( lineTotalEx  * Number(oTaxRates[oLine.TaxCode]));

      if(Number(oLine.UnitQty) === 0  ){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.lineQtyZero"),
              type: sap.ui.core.MessageType.Error });
      }
      else{
        //

      }

      if(!oLine.TaxCode){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.taxCodeOA"),
              type: sap.ui.core.MessageType.Error });
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
        var startDate = this.getModel("ContractModel").getProperty("/StartDate"),
        endDate = this.getModel("ContractModel").getProperty("/EndDate");
        var aWarningMsg = [];
        if(oLine.DeliveryDate && ((startDate && startDate > oLine.DeliveryDate) || (endDate && endDate < oLine.DeliveryDate))){
          aWarningMsg.push(this.getResourceBundle().getText("li.date.warning"));
        }



        var iTotal = this.calculateTotalQtyForLine(oLine.ParentLineNumber);
        var oRemaining = this.calcContractLinesRemainingExcCurrentPO();

        //if this is an edit, make sure we deduct the old qty from iTotal
        if(editObj && editObj.ParentLineNumber === oLine.ParentLineNumber){
          iTotal -= editObj.UnitQty;
        }

        iTotal += Number(oLine.UnitQty);
        iTotal = Number(iTotal.toFixed(3));

        if(oRemaining && oRemaining.hasOwnProperty(oLine.ParentLineNumber) && oRemaining[oLine.ParentLineNumber] < iTotal){
          aWarningMsg.push(this.getResourceBundle().getText("validation.error.lineTotalQtyExceed"));
        }


        // if(!oLine.ESP){
        //  aWarningMsg.push(this.getResourceBundle().getText("li.esp.warning"));
        // }

        var isServices = this.getModel("ContractModel").getProperty("/AdminDetails/IsServices");
        if(isServices &&  Number(oLine.UnitQty) === 1.0){
          aWarningMsg.push(this.getResourceBundle().getText("validation.warning.serviceQty"));
        }

        var sPath = util.getContextPath(this.getView());
        if(this.getModel().getProperty(sPath + "ExchangeRate") &&
              Number(this.getModel().getProperty(sPath + "ExchangeRate")) !== Number(oLine.ExchangeRate)){
          aWarningMsg.push(this.getResourceBundle().getText("validation.warning.differentExchange"));
        }

        var oNow = new Date()
        var o6Month = new Date(new Date().setMonth(oNow.getMonth() + 6));
        var o31June = (oNow.getMonth() < 6) ? new Date(oNow.getFullYear(), 5, 30, 23, 59, 59) :
                        new Date(oNow.getFullYear() + 1, 5, 30, 23, 59, 59);
        if(oLine.IsPrepayment === 'Y' && (lineTotal < 100000 || (oLine.DeliveryDate < o6Month && oLine.DeliveryDate < o31June))){
          aWarningMsg.push(this.getResourceBundle().getText("li.prepaymentThreshold.warning"));
        }

        if(aWarningMsg){
          util.displayWarnings(aWarningMsg);
        }
      }

      return bResult;
    },

    performDeleteLi: function(oBtn){
      CreateContractLI.prototype.performDeleteLi.apply(this, arguments);
      var sPath = util.getContextPath(this.getView());
      var aLIs = this.getModel().getProperty(sPath + this.liEntitySet);
      // var bAllDeleted = true;

      // for(var i in aLIs){
      //  if(aLIs[i].Status !== Constants.STATUS_LI_DELETED){
      //    bAllDeleted = false;
      //    break;
      //  }
      // }
      if(aLIs.length === 0){
        this.getModel().setProperty(sPath + "Currency", null);
        this.getModel().setProperty(sPath + "ExchangeRate", null);
      }

    }

  });

});