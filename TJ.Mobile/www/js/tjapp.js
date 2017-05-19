var baseUrl = "http://app.2jours.nl";

var loggedIn = null;
var app;
var urenboekenViewModel = null;
var projectId, werkId, budgetId, stelpostId, uursoortId;
var today = new Date();
var prevWeek, nextWeek;
var invoerUren;
var calendar;
var dateUrenoverzicht = new Date();
var arrKeyCodes = [];

function InitApp() {

    InitAjax();

    app = new Framework7({
        cache: false
    });

    prevWeek = getPrevWeek(today);
    nextWeek = getNextWeek(today);

    myApp.onPageBeforeAnimation("indirecteureninvoeren", function (page) {

        var vandaag = new Date();

        var yy = "" + vandaag.getFullYear();
        var mm = "" + (vandaag.getMonth() + 1);
        var dd = "" + vandaag.getDate();

        if (mm.length == 1) mm = "0" + mm;
        if (dd.length == 1) dd = "0" + dd;

        var datum = dd + "/" + mm + "/" + yy;

        $("#datumIndirect").val(datum);

        calendar = app.calendar({
            input: '#datumIndirect',
            dateFormat: 'dd/mm/yyyy',
            closeOnSelect: true
        });

        $.ajax({
            async: false,
            type: "GET",
            beforeSend: function (request) {
                setToken(request);
                showLoader();
            },
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            url: baseUrl + "/v1/mobile/uren/indirectewerken/",
            success: function (data, textStatus, request) {
                var indirectewerken = data;
                var indirectId = $("#indirectId");

                if ($.isArray(indirectewerken)) {
                    for (var w in indirectewerken) {
                        var indirectwerk = indirectewerken[w];
                        indirectId.append($("<option value='" + indirectwerk.id + "'>" + indirectwerk.omschrijving + "</option>"));
                    }
                }

                if (typeof (invoerUren) === "object" && invoerUren != null) {
                    var arr = invoerUren.datum.split('T')[0].split('-');
                    $("#datumIndirect").val(arr[2] + "/" + arr[1] + "/" + arr[0]);
                    indirectId.val(invoerUren.indirectwerkId);
                    $("#aantal").val(invoerUren.aantal);
                }
            }
        });
    });

    myApp.onPageBeforeAnimation("urenoverzicht", function (page) {

        ToonUrenoverzichtItems(dateUrenoverzicht);

    });

    myApp.onPageBeforeAnimation('ureninvoeren', function (page) {

        uursoortId = $("#uursoortId");

        var vandaag = new Date();

        var yy = "" + vandaag.getFullYear();
        var mm = "" + (vandaag.getMonth() + 1);
        var dd = "" + vandaag.getDate();

        if (mm.length == 1) mm = "0" + mm;
        if (dd.length == 1) dd = "0" + dd;

        var datum = dd + "/" + mm + "/" + yy;
        $("#datum").val(datum);

        var medewerkerId = GetMedewerkerId();

        calendar = app.calendar({
            input: '#datum',
            dateFormat: 'dd/mm/yyyy',
            closeOnSelect: true
        });

        $("#aantal").keydown(function (e) {
            return FormatDecimal(e);
        });

        $.ajax({
            async: false,
            type: "GET",
            beforeSend: function (request) {
                setToken(request);
            },
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            url: baseUrl + "/v1/mobile/uren/" + medewerkerId,
            success: function (data, textStatus, request) {
                urenboekenViewModel = data;

                if (typeof (invoerUren) === "object" && invoerUren != null) {

                    ResetUursoorten(invoerUren.uursoortId);
                    ResetProjecten(invoerUren.projectId);

                    var arr = invoerUren.datum.split('T')[0].split('-');

                    $("#datum").val(arr[2] + "/" + arr[1] + "/" + arr[0]);

                    if (invoerUren.projectId != 0) {
                        $("#projectId").val(invoerUren.projectId);
                        $("#projectId").removeAttr("disabled");
                    }
                    if (invoerUren.werkId != 0) {
                        $("#werkId").val(invoerUren.werkId);
                        $("#werkId").removeAttr("disabled");
                        ddlWerkChanged(invoerUren.werkId);
                    }
                    if (invoerUren.budgetId != 0) {
                        $("#budgetId").val(invoerUren.budgetId);
                        $("#budgetId").removeAttr("disabled");
                    }
                    if (invoerUren.stelpostId != 0) {
                        $("#stelpostId").val(invoerUren.stelpostId);
                        $("#stelpostId").removeAttr("disabled");
                    }
                    if (invoerUren.uursoortId != 0) {
                        $("#uursoortId").val(invoerUren.uursoortId);
                    }

                    $("#aantal").val(invoerUren.aantal);

                } else {

                    ResetUursoorten(0);
                    ResetProjecten(0);
                }
            },
            complete: function () {
                hideLoader();
            }
        });
    });


    myApp.onPageInit('*', function (page) {

        var cred = app.formGetData('credentials');
        if (typeof (cred) == "object" && cred !== null) {
            $("td.userName").text(cred.user.naam + " " + cred.user.achternaam);
        }
    });


    var storedCredentials = app.formGetData('credentials');
    try {

        if (storedCredentials.stayLoggedIn == 1) {

            GetSession(storedCredentials.relatieId, storedCredentials.gebruikersnaam, storedCredentials.wachtwoord, function (data) {
                CloseLoginScreen();
                mainView.router.loadPage('urenoverzicht.html');
            });

        } else {
            $("#relatieId").val(storedCredentials.relatieId);
            $("#gebruikersnaam").val(storedCredentials.gebruikersnaam);
            $("#wachtwoord").val();
            ShowLoginScreen();
        }

    } catch (e) {
        ShowLoginScreen();
    }


}

