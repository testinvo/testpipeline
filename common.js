if (typeof (POSTE) == "undefined")
{ POSTE = {}; }

var userRoleAccountTeamFilter = ["1081", //Account
    "1106", //Capo Team
    "1016", //Coordinatore Vendite Business
    "1035", //Coordinatore Vendite Finanziario
    "1013", //Responsabile Vendite Business
    "1017", //Responsabile Vendite Finanziario
    "1082", //Teleseller
    "1001", //Venditore Business
    "1003", //Venditore Finanziario
    "1004", //Venditore Specialista Assicurativo
    "1059", //Specialista Small Business
    "1088", //Coordinatore POE
    "1097" //Venditore SCP
];

POSTE.common = {
    userRoles: {
        VenditoreFinanziario: "1003",
        SpecialistaSmallBusiness: "1059",
        VenditoreBusiness: "1001",
        KeyAccountManager: "1079",
        Account: "1081",
        Teleseller: "1082",
        VenditoreSpecialistaAssicurativo: "1004"
    },
    userTasks: {
        SpecialistaSmallBusiness: 1,
        VenditoreGeneralista: 892570000,
        VenditoreSpecialistaBP: 892570001,
        VenditorePacchi: 14,
        VenditoreSpecialistaAss: 892570010
    },
    clearNotificationHandler: function () {
        setTimeout(POSTE.common.clearNotificationCallback, 15000);
    },
    clearNotificationCallback: function() {
        formContext.ui.clearFormNotification();
        POSTE.common.clearNotificationHandler();
    },
    refreshRibbon: function () {
        formContext.ui.refreshRibbon();
    },
    disableInactiveProcessStageFields: function () {
        formContext.data.process.addOnStageSelected(POSTE.common.OnStageSelectedChanged);
    },
    OnStageSelectedChanged: function (args) {
        //Get selected stage status
        var selectedStageStatus = args.getEventArgs().getStage().getStatus();
 
        //Set disabled blag based on selected stage status
        var disabled = (selectedStageStatus == "inactive");

        //Get stage attributes
        var stageAttributes = args.getEventArgs().getStage().getSteps().get();

        //Enable/Disable field based on selected stage status
        for (var i = 0; i < stageAttributes.length; i++) {
            var schemaName = stageAttributes[i].getAttribute();
            var controlName = POSTE.common.processFieldPrefix + schemaName;
            var control = formContext.getControl(controlName);
            if (control)
                control.setDisabled(disabled);
        }
    },
    processFieldPrefix: "header_process_",
    getProcessIdByName: function (processName) {
        var processId;
        var req = new XMLHttpRequest();
        req.open("GET", encodeURI(formContext.context.getClientUrl() + "/XRMServices/2011/OrganizationData.svc/WorkflowSet?$select=WorkflowId&$filter=Name eq '" + processName + "'"), false);
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var returned = JSON.parse(req.responseText).d;
                    var results = returned.results;
                    processId = results[0].WorkflowId
                }
                else {
                    //alert(this.statusText);
                    var alertStrings = {
                        text: this.statusText
                    };
                    var alertOptions = { height: 120, width: 520 };
                    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
                }
            }
        };
        req.send();
        return processId;
    },
    getStageIdByName: function (stageName, processId) {
        var stageId;
        var req = new XMLHttpRequest();
        req.open("GET", encodeURI(formContext.context.getClientUrl() + "/XRMServices/2011/OrganizationData.svc/ProcessStageSet?$select=ProcessStageId&$filter=ProcessId/Id eq guid'" + processId + "' and StageName eq '" + stageName + "'"), false);
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var returned = JSON.parse(req.responseText).d;
                    var results = returned.results;
                    stageId = results[0].ProcessStageId;
                }
                else {
                    //alert(this.statusText);
                    var alertStrings = {
                        text: this.statusText
                    };
                    var alertOptions = { height: 120, width: 520 };
                    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
                }
            }
        };
        req.send();
        return stageId;
    },
    cloneRecord: function (originRecordType, originRecordGuid) {
        var cloneData = {};
        var result = {};
        var serverUrl = formContext.context.getClientUrl();
        var oDataUri = serverUrl + "/xrmservices/2011/OrganizationData.svc/" +  
                       originRecordType + "Set?$select=*&$filter=" + originRecordType + "Id eq guid'"
                       + originRecordGuid + "'";
        $.support.cors = true;
        $.ajax({
            type: "GET",
            contentType: "application/json; charset=utf-8",
            datatype: "json",
            url: oDataUri,
            async: false, //Synchronous operation 
            beforeSend: function (XMLHttpRequest) {
                //Specifying this header ensures that the results will be returned as JSON.           
                XMLHttpRequest.setRequestHeader("Accept", "application/json");
            },
            success: function (data, textStatus, XmlHttpRequest) {
                if (data && data.d && data.d.results) {
                    cloneData = data.d.results[0];
                    //Here insert the code to skip/transform fields such as Record Id, Date fields, etc..
                    replacer = function (key, value) {
                        if (key == originRecordType + "Id" ||
                            key == "ModifiedOn" || key == "modifiedon" ||
                            key == "CreatedOn" || key == "createdon" ||
                            key == "StateCode" || key == "statecode" ||
                            key == "StatusCode" || key == "statuscode") {

                            return undefined;
                        }
                        else if (key == "CreatedBy" || key == "createdby" ||
                                 key == "ModifiedBy" || key == "modifiedby" ||
                                 key == "OwnerId" || key == "ownerid")
                        {
                            return {
                                Id: globalContext.userSettings.userId,
                                LogicalName: "systemuser",
                                Name: globalContext.userSettings.userName
                            };
                        }
                        else return value;
                    }
                    result.executionSucceded = true;
                    result.data = JSON.parse(JSON.stringify(cloneData, replacer));
                    result.errorMessage = null;
                } else {
                    //No data returned
                }
            },
            error: function (XmlHttpRequest, textStatus, errorThrown) {
                result.executionSucceded = false;
                result.data = null;
                result.errorMessage = XmlHttpRequest.responseText;
            }
        });
        return result;
    }, 
    ptfHasMembers: function (teamName, teamId) {
        var fetch = "";
        fetch += "<fetch no-lock='true' >";
        fetch += "  <entity name='systemuser' >";
        fetch += "      <attribute name='systemuserid' />";
        fetch += "      <link-entity name='teammembership' from='systemuserid' to='systemuserid' intersect='true' >";
        fetch += "          <link-entity name='team' from='teamid' to='teamid' intersect='true' >";
        fetch += "              <filter>";

        if (teamName != null && teamName != "")
            fetch += "              <condition attribute='name' operator='eq' value='" + teamName + "' />";
        else if (teamId != null && teamId != "")
            fetch += "              <condition attribute='teamid' operator='eq' value='" + teamId + "' />"; 

        fetch += "              </filter>";
        fetch +=            "</link-entity>";
        fetch +=        "</link-entity>";
        fetch +=    "</entity>";
        fetch += "</fetch>";

        var result = Sdk.executeFetch("systemusers", fetch);

        if (result != null && result.length > 0)
            return true;
        else
            return false;
    },
    ptfHasMembersByUserTask: function (teamName, teamId, userTasks, userTaskRoles) {
        var fetch = "";
        fetch += "<fetch no-lock='true' >";
        fetch += "  <entity name='systemuser' >";
        fetch += "      <attribute name='systemuserid' />";
        if (userTasks != null && userTasks.length > 0) {
            fetch += "         <filter type='and'>";
            fetch += "             <condition attribute='poste_task' operator='in'>"
            for (var i in userTasks) {
                fetch += "             <value>" + userTasks[i] + "</value>";
            }
            fetch += "             </condition>";
            fetch += "         </filter>";
        }
        fetch += "      <link-entity name='teammembership' from='systemuserid' to='systemuserid' intersect='true' >";
        fetch += "          <link-entity name='team' from='teamid' to='teamid' intersect='true' >";
        fetch += "              <filter>";
        if (teamName != null && teamName != "")
            fetch += "              <condition attribute='name' operator='eq' value='" + teamName + "' />";
        else if (teamId != null && teamId != "")
            fetch += "              <condition attribute='teamid' operator='eq' value='" + teamId + "' />";

        fetch += "              </filter>";
        fetch += "     </link-entity>";
        fetch += "</link-entity>";
        if (userTaskRoles != null && userTaskRoles.length > 0) {
            fetch += "     <link-entity name='poste_systemusertaskrole' from='poste_systemusertaskroleid' to='poste_systemusertaskroleid' link-type='inner' alias='ac'>";
            fetch += "         <filter type='and'>";
            fetch += "             <condition attribute='poste_code' operator='in'>"
            for (var i in userTaskRoles) {
                fetch += "             <value>" + userTaskRoles[i] + "</value>";
            }
            fetch += "             </condition>";
            fetch += "         </filter>";
            fetch += "    </link-entity>";
        }
        fetch += "</entity>";
        fetch += "</fetch>";

        var result = Sdk.executeFetch("systemusers", fetch);

        if (result != null && result.length > 0)
            return true;
        else
            return false;
    },
    getTeamId: function (teamName) {
        var fetch = "";
        fetch += "<fetch version='1.0' output-format='xml-platform' mapping='logical' no-lock='true' >";
        fetch += "  <entity name='team' >";
        fetch += "      <attribute name='teamid' />";
        fetch += "      <filter>";
        fetch += "          <condition attribute='name' operator='eq' value='" + teamName + "' />";
        fetch += "      </filter>";
        fetch += "  </entity>";
        fetch += "</fetch>";

        var result = Sdk.executeFetch("teams", fetch);

        if (result != null && result.length > 0)
            return result[0].teamid;
        else
            return null;
    },
    applyUserRoleAccountTeamFilter: function (formContext, fieldName) {
        var userInfo = POSTE.common.getUserInfo();
        if (userInfo != null && userRoleAccountTeamFilter.indexOf(userInfo.poste_mansionecode) != -1) {
            formContext.getControl(fieldName).addPreSearch(
                function () {
                    var teamFilter = "<filter type='and'>" +
                        "<condition attribute = 'ownerid' operator = 'eq-userteams' /> " +
                        "<condition attribute = 'statecode' operator = 'eq' value = '0' />" +
                        "</filter > "
                    formContext.getControl(fieldName).addCustomFilter(teamFilter, "account")
                });
        }
    },
    currentUserInfo: null,
    getUserInfo: function () {
        if (POSTE.common.currentUserInfo == null) {
            var userId = Xrm.Utility.getGlobalContext().userSettings.userId;
            var userRes = Sdk.executeRetrieveByGuid("systemusers", userId.replace("{", "").replace("}", ""), "?$select=poste_task,poste_taskrole,_territoryid_value&$expand=poste_systemusertaskroleid($select=poste_code)", false);
            POSTE.common.currentUserInfo = {
                poste_task: userRes["poste_task"],
                poste_taskrole: userRes["poste_taskrole"],
                territoryid: userRes["_territoryid_value"] != null ? [{
                    id: userRes["_territoryid_value"],
                    name: userRes["_territoryid_value@OData.Community.Display.V1.FormattedValue"],
                    entityType: userRes["_territoryid_value@Microsoft.Dynamics.CRM.lookuplogicalname"]
                }] : null,
                poste_mansionecode: userRes["poste_systemusertaskroleid"] != null ? userRes["poste_systemusertaskroleid"].poste_code : ""
            };
        }

        return POSTE.common.currentUserInfo;
    },

    //true se l'account passato in input appartiene al portafoglio dell'utente corrente
    isPortfolioAccount: function(accountid) {
        var options = "?$select=accountid&$filter=Microsoft.Dynamics.CRM.EqualUserTeams(PropertyName =@p1) and statecode eq 0 and accountid eq '" + accountid + "' &@p1='ownerid'"
        var accounts = Sdk.executeRetrieve('accounts', options);
        return accounts != null && accounts.length > 0;
    },
    checkPortfolioAccount: function(accountid) {
        var userInfo = POSTE.common.getUserInfo();
        if (userInfo != null && userRoleAccountTeamFilter.indexOf(userInfo.poste_mansionecode) != -1) {
            return POSTE.common.isPortfolioAccount(accountid);
        }
        return true;
    }
}