sap.ui.define([
  "fss/ssp/controller/CreateContractLI.controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
  "fss/ssp/model/util",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/formatter",
  "fss/ssp/model/Constants"
], function(CreateContractLI, Filter, FilterOperator, MessageBox, util, JSONModel, formatter, Constants) {
  "use strict";

  /**
   * This controller manages create/edit functionality for Assignments. It performs the required validations.
   */
  return CreateContractLI.extend("fss.ssp.controller.CreateAssignment", {
    formatter: formatter,
    constants: Constants,
    onInit: function() {
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.createAssignmentDlgId = "createAssignmentDlg";
      this.displayAssignmentDlgId = "displayAssignmentDlg";
      this.setModel(this.getModel(), "lineModel");
      this.setDefaultValues();
      this.byId("assignmentLineNumberSelect").bindItems({path: this.parentEntitySet,
          template: this.byId("assignmentSelectItem").clone(),
          events: { change: this.onLiDataChangeAssignment.bind(this) }
      });
    },

    /**
     * Sets the default values for this controller. This will enable the extension of the controller
     */
    setDefaultValues: function(){
      this.parentEntitySet = "ContractLIs";
    },

    /**
     * Event handler when Copy button gets pressed. It takes the data for the line and calls the Add function
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onCopyAssignment: function(oEvent){

      var lineObj = $.extend({}, oEvent.getSource().getBindingContext().getObject());
      if (lineObj.__metadata) {
        delete lineObj.__metadata;
      }
      if(lineObj.ParentNumber){
        lineObj.ParentNumber = undefined;
      }

      if(lineObj.IsLocked_Asset){
        lineObj.Asset = null;
        lineObj.AssetDesc = null;
        lineObj.AssetSubNumber = null;
      }
      if(lineObj.IsLocked_GLAccount){
        lineObj.GLAccount = null;
        lineObj.GLAccountDesc = null;
      }
      if(lineObj.IsLocked_WBSElement){
        lineObj.WBSElement = null;
        lineObj.WBSElementDesc = null;
      }
      if(lineObj.IsLocked_InternalOrder){
        lineObj.InternalOrder = null;
        lineObj.InternalOrderDesc = null;
      }
      if(lineObj.IsLocked_CostCentre){
        lineObj.CostCentre = null;
        lineObj.CostCentreDesc = null;
      }

      this.onAddAssignment(oEvent, lineObj);
    },


    initAddDlg: function(){
      if (!this.addAssignmentDlg) {
        this.addAssignmentDlg = sap.ui.xmlfragment(this.createId(this.createAssignmentDlgId), "fss.ssp.view.fragments.createAssignment", this);
        this.addAssignmentDlg.setModel(new JSONModel({}), "AssignmentModel");
        this.addAssignmentDlg.setModel(new JSONModel({}));
        this.addAssignmentDlg.setModel(new JSONModel({}), "ErrorModel");
        this.addAssignmentDlg.setModel(this.getView().getModel(), "DocumentModel");
        util.setDefaultPlacementTextVH(this.addAssignmentDlg.getContent(), this);
        this.getView().addDependent(this.addAssignmentDlg);
        this.addAssignmentDlg.setModel(new JSONModel({}), "fundModel");
        this.addAssignmentDlg.getModel("fundModel").setSizeLimit(1000);
      }
    },

    /**
     * Event handler when Add assignment button gets pressed. It opens the assignment dialog.
     * @param {sap.ui.base.Event} oEvent the button press event    *
     * @param {Object} initObj the initial object for Copy scenario
     * @public
     */
    onAddAssignment: function(oEvent, initObj){
      this.initAddDlg();

      var oCtx = this.getView().getBindingContext();
      this.addAssignmentDlg.setModel(this.getView().getModel(), "DocumentModel");
      this.addAssignmentDlg.setBindingContext(oCtx, "DocumentModel");
      this.clearMandatoryDlg(this.addAssignmentDlg);

      var oLi = $.extend({}, this.getView().getBindingContext("lineModel").getObject());
      this.addAssignmentDlg.getModel().setData(oLi);
      var viewModelData = {IsAdd: true};
      this.addAssignmentDlg.setModel(new JSONModel(viewModelData), "viewModel");

      var obj = {};
      if(initObj){
        obj = initObj;
      }
      else{
        obj = this.mainModel.createEntry("/AccountAssignments").getObject();
        obj.ItemLineNumber = oLi.LineNumber;
      }
      this.addAssignmentDlg.getModel("AssignmentModel").setData(obj);
      this.addAssignmentDlg.getModel("AssignmentModel").updateBindings(true);

      this.addAssignmentDlg.open();
    },

    /**
     * Event handler when Cancel button gets pressed. It closes the associating dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddAssignmentCancel: function(oEvent){
      if(this.addAssignmentDlg){
        this.addAssignmentDlg.close();
      }
      if(this.displayAssignmentDlg){
        this.displayAssignmentDlg.close();
      }
    },


    /**
     * Event handler when Add button gets pressed. It validates and adds a assignment
     * @param {sap.ui.base.Event} oEvent the button press event
     * @returns {boolean} True if Add is successful, False otherwise
     * @public
     */
    onAddAssignmentConfirm: function(oEvent){
      if(!this.validateDialog()){
        return false;
      }

      var obj = this.addAssignmentDlg.getModel("AssignmentModel").getData();
      this._addAssignment(obj);

      if(oEvent){
        this.addAssignmentDlg.close();
      }
    },

    _addAssignment: function(obj){
      var sPath = util.getContextPath(this.getView());

      if(!obj.ItemLineNumber){
        return;
      }
      obj.AssignmentLineNumber = this.getNextAssignmentLine(obj.ItemLineNumber);
      obj.IsDeleted = false;
      var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");
      aAssignments.push($.extend({}, obj));
      this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
      this.getView().getModel().updateBindings();
    },

    /**
     * Event handler when line item dropdown is changed. It updates the table with associated assignments
     * @param {sap.ui.base.Event} oEvent change event
     * @public
     */
    onLineItemChange: function(oEvent){
      if(!oEvent.getSource().getVisible()){
        return;
      }
      var selectedItem = oEvent.getParameter("selectedItem");
      if(!selectedItem){
        return;
      }
      var itemLineNumber = selectedItem.getBindingContext().getObject().LineNumber;
      if(!itemLineNumber){
        return;
      }
      this.getModel("viewModel").setProperty("/enableAssignmentDelete", true);
      this.getModel("viewModel").setProperty("/enableAssignmentAction", false);

      // var sLinePath = selectedItem.getBindingContext().getPath();
      this.setModel(this.getModel(), "lineModel");
      this.getView().setBindingContext(selectedItem.getBindingContext(), "lineModel");

      var aFilters = [new Filter("ItemLineNumber", FilterOperator.EQ, itemLineNumber ),
              new Filter("IsDeleted", FilterOperator.NE, true )];
      var oFilter = new Filter({filters: aFilters, and: true});
      var oTable = this.getView().byId("assignmentTable");
      if(oTable){
        oTable.getBinding("items").filter(oFilter, "Application");
      }

      if(selectedItem.getBindingContext().getProperty("Status") === Constants.STATUS_LI_NONE &&
          selectedItem.getBindingContext().getProperty("Distribution") !== "0"){
        this.getModel("viewModel").setProperty("/enableAssignmentAction", true);
      }
      if(selectedItem.getBindingContext().getProperty("IsNonDeletable") === true){
        this.getModel("viewModel").setProperty("/enableAssignmentDelete", false);
      }
    },

    /**
     * Event handler Line item data is changed. It updates the table with associating assignments
     * @param {sap.ui.base.Event} oEvent the data change event
     * @public
     */
    onLiDataChangeAssignment: function(oEvent){
      var oSelect = this.byId("assignmentLineNumberSelect");

      if(oSelect){
        this.selectLiDataChange(oSelect);
      }
    },

    /**
     * Event handler when Assignment table update is finished. It updates table's header
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onTableUpdateFinished: function(oEvent){
      var data = this.getModel("viewModel").getData(),
        oTable = oEvent.getSource(),
        iTotalItems = oEvent.getParameter("total");

      if ((iTotalItems ||  iTotalItems === 0) && oTable.getBinding("items").isLengthFinal()) {
        data.assignmentTableTitle = this.getResourceBundle().getText("assignmentTitleCount", [iTotalItems]);
      } else {
        data.assignmentTableTitle = this.getResourceBundle().getText("assignmentTitle");
      }

      //amtTotal percTotal qtyTotal
      var iAmtTotal = 0, iPercTotal = 0, iQtyTotal = 0;
      var oCtx = this.getView().getBindingContext("lineModel");
      if(oCtx && oCtx.getObject()){
        var oLi = oCtx.getObject();
        var aAssignments = this.getAssignmentsForLine(oLi.LineNumber);
        for(var i in aAssignments){
          iAmtTotal += Number(aAssignments[i].Amount || null);
          iPercTotal += Number(aAssignments[i].Percentage || null);
          iQtyTotal += Number(aAssignments[i].Quantity || null);
        }
        data.amtTotal = Number(iAmtTotal.toFixed(3));
        data.percTotal = Number(iPercTotal.toFixed(1));
        data.qtyTotal = Number(iQtyTotal.toFixed(3));
      }
      this.getModel("viewModel").updateBindings();

    },

    // closeLineItem: function(itemLineNumber){
    //  var aAssignments = this.getAssignmentsForLine(itemLineNumber);
    //  for(var i in aAssignments){
    //    aAssignments[i].SchQuantity = aAssignments[i].DvdQuantity;
    //    if(Number(aAssignments[i].SchQuantity) === 0){
    //      aAssignments[i].IsDeleted = true;
    //    }
    //  }

    //  this.updateLineItemValues(itemLineNumber);
    // },


    /**
     * Event handler when Delete button gets pressed. It deletes the assignment
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onDeleteAssignment: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();
      var oTable = util.getImmediateParentByType(oEvent.getSource(), "sap.m.Table");

      var aAssignments = this.getAssignmentsForLine(obj.ItemLineNumber);
      MessageBox.warning(
        this.getResourceBundle().getText("assignment.delete.warning", [obj.AssignmentLineNumber]),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              var sPath = util.getContextPath(this.getView());
              aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");
              for(var i in aAssignments){
                if(aAssignments[i].ItemLineNumber === obj.ItemLineNumber && aAssignments[i].AssignmentLineNumber === obj.AssignmentLineNumber){
                  if(aAssignments[i].ParentNumber){
                    aAssignments[i].IsDeleted = true;
                    oTable.getBinding("items").refresh(true);
                  }
                  else{
                    aAssignments.splice(i, 1);
                  }
                  break;
                }
              }
              this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);

            }
          }.bind(this)
        }
      );
    },

    /**
     * Event handler when a Assignment line is pressed. If in display mode, it opens the dialog in display, otherwise in edit mode
     * @param {sap.ui.base.Event} oEvent the line press event
     * @public
     */
    onAssignmentPress: function(oEvent){
      var viewModel = this.getModel("viewModel");
      if(viewModel.getProperty("/displayMode") || !viewModel.getProperty("/enableAssignmentAction")){
        if (!this.displayAssignmentDlg) {
          this.displayAssignmentDlg = sap.ui.xmlfragment(this.createId(this.displayAssignmentDlgId), "fss.ssp.view.fragments.createAssignment", this);
          this.displayAssignmentDlg.setModel(new JSONModel({}));
          this.displayAssignmentDlg.setModel(new JSONModel({}), "AssignmentModel");
          this.displayAssignmentDlg.setModel(new JSONModel({}), "fundModel");
          this.displayAssignmentDlg.getModel("fundModel").setSizeLimit(1000);
          this.displayAssignmentDlg.setModel(new JSONModel({errors: []}), "ErrorModel");
          util.makeFormReadOnly(this.displayAssignmentDlg.getContent());
          this.getView().addDependent(this.displayAssignmentDlg);
        }
        this.displayAssignmentDlg.setModel(new JSONModel($.extend({IsMilitaryOperation: false}, this.getModel("viewModel").getData())), "viewModel");
        var obj = oEvent.getSource().getBindingContext().getObject();
        var oData = $.extend({}, obj);
        this.displayAssignmentDlg.getModel("AssignmentModel").setData(oData);
        this.displayAssignmentDlg.getModel().setData($.extend({}, this.getView().getBindingContext("lineModel").getObject()));
        this.displayAssignmentDlg.open();
      }
      else{
        this.onEditAssignment(oEvent);
      }
    },

    /**
     * Event handler when edit button gets pressed. It opens the assignment in edit mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditAssignment: function(oEvent){
      this.initAddDlg();

      this.clearMandatoryDlg(this.addAssignmentDlg);
      this.addAssignmentDlg.getModel().setData($.extend({}, this.getView().getBindingContext("lineModel").getObject()));

      var viewModelData = {IsEdit: true};
      this.addAssignmentDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");

      var obj = oEvent.getSource().getBindingContext().getObject();
      var oData = $.extend({}, obj);

      if(oData.IsLocked_Asset){
        oData.Asset = null;
        oData.AssetDesc = null;
        oData.AssetSubNumber = null;
      }
      if(oData.IsLocked_GLAccount){
        oData.GLAccount = null;
        oData.GLAccountDesc = null;
      }
      if(oData.IsLocked_WBSElement){
        oData.WBSElement = null;
        oData.WBSElementDesc = null;
      }
      if(oData.IsLocked_InternalOrder){
        oData.InternalOrder = null;
        oData.InternalOrderDesc = null;
      }
      if(oData.IsLocked_CostCentre){
        oData.CostCentre = null;
        oData.CostCentreDesc = null;
      }

      this.addAssignmentDlg.getModel("AssignmentModel").setData(oData);

      this.addAssignmentDlg.open();
    },

    /**
     * Event handler when Ok button gets pressed in edit dialog. It validates and edits the assignment
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditAssignmentConfirm: function(oEvent){
      var obj = this.addAssignmentDlg.getModel("AssignmentModel").getData();
      var sPath = util.getContextPath(this.getView());
      var aAssignments = this.getModel().getProperty(sPath + "AccountAssignments");

      for(var i in aAssignments){
        if(aAssignments[i].ItemLineNumber === obj.ItemLineNumber && aAssignments[i].AssignmentLineNumber === obj.AssignmentLineNumber){
          if(!this.validateDialog(aAssignments[i])){
            return;
          }

          obj.IsLocked_Asset = false;
          obj.IsLocked_GLAccount = false;
          obj.IsLocked_WBSElement = false;
          obj.IsLocked_InternalOrder = false;
          obj.IsLocked_CostCentre = false;

          aAssignments[i] = $.extend({}, obj);
          break;
        }
      }

      this.getModel().setProperty(sPath + "AccountAssignments", aAssignments);
      this.addAssignmentDlg.close();
    },

    /**
     * Performs UI validation for a assignment dialog
     * @param {Object} editObj the object representing the assignment before edit
     * @returns {boolean} True if no issues and false otherwise
     * @public
     */
    validateDialog: function(editObj){
      var aErrors = [];
      if(!this.validateMandatoryDlg(this.addAssignmentDlg)){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.mandatory"),
                type: sap.ui.core.MessageType.Error });
      }

      var oAssignment = this.addAssignmentDlg.getModel("AssignmentModel").getData();
      var oLi = this.addAssignmentDlg.getModel().getData();

      var aLiAssignments = this.getAssignmentsForLine(oLi.LineNumber);


      var bResult = aErrors.length === 0;
      this.addAssignmentDlg.getModel("ErrorModel").setProperty("/errors", aErrors);
      this.addAssignmentDlg.getModel("ErrorModel").updateBindings();

      if(!bResult){
        var errorBtn = this.byId(sap.ui.core.Fragment.createId(this.createAssignmentDlgId, "errorBtn"));
        this.showErrorPopover(errorBtn);
      }
      else{
        var oViewData = this.getModel("viewModel").getData();

        var iPercTotal = oViewData.percTotal + Number(oAssignment.Percentage || null);
        var iAmtTotal = oViewData.amtTotal + Number(oAssignment.Amount || null);
        var iQtyTotal = oViewData.qtyTotal + Number(oAssignment.Quantity || null);

        if(editObj){
          iPercTotal -= Number(editObj.Percentage || null);
          iAmtTotal -= Number(editObj.Amount || null);
          iQtyTotal -= Number(editObj.Quantity || null);
        }

        iPercTotal = Number(iPercTotal.toFixed(1) || null);
        iAmtTotal = Number(iAmtTotal.toFixed(3) || null);
        iQtyTotal = Number(iQtyTotal.toFixed(3) || null);

        var sWarningMsg = [];
        if(iPercTotal > 100){
          sWarningMsg.push(this.getResourceBundle().getText("assignment.percentage.warning"));
        }

        if(iAmtTotal > Number(oLi.UnitQty || null) * Number(oLi.UnitPrice || null)){
          sWarningMsg.push(this.getResourceBundle().getText("assignment.amount.warning", [Number(oLi.UnitQty || null) * Number(oLi.UnitPrice || null)]));
        }
        if(iQtyTotal > Number(oLi.UnitQty || null) ){
          sWarningMsg.push(this.getResourceBundle().getText("assignment.quantity.warning", [oLi.UnitQty]));
        }

        if(sWarningMsg.length > 0){
          util.displayWarnings(sWarningMsg);
        }

      }

      return bResult;
    },

    /**
     * Event handler when Error button gets pressed. It calls showErrorPopover to handle.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */

    onAddAssignmentError: function(oEvent){
      var errorBtn = oEvent.getSource();
      this.showErrorPopover(errorBtn);
    },

    validateAllEntries: function(aErrors){
      // this.initAddDlg();
      // var oCtx = this.getView().getBindingContext();
      // this.addLiDlg.setBindingContext(oCtx, "DocumentModel");
      // var sPath = util.getContextPath(this.getView());
      // var aLIs = this.getModel().getProperty(sPath + this.liEntitySet);

      // var obj, aPhasings, enableQtyDate, oConsumptions, hasConsumption, viewModelData;
      // for(var i in aLIs){
      //  obj = aLIs[i];
      //  if(obj.Status === Constants.STATUS_LI_NONE){
      //    aPhasings = this.getPhasingsForLine(obj.LineNumber);
      //    enableQtyDate = (aPhasings && aPhasings.length > 1) ? false : true;
      //    oConsumptions = this.getConsumptionsPerLine(obj.LineNumber);
      //    hasConsumption = (oConsumptions.consumptionIRs.length > 0 || oConsumptions.consumptionGRs.length > 0);
      //    viewModelData = {IsEdit: true, enableQtyDate: enableQtyDate, hasConsumption: hasConsumption};
      //    this.addLiDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
      //    var oData = $.extend({}, obj);
      //    this.addLiDlg.getModel().setData(oData);
      //    if(oData.Distribution === "0"){
      //      oData = $.extend({}, this.getAssignmentsForLine(oData.LineNumber)[0]);
      //    }
      //    else{
      //      oData = {};
      //    }
      //    this.addLiDlg.getModel("AssignmentModel").setData(oData);

      //    this.addLiDlg.getModel("DisplayModel").setData({});
      //    if(!this.validateMandatoryDlg(this.addLiDlg)){
      //      aErrors.push({message: this.getResourceBundle().getText("validation.error.liMissingMandatory", [formatter.lineNumberFormatter(obj.LineNumber)]),
      //            type: sap.ui.core.MessageType.Error });
      //    }
      //  }
      // }

    },
  });

});