function fillDatumField() {

}

function showLoader() {
    myApp.showPreloader("Even geduld a.u.b.");
}

function Logout() {

    $.ajax({
        async: false,
        type: "DELETE",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: baseUrl + "/v1/sessions/" + getStore('token'),
        success: function (data, textStatus, request) {
            setStore('token', null);

            var storedCredentials = app.formGetData('credentials');
            if (storedCredentials !== null) {
                storedCredentials.stayLoggedIn = 0;
                $("#stayLoggedIn").removeAttr("checked");
                app.formStoreData('credentials', storedCredentials);
            }

            ShowLoginScreen(storedCredentials);
        }
    });
}

function setToken(request) {

    try {
        var token = getStore("token");
        request.setRequestHeader("Authorization", "Bearer " + token);
    } catch (e) {

    }
}

function GetSessionByLogin() {

    var relatieId = $("#relatieId").val();
    var gebruikersnaam = $("#gebruikersnaam").val();
    var wachtwoord = $("#wachtwoord").val();

    if (relatieId.length == 0 && gebruikersnaam.length == 0 && wachtwoord.length == 0) {
        myApp.alert("Vul a.u.b. uw bedrijfscode, gebruikersnaam en wachtwoord in.", "");
        return;
    }

    if (relatieId.length == 0) {
        myApp.alert("Vul a.u.b. uw bedrijfscode in.", "");
        return;
    }

    if (gebruikersnaam.length == 0) {
        myApp.alert("Vul a.u.b. uw gebruikersnaam in.", "");
        return;
    }

    if (wachtwoord.length == 0) {
        myApp.alert("Vul a.u.b. uw wachtwoord in.", "");
        return;
    }

    wachtwoord = sha1(wachtwoord);

    GetSession(relatieId, gebruikersnaam, wachtwoord, function (data) {

        var credentials = {
            relatieId: relatieId,
            gebruikersnaam: gebruikersnaam,
            wachtwoord: wachtwoord,
            stayLoggedIn: $("#stayLoggedIn").is(":checked") ? 1 : 0,
            user: data
        };
        // debugger;
        app.formStoreData('credentials', credentials);

        ToonUrenoverzicht(new Date());
    });
}

function GetSession(relatieId, gebruikersnaam, wachtwoord, fnCallBack) {

    $.ajax({
        async: false,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: baseUrl + "/v1/sessions/",
        data: JSON.stringify({
            RelatieId: relatieId,
            Gebruikersnaam: gebruikersnaam,
            Wachtwoord: wachtwoord
        }),
        success: function (data, textStatus, request) {

            setStore("token", data.authToken);
            CloseLoginScreen();

            if (typeof (fnCallBack) === "function") {
                return fnCallBack(data);
            }
        }
    });
}

