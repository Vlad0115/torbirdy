if (!org) var org = {};
if (!org.torbirdy) org.torbirdy = {};

if(!org.torbirdy.emailwizard) org.torbirdy.emailwizard = new function() {
  var pub = {};

  var prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefBranch);

  var disableWizard = false;
  if (prefs.getBoolPref("extensions.torbirdy.emailwizard")) {
    disableWizard = true;
  }

  pub.adjustAutoWizard = function() {
    if (!disableWizard) {
      var realname = document.getElementById("realname").value;
      var email = document.getElementById("email").value;
      var password = document.getElementById("password").value;
      var rememberPassword = document.getElementById("remember_password").checked;
      var protocol = document.getElementById("torbirdy-protocol").value;

      var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Ci.nsIPromptService);

      var bundles = Cc["@mozilla.org/intl/stringbundle;1"]
                              .getService(Ci.nsIStringBundleService);
      var strings = bundles.createBundle("chrome://castironthunderbirdclub/locale/torbirdy.properties");
      var emailPrompt = strings.formatStringFromName("torbirdy.email.prompt", [email], 1);
      var extName = strings.GetStringFromName("torbirdy.name");
      prompts.alert(null, extName, emailPrompt);

      var config = new AccountConfig();
      config.incoming.type = protocol;

      config.incoming.username = "%EMAILLOCALPART%";
      config.outgoing.username = "%EMAILLOCALPART%";

      if (protocol === "imap") {
        config.incoming.hostname = "imap.%EMAILDOMAIN%";
        config.incoming.port = 993;
      }

      if (protocol === "pop3") {
        config.incoming.hostname = "pop.%EMAILDOMAIN%";
        config.incoming.port = 995;
      }

      // Default to SSL for both outgoing and incoming servers.
      config.incoming.socketType = 2;
      config.outgoing.socketType = 2;

      // Set the authentication to 'Normal' (connection is already encrypted).
      config.incoming.auth = 3;
      config.outgoing.auth = 3;

      // Set default values to disable automatic email fetching.
      config.incoming.loginAtStartup = false;
      config.incoming.downloadOnBiff = false;

      // Default the outgoing SMTP port.
      config.outgoing.port = 465;

      config.outgoing.hostname = "smtp.%EMAILDOMAIN%";

      replaceVariables(config, realname, email, password);
      config.rememberPassword = rememberPassword && !!password;

      var newAccount = createAccountInBackend(config);

      // Set check_new_mail to false. We can't do this through the account setup, so let's do it here.
      var checkNewMail = 'mail.server.%serverkey%.check_new_mail';
      var serverkey = newAccount.incomingServer.key;
      var checkNewMailPref = checkNewMail.replace("%serverkey%", serverkey);
      prefs.setBoolPref(checkNewMailPref, false);

      // Make sure that drafts are saved to Local Folders if it is an IMAP account.
      if (protocol === "imap") {
        var identity = newAccount.defaultIdentity;
        identity.draftFolder = "mailbox://nobody@Local%20Folders/Drafts";
      }

      // Do not check for new messages at startup.
      var loginAtStartup = 'mail.server.%serverkey%.login_at_startup';
      var loginAtStartupPref = loginAtStartup.replace("%serverkey%", serverkey);
      prefs.setBoolPref(loginAtStartupPref, false);

      // Do not automatically download new messages.
      if (protocol === "pop3") {
        var downloadOnBiff = 'mail.server.%serverkey%.download_on_biff';
        var downloadOnBiffPref = downloadOnBiff.replace("%serverkey%", serverkey);
        prefs.setBoolPref(downloadOnBiffPref, false);
      }

      // From comm-release/mailnews/base/prefs/content/accountcreation/emailWizard.js : onAdvancedSetup().
      var windowManager = Cc["@mozilla.org/appshell/window-mediator;1"]
          .getService(Ci.nsIWindowMediator);
      var existingAccountManager = windowManager
          .getMostRecentWindow("mailnews:accountmanager");
      if (existingAccountManager) {
        existingAccountManager.focus();
      } else {
        window.openDialog("chrome://messenger/content/AccountManager.xul",
                          "AccountManager", "chrome,centerscreen,modal,titlebar",
                          { server: newAccount.incomingServer,
                            selectPage: "am-server.xul" });
      }
      window.close();
    }
    else {
      gEmailConfigWizard.onNext();
    }
  };

  pub.onKeyEnter = function(event) {
    var keycode = event.keyCode;
    if (keycode == 13) {
      if (document.getElementById("next_button").disabled === false) {
        if (!disableWizard) {
          pub.adjustAutoWizard();
        }
        else {
          gEmailConfigWizard.onNext();
        }
      }
    }
  };

  pub.onLoad = function() {
    if (disableWizard) {
      document.getElementById("torbirdy-protocol-box").collapsed = true;
      document.getElementById("provisioner_button").disabled = false;
      document.getElementById("provisioner_button").hidden = false;
    } else {
      document.getElementById("provisioner_button").disabled = true;
      document.getElementById("provisioner_button").hidden = true;
    }
  };

  return pub;
};

window.addEventListener("keypress", org.torbirdy.emailwizard.onKeyEnter, true);
window.addEventListener("load", org.torbirdy.emailwizard.onLoad, true);
