(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  var app = document.querySelector('#app');
  // TODO: Capture "Home" click.
  app.ready = function() {
    this.lastRoute = [];
    this.isWeb = (typeof device === 'undefined');
    this.isAndroid = (/android/i.test(navigator.userAgent));
    this.isIos = (/iphone|ipad|ipod/i.test(navigator.userAgent));
    this.isMobile = this.isAndroid || this.isIos;
    document.addEventListener("backbutton", app.onBackKeyDown, false);

    ExpeditionAPI._silentLoginCordova();
  };
  app.onBackKeyDown = function() {
    // This is neither elegant nor efficient, but it works well. When native
    // back button is pressed, loop through all expedition-card elements and
    // manually trigger a "return" event from the first expedition-card found
    // that's "visible".

    // Using querySelectorAll globally like this doesn't work on mobile (returns empty list)
    // but it works just fine on Android, which is the only time this code will be called.
    var cards = document.querySelectorAll("expedition-card, #splash");
    for (var i = 0; i < cards.length; i++) {
      var style = getComputedStyle(cards[i]);
      var isVisible = (style.display !== 'none' && style.visibility !== 'hidden' &&
        style.opacity !== 0 && (cards[i].offsetWidth !== 0 || cards[i].offsetHeight !== 0));

      if (isVisible) {
        // If we hit back on the splash screen, close the app.
        if (cards[i].id === "splash") {
          navigator.app.exitApp();
          return;
        }

        cards[i].fire("return");
        return;
      }
    }
  };
  app.getcards = function() {
    if (window.platform === 'android' || window.platform === 'ios') {
      window.open('http://expeditionrpg.com/', '_system');
    } else {
      window.location='http://cards.expeditiongame.com/';
    }
  };
  app.next = function(e) {
    this.$.pages.next(e.currentTarget.dataset.target, e.currentTarget.dataset.anim);
  };
  app.showSelect = function(e) {
    this.$.pages.prev("_select");
    e.stopPropagation();
  };
  app.showSplash = function(e) {
    this.$.pages.prev("splash");
    e.stopPropagation();
  };
  app.showSetup = function(e) {
    this.$.pages.prev("setup");
    e.stopPropagation();
  };
  app.onPublicQuestChoice = function(e, detail) {
    this._loadQuest(JSON.parse(detail));
    e.stopPropagation();
  };
  /* jshint ignore:start */
  app.onFeaturedQuestChoice = function(e) {
    this._loadQuest({
      xml_url: e.currentTarget.dataset.url
    });
    e.stopPropagation();
  };
  app.onQuestURLLoad = function(e, detail) {
    this._loadQuest({
      xml_url: detail
    });
  };
  /* jshint ignore:end */
  app._loadQuest = function(quest) {
    console.log("Loading quest");
    this.quest = quest;
    this.$.pages.next("quest");
    this.$.globalQuest.ready();
  };
  app.onQuestFileLoad = function(e, detail) {
    console.log("File load");
    this.$.pages.next("quest");
    this.$.globalQuest.ready(detail);
    e.stopPropagation();
  };
})(document);
