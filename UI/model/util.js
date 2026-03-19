sap.ui.define([
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/ui/Device",
  "fss/ssp/model/Constants",
    "sap/ui/model/ValidateException"

], function(Filter, FilterOperator, JSONModel, MessageBox, Device, Constants, ValidateException) {
  "use strict";

  return {
    errorStateClass: "containerErrorState",

    validateValueinList: function(sVal, aList, sField) {
      var bResult = true;
      if (sVal !== "") {
        var aFiltered = aList.filter(function(oData){
          return ( oData[sField] === sVal );
        });
        bResult = aFiltered.length > 0;
      }
      return bResult;
    },

    displayWarnings: function(aWarnings, sMessage){
      var sTemp = (sMessage) ? "<p>" + sMessage + "</p>" : "";
      if(aWarnings && aWarnings.length){
        MessageBox.warning(new sap.m.FormattedText({ htmlText: sTemp + this.convertListToFormatted(aWarnings)}),
            {styleClass: "sapUiSizeCompact", actions: [MessageBox.Action.OK]});
      }
    },

    isValidFilename: function(sName) {
      if(!sName){
        return false;
      }
      var rexName = /^[ \w()[\]+\-#$,&_.`~]*$/;

      if (!(sName + "").replace(/(^"|"$)/g, "").match(rexName)) {
        throw new ValidateException("Remove attachment '" + sName + "' as it has invalid characters. Valid characters are Alphanumeric, space and ( ) [ ] + - # $ , & _ . ` ~");
      }
      return true;
    },

    resolveFileNames: function(sName){
      var sInvalid = /[^ \w()[\]+\-#$,&_.`~]+/g;
      return sName.replace(sInvalid, "");
    },

    convertListToFormatted: function(aWarnings){
      var sText = "";
      for(var i in aWarnings){
        sText += "<li>" + aWarnings[i] + "</li>";
      }
      if(sText !== ""){
        sText = "<ul>" + sText + "</ul>";
        return sText;
      }
    },

    convertFiltersToString: function(aFilters){
      if(!Array.isArray(aFilters)){
        aFilters = [aFilters];
      }
      var sResult = "";
      for(var i in aFilters){
        sResult += aFilters[i].sPath + " " + aFilters[i].sOperator + " " + aFilters[i].oValue1 + ", ";
      }
      return sResult;
    },

    /**
     * Return the Device model
     * @public
     * @returns {object} Device model
     */
    createDeviceModel: function() {
      var oModel = new JSONModel(Device);
      oModel.setDefaultBindingMode("OneWay");
      return oModel;
    },

    convertStringToDate: function(sDate){
      var sCurVal = sDate;
      if(!sCurVal){
        return null;
      }

      sCurVal = sCurVal.replace("-", ".").replace("/", ".");

      var dateFormater = sap.ui.core.format.DateFormat.getDateInstance({
          pattern: "dd.MM.yyyy",
          UTC: true
        });
      return dateFormater.parse(sCurVal);
    },

    /**
     * Initialises VhConfigModel by populating the PARENT values in CHILD
     * @public
     */
    initialiseVHConfig: function() {
      var vhConfigData = this.getModel("vhConfigModel").getData();
      for (var oConfig in vhConfigData) {
        if (vhConfigData[oConfig].parent) {
          vhConfigData[oConfig] = $.extend(true, {}, vhConfigData[vhConfigData[oConfig].parent], vhConfigData[oConfig]);
        }
      }
      return oConfig;
    },

    initialiseFilterConfig: function(oParent){
      var filterConfigData = this.getModel("filterConfigModel").getData();
      for (var oConfig in filterConfigData) {
        if (filterConfigData[oConfig].parent) {
          filterConfigData[oConfig] = $.extend(true, {}, filterConfigData[filterConfigData[oConfig].parent], filterConfigData[oConfig]);
        }
      }
      return oConfig;
    },

    /**
     * Finds biding context path for a control
     * @public
     * @param {Control} obj control to check
     * @returns {string} Binding context path
     */
    getContextPath: function(obj, model){
      if(!obj.getBindingContext(model) || !obj.getBindingContext().getPath(model)){
        return "";
      }
      return obj.getBindingContext(model).getPath() + (obj.getBindingContext(model).getPath() === "/" ? "" : "/");
    },

    /**
     * Searches the current element and it's parent up to iMaxLevel for the first
     * element of the required type.
     * @public
     * @param {Element} oCurrElement sCurrent element
     * @param {string} sElementType type of element to search for
     * @param {int} iMaxLevel max number of levels to check
     * @returns {string} Element if found, null otherwise
     */
    getImmediateParentByType: function(oCurrElement, sElementType, iMaxLevel) {
      var oElement = oCurrElement;
      var level = 0;

      var iMaximumLevel = iMaxLevel ? iMaxLevel : 5;

      try {
        do {
          level = level + 1;
          oElement = oElement.getParent();
          if (oElement.getMetadata().getName() === sElementType ||
            oElement.getMetadata().getParent().getName() === sElementType) {
            return oElement;
          }
        } while (level <= iMaximumLevel);

      } catch (e) {
        return null;
      }

      return null;
    },

    /**
     * Searches the current element and it's childrent for the first
     * element of the required type.
     * @public
     * @param {Control} oControl sCurrent element
     * @param {string} sType type of element to search for
     * @returns {string} Element if found, null otherwise
     */
    getImmediateChildByType: function(oControl, sType) {
      var oRetControl = null;
      if (oControl.getMetadata().getName() === sType ||
        oControl.getMetadata().getParent().getName() === sType) {
        oRetControl = oControl;
        return oRetControl;
      }

      var aItems = [];

      //traverse generically, not just content and items
      if (oControl.mAggregations) {
        for (var key in oControl.mAggregations) {
          var item = oControl.mAggregations[key];
          switch ($.type(item)) {
            case "object":
              aItems = aItems.concat(item);
              break;
            case "array":
              for (var i in item) {
                var o = item[i];
                aItems = aItems.concat(o);
              }
              break;
          }
        }
      }

      for (var j in aItems) {
        var oItem = aItems[j];
        oRetControl = this.getImmediateChildByType(oItem, sType);
        if (oRetControl) {
          return oRetControl;
        }
      }

      return oRetControl;
    },

    /**
     * Converts the oData error object to an array of error objetcs(type and message)
     * @public
     * @param {Control} oError oData error object
     * @param {string} resourceBundle i18n resource bundle
     * @returns {Array} Array of error objects
     */
    processODataError: function(oError, resourceBundle, thisDocNum, parentDocNum ) {
      var aErrors = [],
        jsonError = {};
      if (oError.responseText || (oError.response && oError.response.body)) {
        try {
          jsonError = JSON.parse(oError.responseText || oError.response.body);

          var aErrorDetails = jsonError.error.innererror.errordetails;
          if (!aErrorDetails || !Array.isArray(aErrorDetails) || aErrorDetails.length === 0) {
            throw oError.statusText;
          }
          //if it's a Legacy error
          if(jsonError.error.code === "ZMFP/030" || jsonError.error.code === "ZMFP/031"){
            var sHeader = (parentDocNum && thisDocNum) ?  aErrorDetails[0].message.replace(parentDocNum, thisDocNum) : aErrorDetails[0].message;
            aErrors.push({
                code: jsonError.error.code,
                message: new sap.m.FormattedText({ htmlText: sHeader + this.convertListToFormatted(jsonError.error.message.value.split("\n"))})
              });
          }
          for (var i in aErrorDetails) {
            if (aErrorDetails[i].code === "/IWBEP/CX_MGW_TECH_EXCEPTION") {
              if (aErrorDetails.length === 1) {
                aErrors.push({
                  type: sap.ui.core.MessageType.Error,
                  message: resourceBundle.getText("errorText", ["Internal Server Error"])
                });
              }
            } else {
              var sMessageType;
              switch (aErrorDetails[i].severity){
                case "error":
                  sMessageType = sap.ui.core.MessageType.Error;
                  break;
                case "warning":
                  sMessageType = sap.ui.core.MessageType.Warning;
                  break;
                case "success":
                  sMessageType = sap.ui.core.MessageType.Success;
                  break;
                default:
                  sMessageType = sap.ui.core.MessageType.Information;
                  break;
              }
              if(aErrorDetails[i].message){
                aErrors.push({
                  code: aErrorDetails[i].code,
                  type: sMessageType,
                  message: aErrorDetails[i].message + ((aErrorDetails[i].code) ? "(" + aErrorDetails[i].code + ")" : "")
                });
              }
            }
          }

          //Handle exception if the error is a generic gateway error and not a errorList
        } catch (e) {
          aErrors.push({
            type: sap.ui.core.MessageType.Error,
            message: resourceBundle.getText("errorText", [oError.statusText])
          });

        }
      }

      return aErrors;
    },

    /**
     * Loops through the ContractLIs and Phasings of oData and sets empty decimal fields to null.
     * This is to prevent oData gateway errors when value is undefined.
     * @public
     * @param {Control} oData Data to be checked
     */
    _escapeDecimals: function(oData) {
      oData.TotalValue = (oData.TotalValue || oData.TotalValue === 0) ? oData.TotalValue + "" : null;
      oData.ExchangeRate = (oData.ExchangeRate || oData.ExchangeRate === 0) ? oData.ExchangeRate + "" : null;

      var i, j;
      var decimalList = ["UnitPrice", "NetPrice", "UnitQty", "DvdQuantity", "InvQuantity", "QtyLeft", "NetPriceDocCurr", "ExchangeRate"];
      var stringList = ["LineNumber"];
      var aEntity = oData.ContractLIs;
      if (aEntity && Array.isArray(aEntity)) {
        for (i in aEntity) {
          for (j in decimalList) {
            if (aEntity[i].hasOwnProperty(decimalList[j])) {
              aEntity[i][decimalList[j]] = (aEntity[i][decimalList[j]] || aEntity[i][decimalList[j]] === 0) ?
                aEntity[i][decimalList[j]] + "" : null;
            }
          }
          for(j in stringList){
            if (aEntity[i].hasOwnProperty(stringList[j])) {
              aEntity[i][stringList[j]] = (aEntity[i][stringList[j]] || aEntity[i][stringList[j]] === 0) ?
                aEntity[i][stringList[j]] + "" : "";
            }
          }
        }
      }

      aEntity = oData.PurchaseOrderLIs;
      if (aEntity && Array.isArray(aEntity)) {
        for (i in aEntity) {
          for (j in decimalList) {
            if (aEntity[i].hasOwnProperty(decimalList[j])) {
              aEntity[i][decimalList[j]] = (aEntity[i][decimalList[j]] || aEntity[i][decimalList[j]] === 0) ?
                aEntity[i][decimalList[j]] + "" : null;
            }
          }
          for(j in stringList){
            if (aEntity[i].hasOwnProperty(stringList[j])) {
              aEntity[i][stringList[j]] = (aEntity[i][stringList[j]] || aEntity[i][stringList[j]] === 0) ?
                aEntity[i][stringList[j]] + "" : "";
            }
          }
        }
      }

      decimalList = ["SchQuantity", "DvdQuantity", "InvQuantity"];
      stringList = ["PhasingLineNumber", "ItemLineNumber"];
      aEntity = oData.Phasings;
      if (aEntity && Array.isArray(aEntity)) {
        for (i in aEntity) {
          for (j in decimalList) {
            if (aEntity[i].hasOwnProperty(decimalList[j])) {
              aEntity[i][decimalList[j]] = (aEntity[i][decimalList[j]] || aEntity[i][decimalList[j]] === 0) ?
                aEntity[i][decimalList[j]] + "" : null;
            }
          }
          for(j in stringList){
            if (aEntity[i].hasOwnProperty(stringList[j])) {
              aEntity[i][stringList[j]] = (aEntity[i][stringList[j]] || aEntity[i][stringList[j]] === 0) ?
                aEntity[i][stringList[j]] + "" : "";
            }
          }
        }
      }

      decimalList = ["Amount", "Percentage"];
      stringList = ["AssignmentLineNumber", "ItemLineNumber"];
      aEntity = oData.AccountAssignments;
      if (aEntity && Array.isArray(aEntity)) {
        for (i in aEntity) {
          for (j in decimalList) {
            if (aEntity[i].hasOwnProperty(decimalList[j])) {
              aEntity[i][decimalList[j]] = (aEntity[i][decimalList[j]] || aEntity[i][decimalList[j]] === 0) ?
                aEntity[i][decimalList[j]] + "" : null;
            }
          }
          for(j in stringList){
            if (aEntity[i].hasOwnProperty(stringList[j])) {
              aEntity[i][stringList[j]] = (aEntity[i][stringList[j]] || aEntity[i][stringList[j]] === 0) ?
                aEntity[i][stringList[j]] + "" : "";
            }
          }
        }
      }
    },

    /**
     * Validates the ABN number entered to ensure it follows the format given by ABR
     * https://abr.business.gov.au/Help/AbnFormat
     * @public
     * @param {string} abn ABN text
     * @returns {boolean} True if valid, false otherwise
     */
    validateABNFormat: function(abn) {
      var abnStr = (abn + "").replace(/\s/g, "");
      if (abnStr.length !== 11) {
        return false;
      }

      var abnNum = Number(abnStr);
      if (isNaN(abnNum)) {
        return false;
      }

      abnNum = abnNum - 10000000000;
      var aWeight = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
      abnStr = abnNum + "";

      var sum = 0;
      for (var i = 0; i < abnStr.length; i++) {
        sum += Number(abnStr[i]) * aWeight[i];
      }

      return (sum % 89 === 0);

    },

    /**
     * Loads the dropdown data from oData and sets it to the JSON model. It limits payment terms,
     * sets common order units and hardcodes Account Assignment
     * @public
     * @param {Control} oParent Parent control to set the model to
     * @param {i18nModel} i18nModel i18n model
     */
    loadDropDowns: function(oParent, i18nModel) {
      var dropDownModel = new JSONModel();
      dropDownModel.setSizeLimit(1000);
      oParent.setModel(dropDownModel, "dropDownModel");

      var empModel = new JSONModel();
      oParent.setModel(empModel, "empModel");

      // var disableModel = new JSONModel();
      // oParent.setModel(disableModel, "disableModel");

      var aFilters = [];
      var oResourceBundle = (i18nModel) ? i18nModel.getResourceBundle() : oParent.getResourceBundle();
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "PaymentTerms"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "PaymentTermsJustifications" ));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "Currency"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "CompanyCode"));
      // aFilters.push(new Filter("DataType", FilterOperator.EQ, "AssignmentType" ));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "Funds"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "ESPs"));
      // aFilters.push(new Filter("DataType", FilterOperator.EQ, "MaterialGroups" ));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "OrderUnits"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "TaxCodes"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "Country"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "Region"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "PRFURL"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "HelpUrl"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "EmpType"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "DistributionTypes"));
      aFilters.push(new Filter("DataType", FilterOperator.EQ, "PartialInvoices"));
      // aFilters.push(new Filter("DataType", FilterOperator.EQ, "DisableFlag"));
      // aFilters.push(new Filter("DataType", FilterOperator.EQ, "CurrencyFormat"));
      aFilters = [new Filter({
        filters: aFilters,
        and: false
      })];

      var aCommonOrderUnits = Constants.COMMON_ORDER_UNITS;
      // var commonMaterialGroups = ["2090", "2590", "5340", "72100000", "80101600B", "CONSULTNT", "GEN SVC", "LEGAL SVC", "OTHERITEM", "SME PURCH"];
      var commonText = "Common";
      var nonCommon = "Other";
      var aPayTerms = Constants.PAY_TERMS;
      var aPaymentTermsJustifications = Constants.PAYMENT_TERMS_JUSTIFICATIONS;
      var aAssignmentTypes = Constants.ASSIGNMENT_TYPES;
      var aAssignmentTypesContract = Constants.ASSIGNMENT_TYPES_CONTRACT;


      var mParameters = {
        method: "GET",
        filters: aFilters,
        success: function(oData) {
          var obj = oData.results;
          var obj2 = {};
          var emptyLine = {
            Key: "",
            Value: "",
            Rate: ""
          };
          for (var i in obj) {
            if (!obj2[obj[i].DataType]) {
              obj2[obj[i].DataType] = [];
              if (obj[i].DataType !== "OrderUnits" && obj[i].DataType !== "EmpType" && obj[i].DataType !== "DisableFlag") {
                obj2[obj[i].DataType].push($.extend({}, emptyLine));
              }
            }
            obj2[obj[i].DataType].push(obj[i]);
          }

          //If the service didn't return a list or the list only has the empty line
          if(!obj2.PaymentTermsJustifications || obj2.PaymentTermsJustifications.length <= 1){
            obj2.PaymentTermsJustifications = aPaymentTermsJustifications;
          }

          obj2.AssignmentType = aAssignmentTypes;
          obj2.AssignmentTypeContract = aAssignmentTypesContract;

          obj2.fileTypes = ["jpg", "jpeg", "txt", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "csv", "pdf", "png", "obr", "tif", "tiff",
            "gif", "msg", "htm", "html", "mht", "zip"
          ];

          obj2.AddressTypes = [{Key: "", Value: ""}];
          for(i in Constants.ADDRESS_TYPES){
            obj2.AddressTypes.push({Key: Constants.ADDRESS_TYPES[i].key, Value: oResourceBundle.getText(Constants.ADDRESS_TYPES[i].value)});
          }

          obj2.results = obj;

          obj2.TaxRate = {};
          obj2.CurrencyRate = {};
          obj2.CurrencyFactor = {};

          // if (obj2.MaterialGroups) {
          //  for (i in obj2.MaterialGroups) {
          //    if (commonMaterialGroups.indexOf(obj2.MaterialGroups[i].Key) >= 0) {
          //      obj2.MaterialGroups[i].Group = commonText;
          //    } else {
          //      obj2.MaterialGroups[i].Group = nonCommon;
          //    }
          //  }
          // }

          if (obj2.OrderUnits) {
            for (i in obj2.OrderUnits) {
              if (aCommonOrderUnits.indexOf(obj2.OrderUnits[i].Key) >= 0) {
                obj2.OrderUnits[i].Group = commonText;
              } else {
                obj2.OrderUnits[i].Group = nonCommon;
              }
            }
          }

          if (obj2.PaymentTerms) {
            for (i = obj2.PaymentTerms.length - 1; i >= 0; i--) {
              if (aPayTerms.indexOf(obj2.PaymentTerms[i].Key) < 0) {
                obj2.PaymentTerms.splice(i, 1);
              }
            }
          }

          var taxCodes = obj2.TaxCodes;
          if (taxCodes) {
            for (i in taxCodes) {
              if (taxCodes[i].Key !== "") {
                obj2.TaxRate[taxCodes[i].Key] = taxCodes[i].Rate;
              }
            }
          }
          var currencies = obj2.Currency;
          var currencyDigits;
          try{
            currencyDigits = sap.ui.core.format.NumberFormat.getCurrencyInstance().oLocaleData.mData.currencyDigits;
          }
          catch(exception){
            setTimeout(
              function() {
                try{
                  currencyDigits = sap.ui.core.format.NumberFormat.getCurrencyInstance().oLocaleData.mData.currencyDigits;
                  if (currencies && currencyDigits) {
                    for (i in currencies) {
                      if (currencies[i].Name) {
                        currencyDigits[currencies[i].Key] = Number(currencies[i].Name);
                      }
                    }
                  }
                }
                catch(exception2){
                }
              }, 1000);
          }

          if (currencies) {
            for (i in currencies) {
              if (currencies[i].Key !== "") {
                obj2.CurrencyRate[currencies[i].Key] = currencies[i].Rate;
                obj2.CurrencyFactor[currencies[i].Key] = Number(currencies[i].Factor || 1);

                if (currencyDigits && currencies[i].Name) {
                  currencyDigits[currencies[i].Key] = Number(currencies[i].Name);
                }
              }

            }
          }
          dropDownModel.setData(obj2);
          var sEmpType = "";
          if(obj2.EmpType && obj2.EmpType[0]){
            sEmpType = obj2.EmpType[0].Value;
          }
          empModel.setData({"EmpType": sEmpType});
          empModel.updateBindings();

          // var bDisableFlag = false;
          // if(obj2.DisableFlag && obj2.DisableFlag[0].Value){
          //  bDisableFlag = [true, "True", "true", "TRUE"].indexOf(obj2.DisableFlag[0].Value) > -1 ;
          // }
          // disableModel.setData({"DisableFlag": bDisableFlag});
          // disableModel.updateBindings();

          // //Apply currency formatter from backend
          // for (i in obj2.CurrencyFormat){
          //  if(obj2.CurrencyFormat[i].Key){
          //    currencyDigits[obj2.CurrencyFormat[i].Key] = Number(obj2.CurrencyFormat[i].Value);
          //  }
          // }

        }.bind(this),
        error: function(oError) {
          var aErrors = this.processODataError(oError, oResourceBundle);

          MessageBox.error(oResourceBundle.getText("dropdownRead.error", [aErrors[0].message]));
        }.bind(this)
      };
      var oModel = oParent.getModel("searchHelpModel");
      if (!oModel) {
        oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZEDM_SEARCHHELP_SRV", {
          useBatch: false,
          defaultCountMode: sap.ui.model.odata.CountMode.Inline
        });
      }
      oModel.read("/RefDataSet", mParameters);
    },

    /**
     * A utility function to remove RESULT object and move its content one level higher
     * @public
     * @param {object} obj Object to be cleaned
     */
    removeResults: function(obj) {
      if (!obj) {
        return;
      }

      if (typeof obj === "object") {
        for (var i in obj) {
          if (obj[i] && (typeof obj[i] === "object") && (obj[i].results)) {
            obj[i] = obj[i].results;
            this.removeResults(obj[i]);
          }
        }
      }
    },

    /**
     * A utility function to remove __metadata from the object and it's children.
     * @public
     * @param {Object} obj Object to be cleaned
     */
    removeMetadata: function(obj) {
      if (!obj) {
        return;
      }

      if (obj.__metadata) {
        delete obj.__metadata;
      }

      if (typeof obj === "object") {
        for (var i in obj) {
          if (Array.isArray(obj[i])) {
            for (var j in obj[i]) {
              this.removeMetadata(obj[i][j]);
            }
          } else if (obj[i] && (typeof obj[i] === "object") && (obj[i] !== null)) {
            this.removeMetadata(obj[i]);
          }
        }
      }
    },

    //Finds the length of a property in metadata.
    //Go through the metadata of oModel, find the sEntity in aEntityList, find the sProperty in properties,
    //return maxLength
    getOdataPropertyLength: function(oModel, sEntity, sProperty){
      if (!oModel.getServiceMetadata || !oModel.getServiceMetadata()) {
        return null;
      }
      var metadata = oModel.getServiceMetadata();
      if (!metadata.dataServices || !metadata.dataServices.schema || !Array.isArray(metadata.dataServices.schema) ||
          !metadata.dataServices.schema.length === 0) {
        return null;
      }
      var aSchema = metadata.dataServices.schema;
      var oProperties;
      for (var i in aSchema) {
        if (aSchema[i].entityType && Array.isArray(aSchema[i].entityType) && aSchema[i].entityType.length > 0) {
          for (var j in aSchema[i].entityType) {
            if (sEntity === aSchema[i].entityType[j].name) {
              oProperties = aSchema[i].entityType[j].property;
              if (Array.isArray(oProperties) && oProperties.length > 0) {
                for (var k in oProperties) {
                  if (oProperties[k].name === sProperty) {
                    return oProperties[k].maxLength;
                  }
                }
              }
            }
          }
        }
      }
      return null;

    },

    // NOT IN USE - LEAVE IT AS AN EXAMPLE
    //Go through the metadata of oModel, find the Entities in aEntityList, for the properties which are boolean,
    //set the default value to false in oData
    setDefaultBooleans: function(oData, oModel, aEntityList) {
      if (!oModel.getServiceMetadata || !oModel.getServiceMetadata()) {
        return;
      }
      var metadata = oModel.getServiceMetadata();
      if (!metadata.dataServices || !metadata.dataServices.schema || !Array.isArray(metadata.dataServices.schema) || !metadata.dataServices
        .schema.length === 0) {
        return;
      }
      var aSchema = metadata.dataServices.schema;
      var oProperties;
      for (var i in aSchema) {
        if (aSchema[i].entityType && Array.isArray(aSchema[i].entityType) && aSchema[i].entityType.length > 0) {
          for (var j in aSchema[i].entityType) {

            if (aEntityList.indexOf(aSchema[i].entityType[j].name) > -1) {
              oProperties = aSchema[i].entityType[j].property;
              if (Array.isArray(oProperties) && oProperties.length > 0) {
                for (var k in oProperties) {
                  if (!oData[aSchema[i].entityType[j].name]) { //if top level entity
                    if (oProperties[k].type === "Edm.Boolean" && !oData[oProperties[k].name]) {
                      oData[oProperties[k].name] = false;
                    }
                  } else if (oProperties[k].type === "Edm.Boolean" && !oData[aSchema[i].entityType[j].name][oProperties[k].name]) {
                    oData[aSchema[i].entityType[j].name][oProperties[k].name] = false;
                  }
                }
              }
            }
          }
        }
      }

    },

    // NOT IN USE - LEAVE IT AS AN EXAMPLE
    //Generates a random GUID
    generateGuid: function() {
      var dt = new Date().getTime();
      var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
      return uuid;
    },

    /**
     * Sets placeholder text for all VH inputs automatically
     * @public
     * @param {array} items list of items
     * @param {Control} parentController parent control of the item
     */
    setDefaultPlacementTextVH: function(items, parentController) {
      var types = ["Input"];
      var type, typeParts;
      var that = this;
      var oResourceBundle = parentController.getResourceBundle();
      var oComponenet = parentController.getOwnerComponent();
      var vhConfigData = oComponenet.getModel("vhConfigModel").getData();
      var sPlaceHolder, vhConfig, sDialogName, dialogTitle, fieldName;
      $(items).each(function() {
        sPlaceHolder = "";
        typeParts = this.getMetadata().getName().split(".");
        type = typeParts[typeParts.length - 1];
        if (types.indexOf(type) > -1) {
          if(!(this.data() && this.data().dialogName)){
            return;
          }
          sDialogName = this.data().dialogName;
          vhConfig = vhConfigData[sDialogName];

          if (!sDialogName || !vhConfig) {
            return;
          }
          dialogTitle = oResourceBundle.getText(vhConfig.dialogTitle);
          for (fieldName in vhConfig.fieldList) {
            if (vhConfig.fieldList[fieldName].isKey) {
              sPlaceHolder = oResourceBundle.getText("vh.EQ.placeholder", [dialogTitle]);// + " " + oResourceBundle.getText(vhConfig.fieldList[fieldName].label)]);
              this.setPlaceholder(sPlaceHolder);
              return;
            }
          }
        }
        else if (this.getItems) {
          that.setDefaultPlacementTextVH(this.getItems(), parentController);
        } else if (this.getContent) {
          that.setDefaultPlacementTextVH(this.getContent(), parentController);
        }else if (this.getFormContainers) {
          that.setDefaultPlacementTextVH(this.getFormContainers(), parentController);
        }else if (this.getFormElements) {
          that.setDefaultPlacementTextVH(this.getFormElements(), parentController);
        }else if (this.getFields) {
          that.setDefaultPlacementTextVH(this.getFields(), parentController);
        }
      });
    },

    /**
     * Sets all content/items of a container to be readonly(Editable=false or Enable=false).
     * The prefrence is to make controls non-editable, if not, it set enabled to false.
     * @public
     * @param {Control} container Container to be made readonly
     */
    makeContainerReadOnly: function(container) {
      if (container.getItems) {
        this.makeFormReadOnly(container.getItems());
      } else if (container.getContent) {
        this.makeFormReadOnly(container.getContent());
      }
    },

    /**
     * Sets all items to be readonly(Editable=false or Enable=false).
     * The prefrence is to make controls non-editable, if not, it set enabled to false.
     * It sets Buttons and icon tab seperators to be invisible
     * @public
     * @param {Array<Control>} items Array of controls to be made readonly
     */
    makeFormReadOnly: function(items) {
      var types = ["ComboBox", "Input", "Select", "DatePicker", "TextArea", "ExpandableTextArea", "CheckBox", "RadioButtonGroup", "Label", "Switch", "MultiInput",
        "StepInput", "SegmentedButton"
      ];
      var type, typeParts;
      var that = this;
      $(items).each(function() {
        typeParts = this.getMetadata().getName().split(".");
        type = typeParts[typeParts.length - 1];
        if (types.indexOf(type) > -1) {
          if (this.getRequired) {
            this.unbindProperty("required");
            this.setRequired(false);
          }

          if (this.getEditable) {
            if( type === "ExpandableTextArea" && this.getEditable()){
              this.removeAllAggregation("_endIcon");
              this.setRows(this.getRows() + 1);
              this.setPlaceholder("");
            }

            this.unbindProperty("editable");
            this.setEditable(false);
            //if we are able to set it to Editable=false, make it enabled for better visibility
            if (this.getEnabled) {
              this.setEnabled(true);
              this.unbindProperty("enabled");
            }
          } else if (this.getEnabled) {
            this.unbindProperty("enabled");
            this.setEnabled(false);
          }
        } else if (type === "Button") {
          if(this.data && this.data().keepInDisplay === "true"){
            return;
          }
          this.unbindProperty("visible");
          this.setVisible(false);
        } else if (type === "IconTabSeparator") {
          if(this.data && this.data().keepInDisplay === "true"){
            return;
          }
          this.unbindProperty("visible");
          this.setVisible(false);
        } else if (this.getItems) {
          that.makeFormReadOnly(this.getItems());
        } else if (this.getContent) {
          that.makeFormReadOnly(this.getContent());
        }
      });
    },

    /**
     * Sets the value state for the tabs and a number of errors for each one.
     * @public
     * @param {Array} oErrorList List of UI errors
     * @param {ArIconTabBar} oIconTabBarControl Icon tab bar control
     */
    setTabsValueState: function(oErrorList, oIconTabBarControl) {
      var oFilters = oIconTabBarControl.getItems();
      for (var i in oFilters) {
        if (oFilters[i].getVisible() && oFilters[i].getKey && oErrorList[oFilters[i].getKey()]) {
          var iLength = oErrorList[oFilters[i].getKey()].length;
          if (iLength > 0) {
            oFilters[i].setIconColor(sap.ui.core.IconColor.Negative);
            oFilters[i].setCount(iLength);
          } else {
            this.clearSingleTabValueState(oFilters[i]);
          }
        }
      }
    },

    /**
     * Clears the value state for all tabs.
     * @public
     * @param {ArIconTabBar} oIconTabBarControl Icon tab bar control
     */
    clearTabsValueState: function(oIconTabBarControl) {
      var oFilters = oIconTabBarControl.getItems();
      for (var i in oFilters) {
        this.clearSingleTabValueState(oFilters[i]);
      }
    },

    /**
     * Clears the value state for the given tab.
     * @public
     * @param {IconTab} oIconTabFilterControl Icon tab to be cleared
     */
    clearSingleTabValueState: function(oIconTabFilterControl) {
      if (oIconTabFilterControl && oIconTabFilterControl.setDesign && oIconTabFilterControl.setCount) {
        oIconTabFilterControl.setIconColor(sap.ui.core.IconColor.Default);
        oIconTabFilterControl.setCount("");
      }
    },

    /**
     * Utility function to clear controls. It loops through the Controls and sets the ValueState to None and
     * setShowValueStateMessage to false.
     * @public
     * @param {Array<Control>} oControls Controls to be cleared
     * @param {XMLView} oView View the controls belong to
     */
    clearRequiredControls: function(oControls, oView) {
      if (oView.byId) {
        var byIdFunc = oView.byId.bind(oView.getController());
        if (oView.getController().getById) {
          byIdFunc = oView.getController().getById.bind(oView.getController());
        }
      }
      var that = this;
      if (!Array.isArray(oControls)) {
        for (var sTab in oControls) {
          if (Array.isArray(oControls[sTab])) {
            this.clearRequiredControls(oControls[sTab], oView);
          }
        }
      } else {
        $(oControls).each(function() {
          if (Array.isArray(this)) {
            that.clearRequiredControls(this, oView);
            return;
          }
          if (this.setValueState) {
            this.setValueState(sap.ui.core.ValueState.None);

            //for checkboxes, if it's part of a group, check all members of the group
            if (this.data("group") && this.data("group") !== "") {
              var aGroupIds = this.data("group").split(" ");
              for (var i in aGroupIds) {
                if (byIdFunc(aGroupIds[i]) && byIdFunc(aGroupIds[i]).setValueState) {
                  byIdFunc(aGroupIds[i]).setValueState(sap.ui.core.ValueState.None);
                }
              }
            }
          }
          if (this.setShowValueStateMessage) {
            this.setShowValueStateMessage(false);
          }
          if (this.hasStyleClass && this.hasStyleClass(that.errorStateClass)) {
            this.removeStyleClass(that.errorStateClass);
          }
        });
      }
    },

    /**
     * Utility function to check all mandatory controls. It loops through the Controls list and identifies the controls which
     * have no/invalid values selected, it tries to set their valueState to Error, adds them to the list of oErrorControls
     * and returns False.
     * @public
     * @param {Array<Control>} oMandatoryControls Controls to be checked
     * @param {Array<Control>} oErrorControls Controls which did not pass the check
     * @param {XMLView} oView View containing the controls
     * @returns {boolean} True if all set correctly, False if there is an issue
     */
    checkRequiredControls: function(oMandatoryControls, oErrorControls, oView) {
      if (oView.byId) {
        var byIdFunc = oView.byId.bind(oView.getController());
        if (oView.getController().getById) {
          byIdFunc = oView.getController().getById.bind(oView.getController());
        }
      }
      var type, typeParts;
      var allPassed = true;
      var that = this;
      if (!oErrorControls) {
        oErrorControls = [];
      }
      $(oMandatoryControls).each(function() {
        var valueSatateMessage = "Field cannot be empty";
        var thisPassed = true;
        typeParts = this.getMetadata().getName().split(".");
        type = typeParts[typeParts.length - 1];

        if (((this.getRequired && !this.getRequired() && this.data("validate") !== true && this.data("validate") !== "true") ||
          (this.getEnabled && !this.getEnabled()) ||
          (this.getEditable && !this.getEditable()) ||
          (this.getVisible && !this.getVisible()))) {
          return;
        }

        switch (type) {
          case "Table":
          case "UploadCollection":
            if ((this.data("required") === true || this.data("required") === "true") && (!this.getItems() || this.getItems().length === 0)) {
              allPassed = false;
              thisPassed = false;
            } else {
              thisPassed = true;
            }
            break;
          case "CheckBox":
            var aGroupIds = [];
            if (this.data("group") && this.data("group") !== "") {
              aGroupIds = this.data("group").split(" ");
            }

            if (this.getSelected()) {
              thisPassed = true;
            } else if (aGroupIds.length === 0) {
              allPassed = false;
              thisPassed = false;
            } else {
              thisPassed = false;
              for (var i in aGroupIds) {
                if (byIdFunc(aGroupIds[i]) && byIdFunc(aGroupIds[i]).getSelected) {
                  thisPassed = (thisPassed || byIdFunc(aGroupIds[i]).getSelected());
                }
              }
              allPassed = thisPassed && allPassed;
            }

            this.setValueState(thisPassed ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
            for (i in aGroupIds) {
              if (byIdFunc(aGroupIds[i]) && byIdFunc(aGroupIds[i]).getSelected) {
                byIdFunc(aGroupIds[i]).setValueState(thisPassed ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
              }
            }
            if (!thisPassed) {
              oErrorControls.push(this);
            }
            return;

          case "RadioButtonGroup":
            if (this.getSelectedIndex() < 0) {
              allPassed = false;
              thisPassed = false;
            } else {
              thisPassed = true;
            }
            break;

          case "Input":
          case "TextArea":
          case "ExpandableTextArea":
            if (!this.getValue() || this.getValue() === "" || (!isNaN(Number(this.getValue())) && Number(this.getValue()) === 0)) {
              allPassed = false;
              thisPassed = false;
            } else {
              try {
                if (this.getBinding("value").getType() && this.getBinding("value").getType().validateValueCustom){
                  this.getBinding("value").getType().validateValueCustom(this.getValue(), this);
                }
                if(this.getBinding("value").getType()){
                  this.getBinding("value").getType().validateValue(this.getBinding("value").getType().parseValue(this.getValue(), "string"));
                }
                if(this.getMaxLength() && this.getValue().length > this.getMaxLength()){
                  allPassed = false;
                  thisPassed = false;
                  valueSatateMessage = this.getModel("i18n").getResourceBundle().getText("validation.error.overLimitChars");
                  break;
                }
                thisPassed = true;
              } catch (oException) {
                allPassed = false;
                thisPassed = false;
                valueSatateMessage = oException.message;//"Invalid entry";
              }
            }
            break;

          case "StepInput":
            if (this.getValue() === undefined || this.getValue() === null) {
              allPassed = false;
              thisPassed = false;
            } else {
              thisPassed = true;
            }
            break;
          case "MultiInput":
            if (!this.getTokens() || this.getTokens().length === 0) {
              allPassed = false;
              thisPassed = false;
            } else {
              thisPassed = true;
            }
            break;
          case "ComboBox":
          case "Select":
            if (!this.getSelectedKey()) {
              allPassed = false;
              thisPassed = false;
            } else {
              thisPassed = true;
            }
            break;
          case "DatePicker":
            if (!this.getDateValue()) {
              allPassed = false;
              thisPassed = false;
              if (this.getValue()) {
                valueSatateMessage = "Invalid Date";
              }
            } else if (this._bValid === false) {
              allPassed = false;
              thisPassed = false;
              valueSatateMessage = "Invalid Date";
            } else {
              // //this is added to check if there is an invalid date value entered manually. In this case UI5 retains the previous VALID date
              var date = this.getDateValue();
              var value = this.getValue();
              var displayFormat = this.getDisplayFormat();
              var dateFormater = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: displayFormat
              });
              var formattedDate = dateFormater.format(date);
              if (formattedDate !== value) {
                allPassed = false;
                thisPassed = false;
                valueSatateMessage = "Invalid Date";
              } else {
                thisPassed = true;
              }
            }
            break;
          default:
            // sap.m.MessageToast.show("Unhandled type: " + type);
            break;
        }

        if (thisPassed) {
          if (this.setValueState) {
            this.setValueState(sap.ui.core.ValueState.None);
          }
          if (this.setShowValueStateMessage) {
            this.setShowValueStateMessage(false);
          }

          if (this.hasStyleClass && this.hasStyleClass(that.errorStateClass)) {
            this.removeStyleClass(that.errorStateClass);
          }

        } else {
          oErrorControls.push(this);
          if (this.setValueState && this.setShowValueStateMessage) {
            this.setValueState(sap.ui.core.ValueState.Error);
            this.setShowValueStateMessage(true);
            this.setValueStateText(valueSatateMessage);
          } else if (this.setValueState) {
            this.setValueState(sap.ui.core.ValueState.Error);
          } else if (this.hasStyleClass && !this.hasStyleClass(that.errorStateClass)) {
            this.addStyleClass(that.errorStateClass);
          }

        }
      });
      return allPassed;
    },

    /**
     * Utility function to build a list of mandatory fields. It traverses all the items and adds the controls which are of a type in
     * TYPES where the required flag is true, to the RequiredControls array. If there is a container,
     * it traverses the children of the container too.
     * @public
     * @param {Array<Control>} items List of all controls to be checked
     * @param {Array<Control>} requiredControls List Controls which are required
     */
    getRequiredControls: function(items, requiredControls) {
      var types = ["ComboBox", "Input", "Select", "DatePicker", "TextArea", "ExpandableTextArea", "RadioButtonGroup", "MultiInput", "StepInput"];
      var type, typeParts;
      var that = this;
      $(items).each(function() {
        typeParts = this.getMetadata().getName().split(".");
        type = typeParts[typeParts.length - 1];
        if (types.indexOf(type) > -1) {
          if (((this.getRequired && (this.getRequired() || this.getBinding("required")))  || (this.data("validate") === true || this.data("validate") === "true")) &&
            (!this.getEnabled || (this.getEnabled && (this.getEnabled() || this.getBinding("enabled")))) &&
            (!this.getEditable || (this.getEditable && (this.getEditable() || this.getBinding("editable")))) &&
            (!this.getVisible || (this.getVisible && (this.getVisible() || this.getBinding("visible"))))) {
            requiredControls.push(this);
          }
        }
        //There is no Required for checkbox so implementing it using CustomData
        else if (type === "CheckBox" &&
          (!this.getEnabled || (this.getEnabled && (this.getEnabled() || this.getBinding("enabled")))) &&
          (!this.getEditable || (this.getEditable && (this.getEditable() || this.getBinding("editable")))) &&
          (!this.getVisible || (this.getVisible && (this.getVisible() || this.getBinding("visible"))))) {
          if (this.data("label") ) {
            requiredControls.push(this);
          }
        } else if ((type === "Table" || type === "UploadCollection")) { //&& this.data("required")){
          requiredControls.push(this);
        } else if (type === "VBox" || type === "HBox") {
          that.getRequiredControls(this.getItems(), requiredControls);
        } else if (type === "Grid" || type === "SimpleForm" || type === "XMLView" || type === "Panel") {
          that.getRequiredControls(this.getContent(), requiredControls);
        }
      });
    }
  };

});