function CloseLoginScreen() {
    app.closeModal(".login-screen");
    app.closeModal("login-screen");
}

function ShowLoginScreen(storedCredentials) {
    app.loginScreen();
    if (typeof (storedCredentials) !== "undefined") {
        $("#relatieId").val(storedCredentials.relatieId);
        $("#gebruikersnaam").val(storedCredentials.gebruikersnaam);
        $("#wachtwoord").val("");
    }
}

function getWeekNumber(d) {

    d = new Date(+d);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));

    var yearStart = new Date(d.getFullYear(), 0, 1);
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    return weekNo;
}

function ToonUrenoverzicht(date) {

    dateUrenoverzicht = date;

    prevWeek = getPrevWeek(dateUrenoverzicht);
    nextWeek = getNextWeek(dateUrenoverzicht);

    hideLoader();

    if (mainView.activePage.name !== "urenoverzicht") {
        showLoader();
        mainView.router.loadPage('urenoverzicht.html');
    } else {
        ToonUrenoverzichtItems();
    }
}

function ToonUrenoverzichtItems() {

    var week = getWeekNumber(dateUrenoverzicht);
    var cred = app.formGetData('credentials');

    if (typeof (cred) === "undefined") {
        ShowLoginScreen();
        return;
    }

    var fnToonuren = function (items) {

        var ul = "";
        var total = 0;

        for (var k in items) {

            var dag = items[k];

            ul += "<ul class=\"responsive_table urenoverzicht\" style='margin-bottom: 25px;'>";
            ul += "<li class='table_row'>";
            ul += "<div class='table_section left dag'>";
            ul += "<span>" + dag.dag + " " + dag.korteMaandOmschrijving + "</span>";
            ul += "<span>" + dag.langeDagOmschrijving + "</span>";
            ul += "</div>";
            ul += "<div class='table_section right'>" + toonGetal(dag.totaal) + "</div>";
            ul += "</li>";

            for (var p in dag.projecten) {

                var project = dag.projecten[p];
                var hasWerk = $.isArray(project.children) && project.children.length > 0;

                var css = "";
                if (project.geblokkeerd) {
                    css = " style='color: #a7a7a7;'"
                }

                ul += "<li>";

                if (project.isLowestLevel) {

                    if (!project.geblokkeerd) {
                        ul += "<div onclick='EditUren(" + project.invoerId + ");'>";
                    } else {
                        ul += "<div" + css + ">";
                    }

                    ul += "   <div" + css + " class=\"table_section left\">" + project.description + "</div>";
                    ul += "   <div" + css + " class='table_section right'>" + toonGetal(project.totaal) + "</div>";
                    ul += "</div>";

                } else {
                    ul += "<div" + css + " class=\"table_section left\">" + project.description + "</div>";
                }

                if (hasWerk) {
                    ul += "<ul style='margin-left: 0px;'>";
                    for (var w in project.children) {

                        var werk = project.children[w];
                        var hasBudgetten = $.isArray(werk.children) && werk.children.length > 0;

                        ul += "<li>";


                        if (werk.isLowestLevel) {

                            if (!project.geblokkeerd) {
                                ul += "<div" + css + " style='padding-left: 15px;' onclick='EditUren(" + werk.invoerId + ");'>";
                            } else {
                                ul += "<div" + css + " style='padding-left: 15px;'>";
                            }

                            ul += "   <div" + css + " class='table_section left' style='color: #000;'>" + werk.description + "</div>";
                            ul += "   <div" + css + " class='table_section right' style='color: #000;'>" + toonGetal(werk.totaal) + "</div>";
                            ul += "</div>";
                        } else {
                            ul += "<div style='padding-left: 15px;'>";
                            ul += "   <div" + css + " class='table_section left' style='color: #000;'>" + werk.description + "</div>";
                            ul += "</div>";
                        }



                        if (hasBudgetten) {

                            ul += "<ul style='margin-left: 0px;'>";

                            for (var w in werk.children) {
                                var budget = werk.children[w];
                                ul += "<li>";

                                if (budget.isLowestLevel) {

                                    if (!project.geblokkeerd) {
                                        ul += "<div style='padding-left: 30px;' onclick='EditUren(" + budget.invoerId + ");'>";
                                    } else {
                                        ul += "<div style='padding-left: 30px;'>";
                                    }

                                    ul += "   <div" + css + " class='table_section left'>" + budget.code + " " + budget.description + "</div>";
                                    ul += "   <div" + css + " class='table_section right'>" + toonGetal(budget.totaal) + "</div>";
                                    ul += "</div>";
                                } else {
                                    ul += "<div style='padding-left: 30px;'>";
                                    ul += "   <div" + css + " class='table_section left'>" + budget.code + " " + budget.description + "</div>";
                                    ul += "</div>";
                                }

                                ul += "</div>";
                                ul += "</li>";
                            }

                            ul += "</ul>";
                        }


                        ul += "</li>";
                    }

                    ul += "</ul>";
                }

                ul += "</li>";
            }

            if ($.isArray(dag.indirect)) {

                for (var p in dag.indirect) {
                    var indirect = dag.indirect[p];
                    ul += "<li>";
                    ul += "<div>";
                    ul += "<div onclick='EditIndirecteUren(" + indirect.invoerId + ");' class='table_section left'>" + indirect.description + "</div>";
                    ul += "<div onclick='EditIndirecteUren(" + indirect.invoerId + ");' class='table_section right'>" + toonGetal(indirect.totaal) + "</div>";
                    ul += "</div>";
                    ul += "</li>";
                }
            }

            total += dag.totaal * 1;
            ul += "</ul>";
        }

        var color = "";
        if (total >= 40) {
            color = "green";
        } else {
            color = "red";
        }

        $("#ingevuldeUren").html("ingevulde uren <span style='font-weight: bold;color: " + color + ";'>" + toonGetal(total) + "/40</span>");

        $("#week").html(week);
        $("#urenoverzicht").html(ul);
    }

    $.ajax({
        async: false,
        type: "GET",
        beforeSend: function (request) {
            setToken(request);
            showLoader();
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: baseUrl + "/v1/mobile/uren/" + cred.user.contactpersoonId + "/" + dateUrenoverzicht.getFullYear() + "/" + week,
        success: function (data, textStatus, request) {
            fnToonuren(data);
            hideLoader();
        }
    });
}

function EditUren(id) {
    $.ajax({
        async: false,
        type: "GET",
        beforeSend: function (request) {
            setToken(request);
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: baseUrl + "/v1/mobile/uren/invoer/" + id,
        success: function (data, textStatus, request) {
            invoerUren = data;
            mainView.router.loadPage('ureninvoeren.html');
        },
        error: function (data, textStatus, request) {
            myApp.alert(data.status + " " + data.statusText, "");
        },
        complete: function () {

        }
    });
}

function EditIndirecteUren(id) {
    $.ajax({
        async: false,
        type: "GET",
        beforeSend: function (request) {
            setToken(request);
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: baseUrl + "/v1/mobile/uren/invoer/" + id,
        success: function (data, textStatus, request) {
            invoerUren = data;
            mainView.router.loadPage('indirecteureninvoeren.html');
        },
        error: function (data, textStatus, request) {
            myApp.alert(data.status + " " + data.statusText, "");
        },
        complete: function () {

        }
    });
}

function ToonIndirectboeken() {
    ResetFormFields();
    mainView.router.loadPage('indirecteureninvoeren.html');
}

function ToonUrenboeken() {

    ResetFormFields();
    mainView.router.loadPage('ureninvoeren.html');

    ResetUursoorten(0);
    ResetProjecten(0);
}

function ResetFormFields() {
    invoerUren = null;
    invoerIndirect = null;
}

function ResetProjecten(selectedProjectId) {

    projectId = $("#projectId");
    werkId = $("#werkId");
    budgetId = $("#budgetId");
    stelpostId = $("#stelpostId");

    if (urenboekenViewModel != null) {
        var dataSource = urenboekenViewModel.items;

        projectId.removeAttr("disabled");
        projectId.find("option").each(function (i) {
            if (i > 0) $(this).remove();
        });

        for (var d in dataSource) {
            var project = dataSource[d];
            projectId.append($("<option value='" + project.id + "'" + (project.id == selectedProjectId ? " selected" : "") + ">" + project.code + " | " + project.description + "</option>"));
        }
    }

    ClearDDL(werkId);
    ClearDDL(budgetId);
    ClearDDL(stelpostId);

    if (selectedProjectId != 0) {
        ddlProjectChanged(selectedProjectId);
    }
}

function ResetUursoorten() {
    uursoortId = $("#uursoortId");
    ClearDDL(uursoortId);

    if (urenboekenViewModel != null) {
        var i = 0;
        var dataSource = urenboekenViewModel.uursoorten;

        for (var d in dataSource) {
            var uursoort = dataSource[d];
            uursoortId.append($("<option" + (i == 0 ? " selected" : "") + " value='" + uursoort.id + "'>" + uursoort.code + " | " + uursoort.omschrijving + "</option>"));
            i++;
        }
    }

    uursoortId.removeAttr("disabled");
}

function ddlProjectChanged(id) {

    var dataSource = urenboekenViewModel.items;

    ClearDDL(werkId);
    ClearDDL(budgetId);
    ClearDDL(stelpostId);

    for (var d in dataSource) {
        var project = dataSource[d];
        if (project.id == id) {

            var totalChildren = project.children.length;
            for (var d in project.children) {
                var werk = project.children[d];
                werkId.append($("<option value='" + werk.id + "'>" + werk.description + "</option>"));
            }

            var hasStelposten = $.isArray(project.stelposten) && project.stelposten.length > 0;
            if (hasStelposten) {
                for (var d in project.stelposten) {
                    var stelpost = project.stelposten[d];
                    stelpostId.append($("<option value='" + stelpost.id + "'>" + stelpost.omschrijving + "</option>"));
                }

                stelpostId.removeAttr("disabled");
            } else {

                stelpostId.attr("disabled", "disabled");
                if (totalChildren == 1) {
                    var firstWerkId = project.children[0].id;
                    werkId.val(firstWerkId);
                    ddlWerkChanged(firstWerkId);
                }
            }
            break;
        }
    }

    werkId.removeAttr("disabled");
}

function ddlStelpostChanged() {
    if (stelpostId.val() !== 0) {
        werkId.val(0);
        budgetId.val(0);
    }
}

function ddlBudgetChanged() {
    $("#aantal").focus();
}

function ddlWerkChanged(id) {

    var dataSource = urenboekenViewModel.items;
    var enabled = true;

    ClearDDL(budgetId);
    stelpostId.val(0);

    for (var d in dataSource) {
        var project = dataSource[d];
        if (project.id == projectId.val() * 1) {

            for (var d in project.children) {

                var werk = project.children[d];
                if (werk.id == werkId.val() * 1) {

                    if ($.isArray(werk.children) && werk.children.length > 0) {
                        for (var b in werk.children) {
                            var budget = werk.children[b];
                            budgetId.append($("<option value='" + budget.id + "'>" + budget.code + " " + budget.description + "</option>"));
                        }

                    } else {
                        enabled = false;
                    }
                }
            }
        }
    }

    if (enabled) {
        budgetId.removeAttr("disabled");
        $("#budgetId").focus();
    } else {
        $("#aantal").focus();
    }
}

function ClearDDL(ddl) {
    ddl.removeAttr("disabled").attr("disabled", "disabled");
    ddl.find("option").each(function (i) { if (i > 0) $(this).remove(); });

}

function UrenOpslaan() {
    var err = false;

    var arr = [];
    arr.push($("#datum"));
    arr.push(projectId);
    arr.push(uursoortId);
    arr.push($("#aantal"));

    var project = getProject();
    var werk = getWerk();

    var hasStelposten = project != null && $.isArray(project.stelposten) && project.stelposten.length > 0;

    // indien werkId == 0 && stelpostId == 0 && heeftStelposten
    if (werkId.val() * 1 == 0 && stelpostId.val() * 1 == 0 && hasStelposten) {
        // beide rood
        arr.push(werkId);
        arr.push(stelpostId);
    } else {
        MarkeerVeld(werkId, true);
        MarkeerVeld(stelpostId, true);
    }

    // indien werkId == 0 && stelpostId == 0 && !heeftStelposten
    if (werkId.val() * 1 == 0 && stelpostId.val() * 1 == 0 && !hasStelposten) {
        // werk rood
        arr.push(werkId);
    } else {
        MarkeerVeld(werkId, true);
    }

    // indien werkId != 0 && !isRegie && budgetId == 0
    if (werkId.val() * 1 != 0 && !werk.isRegiewerk && budgetId.val() * 1 == 0) {
        // budget rood
        arr.push(budgetId);
    } else {
        MarkeerVeld(budgetId, true);
    }

    for (var k in arr) {
        var field = arr[k];
        var tagName = field[0].tagName.toLowerCase();

        if (tagName == "input" && field.val().length == 0 || tagName == "select" && field.val() <= 0 || field.attr("id") == "aantal" && field.val() * 1 <= 0) {
            MarkeerVeld(field, false);
            err = true;
        } else {
            MarkeerVeld(field, true);
        }
    }

    if (err) {
        return;
    }

    var cred = app.formGetData('credentials');

    var arr = $("#datum").val().split('/');
    var datum = arr[2] + "-" + arr[1] + "-" + arr[0];

    var invoer = {
        Id: 0,
        MedewerkerId: cred.user.contactpersoonId,
        Datum: datum,
        ProjectId: projectId.val(),
        WerkId: werkId.val(),
        BudgetId: budgetId.val(),
        StelpostId: stelpostId.val(),
        UursoortId: $("#uursoortId").val(),
        Aantal: $("#aantal").val()
    };

    var fnPostInvoer = function () {

        var arr = $("#datum").val().split('/');
        var datum = arr[2] + "-" + arr[1] + "-" + arr[0];
        var selectedDate = new Date(datum);

        ToonUrenoverzicht(selectedDate);
    }

    var type = "POST";
    if (typeof (invoerUren) === "object" && invoerUren != null) {
        type = "PUT";
        invoer.Id = invoerUren.id;
    }

    $.ajax({
        async: false,
        type: type,
        beforeSend: function (request) {
            setToken(request);
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(invoer),
        url: baseUrl + "/v1/mobile/uren/",
        success: function (data, textStatus, request) {
            return fnPostInvoer();
        },
        error: function (data, textStatus, request) {
            if (data.status === 200) {
                return fnPostInvoer();
            }
            myApp.alert(data.status + " " + data.statusText, "");
        }
    });

}

function MarkeerVeld(field, enabled) {
    if (enabled) {
        field.css({ "background-color": "#FFFFFF", "color": "#000000" });
    } else {
        field.css({ "background-color": "tomato", "color": "#FFFFFF" });
    }
}

function IndirecteurenOpslaan() {
    var err = false;

    var arr = [];
    arr.push($("#datumIndirect"));
    arr.push($("#indirectId"));
    arr.push($("#aantal"));

    for (var k in arr) {
        var field = arr[k];
        var tagName = field[0].tagName.toLowerCase();

        if (tagName == "input" && field.val().length == 0 || tagName == "select" && field.val() <= 0 || field.attr("id") == "aantal" && field.val() * 1 <= 0) {
            field.css({ "background-color": "tomato", "color": "#FFFFFF" });
            err = true;
        } else {
            field.css({ "background-color": "#FFFFFF", "color": "#000000" });
        }
    }

    if (err) {
        return;
    }

    var cred = app.formGetData('credentials');

    var arr = $("#datumIndirect").val().split('/');
    var datum = arr[2] + "-" + arr[1] + "-" + arr[0];

    var invoer = {
        Id: 0,
        MedewerkerId: cred.user.contactpersoonId,
        Datum: datum,
        IndirectId: $("#indirectId").val(),
        Aantal: $("#aantal").val()
    };

    var fnPostInvoer = function () {

        var arr = $("#datumIndirect").val().split('/');
        var datum = arr[2] + "-" + arr[1] + "-" + arr[0];
        var selectedDate = new Date(datum);

        ToonUrenoverzicht(selectedDate);
    }


    var type = "POST";
    if (typeof (invoerUren) === "object" && invoerUren != null) {
        type = "PUT";
        invoer.Id = invoerUren.id;
    }

    $.ajax({
        async: false,
        type: type,
        beforeSend: function (request) {
            setToken(request);
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(invoer),
        url: baseUrl + "/v1/mobile/uren/",
        success: function (data, textStatus, request) {
            return fnPostInvoer();
        },
        error: function (data, textStatus, request) {
            if (data.status === 200) {
                return fnPostInvoer();
            }
            myApp.alert(data.status + " " + data.statusText, "");
        }
    });
}

function getStore(key) {
    return app.formGetData(key);
}
function setStore(key, value) {
    app.formStoreData(key, value);
}

function toonGetal(getal) {
    if (getal * 1 == 0) return "&nbsp;";
    return getal;
}

function getNextWeek(date) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    return next;
}
function getPrevWeek(date) {
    var prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
    return prev;
}

function InitAjax() {
    $.ajaxSetup({
        beforeSend: function (xhr, req) {

            var token = getStore("token");
            if (req.url.toLowerCase().indexOf("/session") > 0) {
                return;
            }

            if (typeof (token) !== "string" || token.length == null) {
                xhr.abort();
                var storedCredentials = app.formGetData('credentials');
                ShowLoginScreen(storedCredentials);
            }

            showLoader();
        },
        error: function (data, textStatus, request) {
            if (data.status == 401) {
                var storedCredentials = app.formGetData('credentials');
                ShowLoginScreen(storedCredentials);

                return;
            }
            myApp.alert(data.status + " " + data.statusText, "");
        },
        complete: function () {
            hideLoader();
        }
    });
}

function sha1(text) {

    // inputType:       B64, TEXT
    // hashVariant:     SHA-1, SHA-256, SHA-512
    // hashRounds:      1
    // hashOutputType:  B64, HEX
    try {
        var hashInput = text;
        var hashInputType = "TEXT";
        var hashVariant = "SHA-1";
        var hashRounds = 1;
        var hashOutputType = "HEX";

        var hashObj = new jsSHA(
            hashVariant,
            hashInputType,
            {
                numRounds: parseInt(hashRounds, 10)
            }
        );

        hashObj.update(hashInput);
        return hashObj.getHash(hashOutputType);
    } catch (e) {
        myApp.alert(e.message, "");
    }
}
/*
function calcHMAC() {
    try {
        var hmacText = document.getElementById("hmacInputText");
        var hmacTextType = document.getElementById("hmacTextType");
        var hmacKeyInput = document.getElementById("hmacInputKey");
        var hmacKeyInputType = document.getElementById("hmacKeyType");
        var hmacVariant = document.getElementById("hmacVariant");
        var hmacOutputType = document.getElementById("hmacOutputType");
        var hmacOutput = document.getElementById("hmacOutputText");
        var hmacObj = new jsSHA(
            hmacVariant.options[hmacVariant.selectedIndex].value,
            hmacTextType.options[hmacTextType.selectedIndex].value
        );
        hmacObj.setHMACKey(
            hmacKeyInput.value,
            hmacKeyInputType.options[hmacKeyInputType.selectedIndex].value
        );
        hmacObj.update(hmacText.value);

        hmacOutput.value = hmacObj.getHMAC(hmacOutputType.options[hmacOutputType.selectedIndex].value);
    } catch (e) {
        hmacOutput.value = e.message
    }
}*/

function getProject() {

    if (urenboekenViewModel == null) return null;

    var id = projectId.val() * 1;
    var dataSource = urenboekenViewModel.items;
    for (var d in dataSource) {
        var project = dataSource[d];
        if (project.id == id) {
            return project;
        }
    }

    return null;
}

function getWerk() {

    var project = getProject();
    if (project !== null) {
        for (var k in project.children) {
            var werk = project.children[k];

            if (werk.id == werkId.val() * 1) {
                return werk;
            }
        }
    }
    return null;
}

function hideLoader() {
    setTimeout(function () {
        myApp.hidePreloader();
    }, 200);
}

function ddlIndirectChanged() {

}

function GetMedewerkerId() {
    var cred = app.formGetData('credentials');
    if (typeof (cred) !== "undefined" && cred !== null && cred.user !== null) {
        return cred.user.contactpersoonId;
    }
    return 0;
}

/*
function TestMarcel() {
    setTimeout(function () {
        var docWidth = document.documentElement.clientWidth;
        var docHeight = document.documentElement.clientHeight;
        $("#test").text("w: " + docWidth + " -- h: " + docHeight);
        TestMarcel();
    }, 1000);
}*/
