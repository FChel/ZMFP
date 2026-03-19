sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
  "fss/ssp/model/util",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/formatter",
  "fss/ssp/model/Constants"
], function(BaseController, Filter, FilterOperator, MessageBox, util, JSONModel, formatter, Constants) {
  "use strict";

  /**
   * This controller manages create/edit functionality for Phasings. It performs the required validations.
   */
  return BaseController.extend("fss.ssp.controller.CreatePhasing", {
    formatter: formatter,
    constants: Constants,
    onInit: function() {
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.createPhasingDlgId = "createPhasingDlg";
      this.displayPhasingDlgId = "displayPhasingDlg";
      this.setDefaultValues();
      this.byId("phasingLineNumberSelect").bindItems({path: this.parentEntitySet,
          template: this.byId("phasingSelectItem").clone(),
          events: { change: this.onLiDataChangePhasing.bind(this) }
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
    onCopyLI: function(oEvent){

      var lineObj = $.extend({}, oEvent.getSource().getBindingContext().getObject());
      if (lineObj.__metadata) {
        delete lineObj.__metadata;
      }
      if(lineObj.ParentNumber){
        lineObj.ParentNumber = "";
      }
      lineObj.DvdQuantity = 0;
      lineObj.InvQuantity = 0;

      this.onAddPhasing(oEvent, lineObj);
    },

    /**
     * Event handler when Add phasing button gets pressed. It opens the phasing dialog.
     * @param {sap.ui.base.Event} oEvent the button press event    *
     * @param {Object} initObj the initial object for Copy scenario
     * @public
     */
    onAddPhasing: function(oEvent, initObj){
      if (!this.addPhasingDlg) {
        this.addPhasingDlg = sap.ui.xmlfragment(this.createId(this.createPhasingDlgId), "fss.ssp.view.fragments.createPhasing", this);
        this.addPhasingDlg.setModel(new JSONModel({}));
        this.addPhasingDlg.setModel(new JSONModel({}), "lineItemsModel");
        this.addPhasingDlg.setModel(new JSONModel({}), "ErrorModel");
        util.setDefaultPlacementTextVH(this.addPhasingDlg.getContent(), this);
        this.getView().addDependent(this.addPhasingDlg);
      }
      this.clearMandatoryDlg(this.addPhasingDlg);

      // this.setModel(new JSONModel(this.getView().getBindingContext().getObject().ContractLIs), "lineItemsModel");
      this.addPhasingDlg.getModel("lineItemsModel").setData(this.getView().getBindingContext().getObject()[this.parentEntitySet]);
      var viewModelData = {IsAdd: true};
      this.addPhasingDlg.setModel(new JSONModel(viewModelData), "viewModel");
      // this.addPhasingDlg.getModel("ErrorModel").setProperty("/errors", []);

      var obj = {};
      if(initObj){
        obj = initObj;
      }
      else{
        obj = this.mainModel.createEntry("/Phasings").getObject();
      }
      this.addPhasingDlg.getModel().setData(obj);
      this.addPhasingDlg.getModel().updateBindings(true);

      this.addPhasingDlg.open();
    },

    /**
     * Event handler when Cancel button gets pressed. It closes the associating dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddPhasingCancel: function(oEvent){
      if(this.addPhasingDlg){
        this.addPhasingDlg.close();
      }
      if(this.displayPhasingDlg){
        this.displayPhasingDlg.close();
      }
    },

    /**
     * Finds out the next phasing line number for the supplied line item number
     * @param {String} lineItemNumber associated line item number
     * @returns {String} calculated phasing line number
     * @public
     */
    getNextPhasingLine: function(lineItemNumber){
      var aPhasings = this.getView().getBindingContext().getObject().Phasings;
      var lineNumber = 1;
      var tempLineNumber = 0;
      for(var i in aPhasings){
        if(aPhasings[i].ItemLineNumber === lineItemNumber){
          lineNumber++;
          if(aPhasings[i].PhasingLineNumber > tempLineNumber){
            tempLineNumber = Number(aPhasings[i].PhasingLineNumber);
          }
        }
      }
      if((tempLineNumber + 1) > lineNumber){
        lineNumber = tempLineNumber + 1;
      }
      return lineNumber + "";
    },

    /**
     * Event handler when Add button gets pressed. It validates and adds a phasing
     * @param {sap.ui.base.Event} oEvent the button press event
     * @returns {boolean} True if Add is successful, False otherwise
     * @public
     */
    onAddPhasingConfirm: function(oEvent){
      if(!this.validateDialog()){
        return false;
      }

      var obj = this.addPhasingDlg.getModel().getData();
      this._addPhasing(obj);
      // var sPath = util.getContextPath(this.getView());

      // obj.LineDescription = this.byId(sap.ui.core.Fragment.createId(this.createPhasingDlgId, "lineNumberSelect")).getSelectedItem().getBindingContext("lineItemsModel").getObject().LineDescription;
      // obj.PhasingLineNumber = this.getNextPhasingLine(obj.ItemLineNumber);
      // obj.IsDeleted = false;
      // var aPhasings = this.getModel().getProperty(sPath + "Phasings");
      // aPhasings.push(obj);
      // this.getModel().setProperty(sPath + "Phasings", aPhasings);
      // this.updateLineItemValues(obj.ItemLineNumber);
      // //do not execute the following lines if we are uploading.
      if(oEvent){
        this.addPhasingDlg.close();
      }
    },

    _addPhasing: function(obj){
      var sPath = util.getContextPath(this.getView());

      if(!this.getModel("viewModel").getProperty("/SelectedLine")){
        try{
          this.getModel("viewModel").setProperty("/SelectedLine", this.byId("phasingLineNumberSelect").getSelectedItem().getBindingContext().getObject().LineNumber);
        }
        catch(exception){

        }
      }

      obj.ItemLineNumber = this.getModel("viewModel").getProperty("/SelectedLine");
      if(!obj.ItemLineNumber){
        return;
      }
      obj.PhasingLineNumber = this.getNextPhasingLine(obj.ItemLineNumber);
      obj.IsDeleted = false;
      var aPhasings = this.getModel().getProperty(sPath + "Phasings");
      aPhasings.push(obj);
      this.getModel().setProperty(sPath + "Phasings", aPhasings);
      this.updateLineItemValues(obj.ItemLineNumber);
      this.getView().getModel().updateBindings();
    },

    /**
     * Event handler when line item dropdown is changed. It updates the table with associated phasings
     * @param {sap.ui.base.Event} oEvent change event
     * @public
     */
    onLineItemChange: function(oEvent){
      var selectedItem = oEvent.getParameter("selectedItem");
      this.getModel("viewModel").setProperty("/enablePhasingAction", false);
      if(!selectedItem){
        return;
      }
      var itemLineNumber = selectedItem.getBindingContext().getObject().LineNumber;
      if(!itemLineNumber){
        return;
      }
      var aFilters = [new Filter("ItemLineNumber", FilterOperator.EQ, itemLineNumber ),
              new Filter("IsDeleted", FilterOperator.NE, true )];
      var oFilter = new Filter({filters: aFilters, and: true});
      var oTable = util.getImmediateParentByType(oEvent.getSource(), "sap.m.Table");
      if(oTable){
        oTable.getBinding("items").filter(oFilter, "Application");
      }

      if(selectedItem.getBindingContext().getProperty("Status") === Constants.STATUS_LI_NONE){
        this.getModel("viewModel").setProperty("/enablePhasingAction", true);
      }
    },

    /**
     * Event handler Line item data is changed. It updates the table with associating phasings
     * @param {sap.ui.base.Event} oEvent the data change event
     * @public
     */
    onLiDataChangePhasing: function(oEvent){
      var oSelect = this.byId("phasingLineNumberSelect");

      if(oSelect){
        this.selectLiDataChange(oSelect);

        // oSelect.setEnabled(oItems.length > 0);

        // //if there are items in Select but none has been selected, select the first one.
        // if(oItems.length > 0 && !oSelect.getSelectedItem()){
        //  oSelect.setSelectedItem(oItems[0]);
        // }
        // oSelect.fireChange({selectedItem: oSelect.getSelectedItem()});
      }
    },

    /**
     * Event handler when Phasing table update is finished. It updates table's header
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onTableUpdateFinished: function(oEvent){
      var data = this.getModel("viewModel").getData(),
        oTable = oEvent.getSource(),
        iTotalItems = oEvent.getParameter("total");

      if ((iTotalItems ||  iTotalItems === 0) && oTable.getBinding("items").isLengthFinal()) {
        data.phasingTableTitle = this.getResourceBundle().getText("PhasingTitleCount", [iTotalItems]);
      } else {
        data.phasingTableTitle = this.getResourceBundle().getText("PhasingTitle");
      }
      data.enableDelete = iTotalItems > 1;



      if(!this.getModel("viewModel").getProperty("/SelectedLine")){
        try{
          this.getModel("viewModel").setProperty("/SelectedLine", this.byId("phasingLineNumberSelect").getSelectedItem().getBindingContext().getObject().LineNumber);
        }
        catch(exception){

        }
      }

      var sLiNum = this.getModel("viewModel").getProperty("/SelectedLine");
      if(sLiNum){
        //amtTotal percTotal qtyTotal
        //SchQuantity, DvdQuantity
        var iSchTotal = 0, iDvdTotal = 0;
        var aPhasings = this.getPhasingsForLine(sLiNum);
        for(var i in aPhasings){
          iSchTotal += Number(aPhasings[i].SchQuantity || null);
          iDvdTotal += Number(aPhasings[i].DvdQuantity || null);
        }
        data.schTotal = Number(iSchTotal.toFixed(3));
        data.dvdTotal = Number(iDvdTotal.toFixed(3));
        data.remTotal = Number((iSchTotal - iDvdTotal).toFixed(3));
      }


      this.getModel("viewModel").updateBindings();

      // this.onPhasingSelectionChange();
    },

    closeLineItem: function(itemLineNumber, isGR, liQty){
      var aPhasings = this.getPhasingsForLine(itemLineNumber);
      //if it's IR only, set the first phasing to the line quantity and delete the rest
      if(isGR === false){
        aPhasings[0].SchQuantity = liQty;
        for(var j = 1; j < aPhasings.length; j++){
          aPhasings[j].IsDeleted = true;
        }
      }
      else{
        for(var i in aPhasings){
          aPhasings[i].SchQuantity = aPhasings[i].DvdQuantity;
          if(Number(aPhasings[i].SchQuantity) === 0){
            aPhasings[i].IsDeleted = true;
          }
        }
      }


      this.updateLineItemValues(itemLineNumber);
    },

    /**
     * Updates the quantity and Delivery date for corresponding LI following a Phasing Add/Edit/Delete action.
     * @param {int} itemLineNumber LI's number
     * @public
     */
    updateLineItemValues: function(itemLineNumber){
      var aPhasings = this.getPhasingsForLine(itemLineNumber);
      var totalQty = 0;
      var earliestDate = aPhasings[0].DeliveryDate;
      for(var i in aPhasings){
        if(earliestDate > aPhasings[i].DeliveryDate){
          earliestDate = aPhasings[i].DeliveryDate;
        }
        totalQty += Number(aPhasings[i].SchQuantity);
      }

      var sPath = util.getContextPath(this.getView());
      var aLines = this.getModel().getProperty(sPath + this.parentEntitySet);
      var oLine;
      for(i in aLines){
        oLine = aLines[i];
        if(oLine.LineNumber === itemLineNumber){
          oLine.DeliveryDate = earliestDate;
          oLine.UnitQty = Number(totalQty.toFixed(3));
          break;
        }
      }
      this.getModel().setProperty(sPath + this.parentEntitySet, []);
      this.getModel().setProperty(sPath + this.parentEntitySet, aLines);
      this.getModel().updateBindings();

    },

    /**
     * Event handler when Delete button gets pressed. It deletes the phasing and updates the Line Item's Qty.
     * It ensures at least one phasing remains
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onDeleteLI: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();
      var oTable = util.getImmediateParentByType(oEvent.getSource(), "sap.m.Table");

      var aPhasings = this.getPhasingsForLine(obj.ItemLineNumber);
      if(aPhasings.length === 1){
        MessageBox.warning(this.getResourceBundle().getText("phasing.deleteLast.error"), {actions: [MessageBox.Action.OK]});
        return;
      }
      MessageBox.warning(
        this.getResourceBundle().getText("phasing.delete.warning", [obj.PhasingLineNumber]),
        {
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          styleClass: "sapUiSizeCompact",
          onClose: function(sAction) {
            if(sAction === MessageBox.Action.OK){
              var sPath = util.getContextPath(this.getView());
              aPhasings = this.getModel().getProperty(sPath + "Phasings");
              for(var i in aPhasings){
                if(aPhasings[i].ItemLineNumber === obj.ItemLineNumber && aPhasings[i].PhasingLineNumber === obj.PhasingLineNumber){
                  // if(aPhasings[i].ParentNumber){
                    aPhasings[i].IsDeleted = true;
                  // }
                  // else{
                  //  aPhasings.splice(i, 1);
                  // }
                  break;
                }
              }
              this.getModel().setProperty(sPath + "Phasings", aPhasings);
              this.updateLineItemValues(obj.ItemLineNumber);
              oTable.getBinding("items").refresh(true);
              // selectedLine.getModel().setProperty(selectedLine.getBindingContext().getPath() + "/IsDeleted", true);
              // this.getModel().updateBindings(true);
            }
          }.bind(this)
        }
      );
    },

    /**
     * Event handler when a Phasing line is pressed. If in display mode, it opens the dialog in display, otherwise in edit mode
     * @param {sap.ui.base.Event} oEvent the line press event
     * @public
     */
    onPhasingPress: function(oEvent){
      var viewModel = this.getModel("viewModel");
      if(viewModel.getProperty("/displayMode") || !viewModel.getProperty("/enablePhasingAction")){
        if (!this.displayPhasingDlg) {
          this.displayPhasingDlg = sap.ui.xmlfragment(this.createId(this.displayPhasingDlgId), "fss.ssp.view.fragments.createPhasing", this);
          this.displayPhasingDlg.setModel(new JSONModel({}));
          this.displayPhasingDlg.setModel(new JSONModel({}), "lineItemsModel");
          this.displayPhasingDlg.setModel(new JSONModel({errors: []}), "ErrorModel");
          util.makeFormReadOnly(this.displayPhasingDlg.getContent());
          this.getView().addDependent(this.displayPhasingDlg);
        }

        this.displayPhasingDlg.getModel("lineItemsModel").setData(this.getView().getBindingContext().getObject()[this.parentEntitySet]);
        // var viewModelData = {IsEdit: false};
        // this.displayPhasingDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
        var obj = oEvent.getSource().getBindingContext().getObject();
        var oData = $.extend({}, obj);
        this.displayPhasingDlg.getModel().setData(oData);

        this.displayPhasingDlg.open();
      }
      else{
        // this.byId("phasingTable").setSelectedItem(oEvent.getSource());
        this.onEditPhasing(oEvent);
      }
    },

    /**
     * Event handler when edit button gets pressed. It opens the phasing in edit mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditPhasing: function(oEvent){
      if (!this.addPhasingDlg) {
        this.addPhasingDlg = sap.ui.xmlfragment(this.createId(this.createPhasingDlgId), "fss.ssp.view.fragments.createPhasing", this);
        this.addPhasingDlg.setModel(new JSONModel({}));
        this.addPhasingDlg.setModel(new JSONModel({}), "lineItemsModel");
        this.addPhasingDlg.setModel(new JSONModel({}), "ErrorModel");
        util.setDefaultPlacementTextVH(this.addPhasingDlg.getContent(), this);
        this.getView().addDependent(this.addPhasingDlg);
      }
      this.clearMandatoryDlg(this.addPhasingDlg);
      this.addPhasingDlg.getModel("lineItemsModel").setData(this.getView().getBindingContext().getObject()[this.parentEntitySet]);

      var viewModelData = {IsEdit: true};
      this.addPhasingDlg.setModel(new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData())), "viewModel");
      // this.addPhasingDlg.getModel("ErrorModel").setProperty("/errors", []);

      var obj = oEvent.getSource().getBindingContext().getObject();
      var oData = $.extend({}, obj);
      this.addPhasingDlg.getModel().setData(oData);

      this.addPhasingDlg.open();
    },

    /**
     * Event handler when Ok button gets pressed in edit dialog. It validates and edits the phasing
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditPhasingConfirm: function(oEvent){
      var obj = this.addPhasingDlg.getModel().getData();
      var sPath = util.getContextPath(this.getView());
      var aPhasings = this.getModel().getProperty(sPath + "Phasings");

      for(var i in aPhasings){
        if(aPhasings[i].ItemLineNumber === obj.ItemLineNumber && aPhasings[i].PhasingLineNumber === obj.PhasingLineNumber){
          if(!this.validateDialog(aPhasings[i])){
            return;
          }
          aPhasings[i] = obj;
          this.updateLineItemValues(obj.ItemLineNumber);
          break;
        }
      }

      this.getModel().setProperty(sPath + "Phasings", aPhasings);

      this.getModel().updateBindings();
      this.addPhasingDlg.close();
    },

    /**
     * Performs UI validation for a phasing dialog
     * @param {Object} editObj the object representing the phasing before edit
     * @returns {boolean} True if no issues and false otherwise
     * @public
     */
    validateDialog: function(editObj){
      var aErrors = [];
      if(!this.validateMandatoryDlg(this.addPhasingDlg)){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.mandatory"),
                type: sap.ui.core.MessageType.Error });
      }

      var oLine = this.addPhasingDlg.getModel().getData();

      var decimal = new sap.ui.model.odata.type.Decimal({decimals: 3, groupingEnabled: false});
      oLine.SchQuantity = decimal.formatValue(oLine.SchQuantity, "string");
      if(Number(oLine.SchQuantity) === 0 ){
        aErrors.push({message: this.getResourceBundle().getText("validation.error.lineTotalZero"),
              type: sap.ui.core.MessageType.Error });
      }
      else{
        if(Number(oLine.SchQuantity) < Number(oLine.DvdQuantity || oLine.InvQuantity || 0)){
          aErrors.push({message: this.getResourceBundle().getText("phasing.qty.error"),
              type: sap.ui.core.MessageType.Error });
        }
      }

      var bResult = aErrors.length === 0;
      this.addPhasingDlg.getModel("ErrorModel").setProperty("/errors", aErrors);
      this.addPhasingDlg.getModel("ErrorModel").updateBindings();

      if(!bResult){
        var errorBtn = this.byId(sap.ui.core.Fragment.createId(this.createPhasingDlgId, "errorBtn"));
        this.showErrorPopover(errorBtn);
      }
      else{
        var isContract = this.getModel("viewModel").getProperty("/isContract");
        var oModel = (isContract) ? this.getModel() : this.getModel("ContractModel");
        if(oModel){
          var startDate = oModel.getProperty("/StartDate"),
            endDate = oModel.getProperty("/EndDate");
          var aWarningMsg = [];
          var dNow = new Date(new Date().setHours(0,0,0,0));
          var dFuture = new Date(new Date(new Date().setFullYear(new Date().getFullYear() + Constants.DELIVERY_DATE_FUTURE_YEARS)).setHours(23,59,59,0));

          if(oLine.DeliveryDate && ((startDate && startDate > oLine.DeliveryDate) || (endDate && endDate < oLine.DeliveryDate))){
            aWarningMsg.push(this.getResourceBundle().getText("phasing.date.warning"));
          }
          else if(oLine.DeliveryDate && (oLine.DeliveryDate < dNow || oLine.DeliveryDate > dFuture)){
            aWarningMsg.push(this.getResourceBundle().getText("li.deldate.warning"));
          }
        }

        if(aWarningMsg){
          util.displayWarnings(aWarningMsg);
        }
      }

      return bResult;
    },

    /**
     * Event handler when Error button gets pressed. It calls showErrorPopover to handle.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */

    onAddPhasingError: function(oEvent){
      var errorBtn = oEvent.getSource();
      this.showErrorPopover(errorBtn);
    },




    /*
    *
    */
    addImportedLines: function(csv) {
      var headers = ["DeliveryDate","SchQuantity"];
      var hTitles = [
        this.getResourceBundle().getText("DeliveryDate"),
        this.getResourceBundle().getText("SchQuantity")
      ];

      var lines = csv.split("\n");

      // check for blank line at end ...
      if (lines.length > 0) {
        if (lines[lines.length - 1] === "") {
          lines.splice(lines.length - 1, 1);
        }
      }

      var sCurrentLine, aCurrentLine, sErr = "", iErrCount = 0, aNewPhasings = [], oNewPhasing;
      var iDecimalVal;
      var oDecimal = new sap.ui.model.odata.type.Decimal({decimals: 3, groupingEnabled: false});

      var sPath = util.getContextPath(this.getView());
      var startDate = this.getModel().getProperty(sPath + "StartDate"),
      endDate = this.getModel().getProperty(sPath + "EndDate");
      var aWarningMsg = [];//"";
      var dNow = new Date(new Date().setHours(0,0,0,0));
      var dFuture = new Date(new Date(new Date().setFullYear(new Date().getFullYear() + Constants.DELIVERY_DATE_FUTURE_YEARS)).setHours(23,59,59,0));

      for (var i = 0; i < lines.length; i++) {
        sCurrentLine = lines[i];
        aCurrentLine = sCurrentLine.replace(/[\n\r]/g, ",");
        aCurrentLine = aCurrentLine.split(",");

        // validate number of columns
        if ( aCurrentLine.length - 1 !== headers.length && ( (lines.length - 1) === i && aCurrentLine.length !== headers.length) )  {
          if (i === 0) {
            sap.m.MessageBox.error("Error on header line: Number of columns  (" + (aCurrentLine.length-1) + ") does not match expected (" + headers.length + ")", {
              title: "Error in Upload File",
              styleClass: "sapUiSizeCosy",
              initialFocus: null,
              onClose: function(sAction) { }
            });
            return;
          } else {
            sErr += "Error on line " + (i+1) +  ": Number of columns  (" + (aCurrentLine.length-1) + ") does not match expected (" + headers.length + ")\n";
            iErrCount++;
          }
        }

        oNewPhasing = {};
        // read data in file
        for (var j = 0; j < headers.length; j++) {

          var sVal = aCurrentLine[j];
          if (! sVal) {
            sVal = "";
          }

          if (i === 0) {
            // validate header line
            if (sVal !== hTitles[j]) {
              sap.m.MessageBox.error("Unexpected header in column " + (j+1) + ", expected " + hTitles[j] + " not " + sVal, {
                title: "Error in Upload File",
                styleClass: "sapUiSizeCosy",
                initialFocus: null,
                onClose: function(sAction) { }
              });
              return;
            }
          } else {
            //validate data line(s)
            switch (j) {
              case 0://Delivery Date
                if (!sVal ||  !util.convertStringToDate(sVal)){
                  sErr += "Error on line " + (i + 1) +  ": " + sVal + " is not a valid " + hTitles[j] + ", should be a valid date of the format 'dd.mm.yyyy'.\n";
                  iErrCount++;
                } else {
                  sVal = util.convertStringToDate(sVal);

                  if((startDate && startDate > sVal) || (endDate && endDate < sVal)){
                    aWarningMsg.push("line " + (i + 1) + " " + this.getResourceBundle().getText("li.date.warning"));
                  }
                  else if(sVal < dNow || sVal > dFuture){
                    aWarningMsg.push("line " + (i + 1)  + " " +  this.getResourceBundle().getText("li.deldate.warning"));
                  }
                }
                break;

              case 1://Scheduled Quantity
                try{
                  iDecimalVal = oDecimal.formatValue(sVal, "string");
                }
                catch(exception){
                  sErr += "Error on line " + (i + 1) +  ": " + sVal + " is not a valid " + hTitles[j] + "\n";
                  iErrCount++;
                }

                if((iDecimalVal || "").length < sVal.length ){
                  sErr += "Error on line " + (i + 1) +  ": " + sVal + " is not a valid " + hTitles[j] + ". Should not have more than 3 decimal points\n";
                  iErrCount++;
                }
                sVal = Number(sVal);
                break;

              default:
                break;
            }
            // append to JSON
            oNewPhasing[headers[j]] = sVal;
          }
        }

        // more than 20 errors
        if (iErrCount >= Constants.MAX_ERR ) {
          sErr += "\nError check stopped at " + Constants.MAX_ERR + " errors.";

          sap.m.MessageBox.error(sErr, {
            title: "Error(s) in Upload File",
            styleClass: "sapUiSizeCosy",
            initialFocus: null,
            onClose: function(sAction) { }
          });
          return;
        }

        if(i !== 0){
          aNewPhasings.push(oNewPhasing);
        }
      }

      // end of upload
      if (iErrCount === 0) {
        for(var k in aNewPhasings){
          this._addPhasing(aNewPhasings[k]);
        }
        if (lines.length < 2) {
          sap.m.MessageToast.show("Nothing to upload. File has no data.");
        } else if (lines.length === 2) {
          sap.m.MessageToast.show("1 Phasing successfully uploaded");
        } else {
          sap.m.MessageToast.show((lines.length - 1) + " Phasings successfully uploaded");
        }
        if(aWarningMsg.length > 0){
          util.displayWarnings(aWarningMsg);
        }
      } else {
        sap.m.MessageBox.error(sErr, {
          title: "Error(s) in Upload File",
          styleClass: "sapUiSizeCosy",
          initialFocus: null,
          onClose: function(sAction) { }
        });
      }
    },

    /*
    *
    */
    onUpload: function() {
      var dialog = new sap.m.Dialog({
        title: "Select a CSV (Comma delimited) file to upload",
        type: "Message",
        icon: "sap-icon://excel-attachment",
        contentWidth : "30rem",
        content: [
          new sap.ui.unified.FileUploader({
            width: "100%",
            uploadUrl: "upload/",
            style: "Emphasized",
            maximumFileSize: 6,
            maximumFilenameLength: 255,
            fileType: "csv",
            fileSizeExceed: function(oEvent) {
              sap.m.MessageToast.show("File is too large. Limit is 6MB", {
                my: sap.ui.core.Popup.Dock.CenterCenter,
                at: sap.ui.core.Popup.Dock.CenterCenter
              });
            },
            filenameLengthExceed: function(oEvent) {
              sap.m.MessageToast.show("File name is too large. Limit is 255 characters.", {
                my: sap.ui.core.Popup.Dock.CenterCenter,
                at: sap.ui.core.Popup.Dock.CenterCenter
              });
            },
            typeMissmatch: function(oEvent) {
              var aFileTypes = oEvent.getSource().getFileType();
              jQuery.each(aFileTypes, function(key, value) {aFileTypes[key] = "*." +  value;});
              var sSupportedFileTypes = aFileTypes.join(", ");
              sap.m.MessageToast.show("The file type *." + oEvent.getParameter("fileType") +
                " is not supported. Choose one of the following types: " + sSupportedFileTypes, {
                my: sap.ui.core.Popup.Dock.CenterCenter,
                at: sap.ui.core.Popup.Dock.CenterCenter
              });
            },
            change: function(oEvent) {
              var file = oEvent.getParameter("files")[0];
              if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function(evn) {
                  var strCSV = evn.target.result; //string in CSV
                  this.addImportedLines(strCSV);
                }.bind(this);
                reader.readAsText(file);
              }
              dialog.close();
            }.bind(this)
          })
        ],
        endButton: new sap.m.Button({
          text: "Cancel",
          press: function() {
            dialog.close();
          }
        })
      });
      dialog.open();

    },

    /*
    *
    */
    onDownload: function() {
      jQuery.sap.require("sap.ui.core.util.Export");
      jQuery.sap.require("sap.ui.core.util.ExportTypeCSV");
      var sPath = util.getContextPath(this.getView());

      if(!this.getModel("viewModel").getProperty("/SelectedLine")){
        try{
          this.getModel("viewModel").setProperty("/SelectedLine", this.byId("phasingLineNumberSelect").getSelectedItem().getBindingContext().getObject().LineNumber);
        }
        catch(exception){

        }
      }

      var sLiNum = this.getModel("viewModel").getProperty("/SelectedLine");

      if(!sLiNum){
        return;
      }

      var aFilters = [];
      aFilters.push(new Filter("ItemLineNumber", FilterOperator.EQ, sLiNum));
      aFilters.push(new Filter("IsDeleted", FilterOperator.NE, true));
      var oFilter = [new Filter({
          filters: aFilters,
          and: true
        })];

      var oExport = new sap.ui.core.util.Export({
        exportType: new sap.ui.core.util.ExportTypeCSV({
          fileExtension: "csv",
          separatorChar: ",",
          mimeType: "text/csv",
          charset: "utf-8"
        }),
        models: this.getModel(),
        rows: {
          path: sPath + "Phasings",
          filters: oFilter
        },
        columns: [{
            name: this.getResourceBundle().getText("DeliveryDate"), template: { content: "{path: 'DeliveryDate', type: 'sap.ui.model.type.Date', formatOptions: {pattern:'dd.MM.yyyy', strictParsing:true, UTC: true}}"}
          },{
            name: this.getResourceBundle().getText("SchQuantity"), template: { content: "{path: 'SchQuantity', type:'sap.ui.model.odata.type.Decimal', formatOptions: {decimals: 3, groupingEnabled: false}}" }
          }]
      });

      // download exported file
      var bErr = false;
      oExport.saveFile("Phasings").catch(function(oError) {
        bErr = true;
        sap.m.MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
      }).then(function() {
        oExport.destroy();
        if (! bErr) {
          var sMessage = "Phasings successfully downloaded.";

          sap.m.MessageToast.show(sMessage +=
            "\n\nLink to downloaded file may be displayed on the navigation toolbar at the bottom of your screen (depending on your browser).", {
            duration: 5000,
            width: "30em",
            my: sap.ui.core.Popup.Dock.CenterCenter,
            at: sap.ui.core.Popup.Dock.CenterCenter
          });
        }
      });
    }

  });

});