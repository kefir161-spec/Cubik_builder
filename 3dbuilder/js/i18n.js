/**
 * Cubik Builder - Internationalization Module
 * @module i18n
 * @description Multi-language support with URL parameter, localStorage, and browser detection
 * @author Andrey Bovdurets
 * @version 2.0
 * 
 * Usage:
 *   - URL: ?lang=ru or ?lang=en
 *   - JS:  CubikI18N.setLang('ru')
 *   - HTML: <span data-i18n-key="key.name">Fallback</span>
 * 
 * Supported languages: EN, DE, NL, FR, ES, PT, IT, FI, SV, DA, CS, PL, RO, BG, (RU - commented)
 */
(function(global, doc) {
  'use strict';

  // =============================================================================
  // Configuration
  // =============================================================================
  
  var SUPPORTED = ['en', 'de', 'nl', 'fr', 'es', 'pt', 'it', 'fi', 'sv', 'da', 'cs', 'pl', 'ro', 'bg' /*, 'ru' */];
  var STORAGE_KEY = 'cubik_lang';
  var DEFAULT_LANG = 'en';

  // =============================================================================
  // Language Detection & Management
  // =============================================================================

  /**
   * Normalize language code to supported format
   * @param {string} code - Language code (e.g., 'en-US', 'ru', 'en')
   * @returns {string} Normalized language code
   */
  function normalizeLang(code) {
    if (!code) return DEFAULT_LANG;
    code = String(code).toLowerCase().trim();
    // Handle codes like 'en-US' -> 'en'
    if (code.indexOf('-') !== -1) {
      code = code.split('-')[0];
    }
    return SUPPORTED.indexOf(code) !== -1 ? code : DEFAULT_LANG;
  }

  /**
   * Get language from URL parameter (?lang=xx)
   * @returns {string|null} Language code or null
   */
  function getLangFromQuery() {
    try {
      var match = global.location.search.match(/[?&]lang=([a-zA-Z\-]+)/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get language from localStorage
   * @returns {string|null} Language code or null
   */
  function getLangFromStorage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  /**
   * Save language to localStorage
   * @param {string} lang - Language code
   */
  function saveLangToStorage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // localStorage unavailable (private mode, etc.)
    }
  }

  /**
   * Get browser's preferred language
   * @returns {string|null} Language code or null
   */
  function getBrowserLang() {
    try {
      return navigator.language || navigator.userLanguage || null;
    } catch (e) {
      return null;
    }
  }

  function getPartnerLang() {
    try {
      var pc = global.CubikPartnerConfig;
      return (pc && pc.lang) ? pc.lang : null;
    } catch (e) {
      return null;
    }
  }

  // Determine current language with priority:
  // 1. URL parameter (?lang=xx)
  // 2. Partner config (hostname-based)
  // 3. localStorage
  // 4. Browser language
  // 5. Default (en)
  var currentLang = normalizeLang(
    getLangFromQuery() ||
    getPartnerLang() ||
    getLangFromStorage() ||
    getBrowserLang() ||
    DEFAULT_LANG
  );

  /**
   * Update HTML element lang attributes
   * Sets both 'lang' and 'data-lang' for CSS selectors
   */
  function updateHtmlLang() {
    try {
      doc.documentElement.setAttribute('lang', currentLang);
      doc.documentElement.setAttribute('data-lang', currentLang);
    } catch (e) {}
  }

  // Initialize HTML lang attribute
  updateHtmlLang();

  // =============================================================================
  // Translation Dictionaries
  // =============================================================================

  var DICT = {
    // =========================================================================
    // ENGLISH (EN)
    // =========================================================================
    en: {
      // General
      'app.title': '3D Builder',
      'loader.loading': 'Loading...',

      // Help Modal
      'help.title': 'Quick start',
      'help.navigation': 'Navigation',
      'help.controls': 'Controls',
      'help.btn': 'Help',
      'help.start': 'Start',
      'help.tutorial': 'Start Tutorial',
      'help.close': 'Close',

      // Navigation Instructions
      'help.lmb.rotate': 'Hold LMB \u2014 rotate',
      'help.rmb.pan': 'Hold RMB \u2014 pan',
      'help.wheel.zoom': 'Mouse wheel \u2014 zoom',
      'help.lmb.add': 'Add Cubik',
      'help.rmb.delete': 'Delete Cubik',
      'help.tab.replace': 'Replace/Repaint facets',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Undo / Redo',
      'help.copy': 'Copy Cubik',
      'help.orbit': 'Orbit camera around pivot',
      'help.move': 'Move up/down',

      // HUD (Top Bar)
      'hud.load': 'Load',
      'hud.save': 'Save',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Click to export stats',

      // Navigation (Side Menu)
      'nav.home': 'Home',
      'nav.shop': 'Shop',
      'nav.about': 'About us',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Gallery',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partnership',
      'nav.contacts': 'Contacts',

      // Block Editor
      'editor.title': 'Block Editor',
      'editor.hint': 'Select the facets you want to replace, pick a color in the palette, choose replacement type \u2014 then apply.',
      'editor.preview': 'Edited cubik preview',
      'editor.noSelection': 'No cubik selected',
      'editor.replace': 'Replace facets',

      // Export / Import
      'export.scene': 'Export scene',
      'export.stats': 'Export stats',

      // Projects
      'project.save': 'Save project',
      'project.load': 'Load project',
      'project.name': 'Project name',
      'project.cancel': 'Cancel',
      'project.saveBtn': 'Save',
      'project.modalTitle': 'Save project',

      // Statistics
      'stats.blocks': 'Blocks',
      'stats.facets': 'Facets',
      'stats.panelTitle': 'Statistics',
      'stats.facetsTitle': 'Facets',
      'stats.measurementsTitle': 'Measurements',
      'stats.colType': 'Type',
      'stats.colCount': 'Count',
      'stats.colVolume': 'Vol, cm³',
      'stats.colWeight': 'Weight, g',
      'stats.total': 'Total',
      'stats.height': 'Height',
      'stats.width': 'Width',
      'stats.depth': 'Depth',
      'stats.totalWeight': 'Total weight',
      'stats.totalVolume': 'Total volume',

      // Status Messages
      'status.ready': 'Ready.',
      'status.loading': 'Loading...',
      'status.saved': 'Saved!',
      'status.error': 'Error',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Collapse',
      'facetStats.expand': 'Expand',

      // Shop Integration
      'shop.sending': 'Sending to your personal account...',
      'shop.sent': 'Sent to shop',
      'shop.sentNoUrl': 'Sent to shop (but no URL received)',
      'shop.errorMissing': 'Cannot send to shop: product ID not found for some facets. See console.',
      'shop.error': 'Shop API error',
      'shop.signIn': 'Sign In',
      'shop.close': 'Close',
      'shop.pleaseWait': 'Please wait, this may take a few seconds',

      // Continue Button
      'continue.btn': 'Continue',

      // Context menu (long-press on cube)
      'context.edit': 'Edit',
      'context.delete': 'Delete cube',
      'panel.toggleMenu': 'Collapse / expand menu',
      'editor.collapsePanel': 'Collapse panel',

      // Additional UI
      'help.closeEditor': 'Close editor / overlays',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Estimated price',
      'hud.loadTitle': 'Load project',
      'hud.saveTitle': 'Save project',
      'continue.title': 'Save to account / Continue to shop',
      'toolbar.clear': 'Clear scene',
      'toolbar.undo': 'Undo (Ctrl+Z)',
      'toolbar.redo': 'Redo (Ctrl+Y)',
      'toolbar.replayBuild': 'Play build',
      'toolbar.recordTimelapse': 'Record timelapse video',
      'help.titleAttr': 'Help / Quick start',
      'export.statsTitle': 'Export statistics to .txt',
      'project.saveTitle': 'Save project as JSON',
      'project.loadTitle': 'Load project from JSON',
      'nav.open': 'Open navigation',
      'panel.addCubik': 'Add cubik',
      'panel.deleteCubik': 'Delete cubik',

      // AI Constructor
      'ai.title': 'AI Constructor',
      'ai.editor': 'AI Editor',
      'ai.ready': 'Ready',
      'ai.mode.fast': 'Fast',
      'ai.mode.creative': 'Creative',
      'ai.addMode': 'Add to scene (otherwise \u2014 replace)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Describe what to build, e.g. "Green house with red roof" or "Robot"',
      'ai.blocks': 'blocks',
      'ai.placeholder': 'What should I build?...',
      'ai.send': 'Send',
      'ai.voiceInput': 'Voice input',
      'ai.generating': 'Generating...',
      'ai.listening': 'Listening...',
      'ai.doneBlocks': 'Done! Built {n} blocks',
      'ai.blocksCount': '{n} blocks',

      // Tutorial Tour
      'tutorial.welcome.title': 'Welcome to Cubik Builder!',
      'tutorial.welcome.desc': 'This interactive guide will help you learn how to create amazing 3D models. Let\'s start!',
      'tutorial.gallery.title': 'Block Gallery',
      'tutorial.gallery.desc': 'Choose the type of block you want to place. There are 4 types: Void, Zen, Bion, and Zen/2. Click on any block to select it.',
      'tutorial.palette.title': 'Color Palette',
      'tutorial.palette.desc': 'Pick a color for your block. Click on any color dot to select it. The selected color will be applied to new blocks.',
      'tutorial.place.title': 'Place Blocks',
      'tutorial.place.desc': 'Click on the scene to place a block. Blocks snap to the grid and to each other automatically.',
      'tutorial.place.desc.mobile': 'Tap on the scene to place the selected block. Blocks snap to the grid and to each other.',
      'tutorial.navigate.title': 'Camera Navigation',
      'tutorial.navigate.desc': 'Rotate: hold left mouse button and drag. Pan: hold right mouse button and drag. Zoom: use mouse wheel.',
      'tutorial.navigate.desc.mobile': 'Drag with one finger to rotate the camera. Pinch with two fingers to zoom in and out.',
      'tutorial.delete.title': 'Delete Blocks',
      'tutorial.delete.desc': 'Right-click on any block to delete it.',
      'tutorial.delete.desc.mobile': 'Long-press on a block to open the menu, then tap "Delete cube" to remove it.',
      'tutorial.openEditor.title': 'Open Face Editor',
      'tutorial.openEditor.desc': 'Select a block and press Tab or middle mouse button to open the Face Editor.',
      'tutorial.openEditor.desc.mobile': 'Long-press on a block, then tap "Edit" in the menu to open the Face Editor.',
      'tutorial.editorOpening.title': 'Face Editor',
      'tutorial.editorOpening.desc': 'Great! The Face Editor is now open.',
      'tutorial.editorSelectFace.title': 'Select Face',
      'tutorial.editorSelectFace.desc': 'Click on a face of the block that you want to replace.',
      'tutorial.editorFaceType.title': 'Choose Replacement',
      'tutorial.editorFaceType.desc': 'Select a decorative element to replace the selected face.',
      'tutorial.editorApply.title': 'Apply Changes',
      'tutorial.editorApply.desc': 'Click Replace to apply the changes.',
      'tutorial.editorExit.title': 'Exit Editor',
      'tutorial.editorExit.desc': 'You can also select a color. Then click outside the editor, press Tab or Escape to close it.',
      'tutorial.editorExit.desc.mobile': 'Tap the collapse arrow (◀) or tap outside the editor panel to close it.',
      'tutorial.undoredo.title': 'Undo & Redo',
      'tutorial.undoredo.desc': 'Made a mistake? Use these buttons or Ctrl+Z to undo, Ctrl+Y to redo. The trash icon clears the entire scene.',
      'tutorial.undoredo.desc.mobile': 'Use these buttons to undo or redo. The trash icon clears the entire scene. No hotkeys on mobile.',
      'tutorial.saveload.title': 'Save & Load',
      'tutorial.saveload.desc': 'Save your project to a file using the Save button. Load previously saved projects with the Load button.',
      'tutorial.saveload.desc.mobile': 'At the bottom of the screen: Load — open a saved file; Save — download project to device. Continue is in the same bar (next step).',
      'tutorial.continue.title': 'Save to Account',
      'tutorial.continue.desc': 'Click Continue to save your project to your personal account. There you can purchase it or continue editing later.',
      'tutorial.continue.desc.mobile': 'Tap Continue (in the top bar) to save your project to your account and go to the shop.',
      'tutorial.finish.title': 'You\'re Ready!',
      'tutorial.finish.desc': 'Great job! You now know the basics. Start building your creation! You can always restart this tutorial from the Help button.',
      'tutorial.btn.next': 'Next',
      'tutorial.btn.prev': 'Back',
      'tutorial.btn.done': 'Done!',
      'tutorial.btn.start': 'Start Tutorial'
    },

    // =========================================================================
    // GERMAN (DE)
    // =========================================================================
    de: {
      // General
      'app.title': '3D-Baukasten',
      'loader.loading': 'Laden...',

      // Help Modal
      'help.title': 'Schnellstart',
      'help.navigation': 'Navigation',
      'help.controls': 'Steuerung',
      'help.btn': 'Hilfe',
      'help.start': 'Start',
      'help.tutorial': 'Tutorial starten',
      'help.close': 'Schließen',

      // Navigation Instructions
      'help.lmb.rotate': 'LMT halten \u2014 drehen',
      'help.rmb.pan': 'RMT halten \u2014 verschieben',
      'help.wheel.zoom': 'Mausrad \u2014 zoomen',
      'help.lmb.add': 'Cubik hinzufügen',
      'help.rmb.delete': 'Cubik löschen',
      'help.tab.replace': 'Facetten ersetzen/bemalen',
      'help.undo': 'Strg+Z / Strg+Y \u2014 Rückgängig / Wiederholen',
      'help.copy': 'Cubik kopieren',
      'help.orbit': 'Kamera um Drehpunkt kreisen',
      'help.move': 'Auf/ab bewegen',

      // HUD (Top Bar)
      'hud.load': 'Laden',
      'hud.save': 'Speichern',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Klicken für Statistik-Export',

      // Navigation (Side Menu)
      'nav.home': 'Startseite',
      'nav.shop': 'Shop',
      'nav.about': 'Über uns',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galerie',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partnerschaft',
      'nav.contacts': 'Kontakt',

      // Block Editor
      'editor.title': 'Block-Editor',
      'editor.hint': 'Wählen Sie die zu ersetzenden Facetten, wählen Sie eine Farbe aus der Palette, wählen Sie den Ersetzungstyp \u2014 dann anwenden.',
      'editor.preview': 'Cubik-Vorschau',
      'editor.noSelection': 'Kein Cubik ausgewählt',
      'editor.replace': 'Facetten ersetzen',

      // Export / Import
      'export.scene': 'Szene exportieren',
      'export.stats': 'Statistik exportieren',

      // Projects
      'project.save': 'Projekt speichern',
      'project.load': 'Projekt laden',
      'project.name': 'Projektname',
      'project.cancel': 'Abbrechen',
      'project.saveBtn': 'Speichern',
      'project.modalTitle': 'Projekt speichern',

      // Statistics
      'stats.blocks': 'Blöcke',
      'stats.facets': 'Facetten',
      'stats.panelTitle': 'Statistik',
      'stats.facetsTitle': 'Facetten',
      'stats.measurementsTitle': 'Abmessungen',
      'stats.colType': 'Typ',
      'stats.colCount': 'Anzahl',
      'stats.colVolume': 'Vol., cm³',
      'stats.colWeight': 'Gewicht, g',
      'stats.total': 'Gesamt',
      'stats.height': 'Höhe',
      'stats.width': 'Breite',
      'stats.depth': 'Tiefe',
      'stats.totalWeight': 'Gesamtgewicht',
      'stats.totalVolume': 'Gesamtvolumen',

      // Status Messages
      'status.ready': 'Bereit.',
      'status.loading': 'Laden...',
      'status.saved': 'Gespeichert!',
      'status.error': 'Fehler',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Einklappen',
      'facetStats.expand': 'Ausklappen',

      // Shop Integration
      'shop.sending': 'Senden an Shop...',
      'shop.sent': 'An Shop gesendet',
      'shop.sentNoUrl': 'An Shop gesendet (aber keine URL erhalten)',
      'shop.errorMissing': 'Kann nicht an Shop senden: Produkt-ID für einige Facetten nicht gefunden. Siehe Konsole.',
      'shop.error': 'Shop-API-Fehler',
      'shop.signIn': 'Anmelden',
      'shop.close': 'Schließen',
      'shop.pleaseWait': 'Bitte warten, dies kann einige Sekunden dauern',

      // Context menu (long-press on cube)
      'context.edit': 'Bearbeiten',
      'context.delete': 'Würfel löschen',
      'panel.toggleMenu': 'Menü ein-/ausklappen',
      'editor.collapsePanel': 'Panel einklappen',

      // Additional UI
      'help.closeEditor': 'Editor / Overlays schließen',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Geschätzter Preis',
      'hud.loadTitle': 'Projekt laden',
      'hud.saveTitle': 'Projekt speichern',
      'continue.btn': 'Weiter',
      'continue.title': 'Im Konto speichern / Zum Shop',
      'toolbar.clear': 'Szene leeren',
      'toolbar.undo': 'Rückgängig (Strg+Z)',
      'toolbar.redo': 'Wiederholen (Strg+Y)',
      'toolbar.replayBuild': 'Zusammenbau abspielen',
      'toolbar.recordTimelapse': 'Zeitraffer-Video aufnehmen',
      'help.titleAttr': 'Hilfe / Schnellstart',
      'export.statsTitle': 'Statistik als .txt exportieren',
      'project.saveTitle': 'Projekt als JSON speichern',
      'project.loadTitle': 'Projekt aus JSON laden',
      'nav.open': 'Navigation öffnen',
      'panel.addCubik': 'Cubik hinzufügen',
      'panel.deleteCubik': 'Cubik löschen',

      // AI Constructor
      'ai.title': 'KI-Konstruktor',
      'ai.editor': 'KI-Editor',
      'ai.ready': 'Bereit',
      'ai.mode.fast': 'Schnell',
      'ai.mode.creative': 'Kreativ',
      'ai.addMode': 'Zur Szene hinzufügen (sonst \u2014 ersetzen)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Beschreiben Sie, was Sie bauen möchten, z.B. "Grünes Haus mit rotem Dach" oder "Roboter"',
      'ai.blocks': 'Blöcke',
      'ai.placeholder': 'Was soll ich bauen?...',
      'ai.send': 'Senden',
      'ai.voiceInput': 'Spracheingabe',
      'ai.generating': 'Erstelle...',
      'ai.listening': 'Höre zu...',
      'ai.doneBlocks': 'Fertig! {n} Blöcke erstellt',
      'ai.blocksCount': '{n} Blöcke',

      // Tutorial Tour
      'tutorial.welcome.title': 'Willkommen beim Cubik Builder!',
      'tutorial.welcome.desc': 'Diese interaktive Anleitung hilft Ihnen, erstaunliche 3D-Modelle zu erstellen. Los geht\'s!',
      'tutorial.gallery.title': 'Block-Galerie',
      'tutorial.gallery.desc': 'Wählen Sie den Blocktyp, den Sie platzieren möchten. Es gibt 4 Typen: Void, Zen, Bion und Zen/2. Klicken Sie auf einen Block, um ihn auszuwählen.',
      'tutorial.palette.title': 'Farbpalette',
      'tutorial.palette.desc': 'Wählen Sie eine Farbe für Ihren Block. Klicken Sie auf einen Farbpunkt, um ihn auszuwählen. Die gewählte Farbe wird auf neue Blöcke angewendet.',
      'tutorial.place.title': 'Blöcke platzieren',
      'tutorial.place.desc': 'Klicken Sie auf die Szene, um einen Block zu platzieren. Blöcke rasten automatisch am Raster und aneinander ein.',
      'tutorial.navigate.title': 'Kamera-Navigation',
      'tutorial.navigate.desc': 'Drehen: Linke Maustaste gedrückt halten und ziehen. Verschieben: Rechte Maustaste gedrückt halten und ziehen. Zoom: Mausrad verwenden.',
      'tutorial.delete.title': 'Blöcke löschen',
      'tutorial.delete.desc': 'Rechtsklicken Sie auf einen Block, um ihn zu löschen. Sie können auch Strg+Z verwenden, um die letzte Aktion rückgängig zu machen.',
      'tutorial.editor.title': 'Facetten-Editor',
      'tutorial.editor.desc': 'Drücken Sie Tab oder die mittlere Maustaste auf einem Block, um den Facetten-Editor zu öffnen. Probieren Sie es jetzt!',
      'tutorial.editorSelectFace.title': 'Facette wählen',
      'tutorial.editorSelectFace.desc': 'Klicken Sie auf eine Facette des Blocks, die Sie ersetzen oder bemalen möchten.',
      'tutorial.editorFaceType.title': 'Ersatz wählen',
      'tutorial.editorFaceType.desc': 'Wählen Sie ein dekoratives Element, um die gewählte Facette zu ersetzen.',
      'tutorial.editorColor.title': 'Farbe wählen',
      'tutorial.editorColor.desc': 'Optional wählen Sie eine Farbe für die Facette. Klicken Sie auf eine beliebige Farbe.',
      'tutorial.editorApply.title': 'Änderungen anwenden',
      'tutorial.editorApply.desc': 'Klicken Sie auf diese Schaltfläche, um den Ersatz anzuwenden. Drücken Sie Tab oder Escape, um den Editor zu schließen.',
      'tutorial.undoredo.title': 'Rückgängig & Wiederholen',
      'tutorial.undoredo.desc': 'Einen Fehler gemacht? Verwenden Sie diese Tasten oder Strg+Z zum Rückgängigmachen, Strg+Y zum Wiederholen. Das Papierkorb-Symbol löscht die gesamte Szene.',
      'tutorial.saveload.title': 'Speichern & Laden',
      'tutorial.saveload.desc': 'Speichern Sie Ihr Projekt mit der Speichern-Taste in eine Datei. Laden Sie zuvor gespeicherte Projekte mit der Laden-Taste.',
      'tutorial.continue.title': 'Im Konto speichern',
      'tutorial.continue.desc': 'Klicken Sie auf Weiter, um Ihr Projekt in Ihrem persönlichen Konto zu speichern. Dort können Sie es kaufen oder später weiter bearbeiten.',
      'tutorial.finish.title': 'Sie sind bereit!',
      'tutorial.finish.desc': 'Gut gemacht! Sie kennen jetzt die Grundlagen. Beginnen Sie mit Ihrer Kreation! Sie können dieses Tutorial jederzeit über die Hilfe-Taste neu starten.',
      'tutorial.btn.next': 'Weiter',
      'tutorial.btn.prev': 'Zurück',
      'tutorial.btn.done': 'Fertig!',
      'tutorial.btn.start': 'Tutorial starten'
    },

    // =========================================================================
    // DUTCH (NL)
    // =========================================================================
    nl: {
      // General
      'app.title': '3D-bouwer',
      'loader.loading': 'Laden...',

      // Help Modal
      'help.title': 'Snelstart',
      'help.navigation': 'Navigatie',
      'help.controls': 'Bediening',
      'help.btn': 'Help',
      'help.start': 'Start',
      'help.tutorial': 'Start Tutorial',
      'help.close': 'Sluiten',

      // Navigation Instructions
      'help.lmb.rotate': 'LMK ingedrukt \u2014 draaien',
      'help.rmb.pan': 'RMK ingedrukt \u2014 verschuiven',
      'help.wheel.zoom': 'Muiswiel \u2014 zoomen',
      'help.lmb.add': 'Cubik toevoegen',
      'help.rmb.delete': 'Cubik verwijderen',
      'help.tab.replace': 'Facetten vervangen/verven',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Ongedaan maken / Opnieuw',
      'help.copy': 'Cubik kopiëren',
      'help.orbit': 'Camera rond draaipunt',
      'help.move': 'Omhoog/omlaag',

      // HUD (Top Bar)
      'hud.load': 'Laden',
      'hud.save': 'Opslaan',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Klik om statistieken te exporteren',

      // Navigation (Side Menu)
      'nav.home': 'Home',
      'nav.shop': 'Winkel',
      'nav.about': 'Over ons',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galerij',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partnerschap',
      'nav.contacts': 'Contact',

      // Block Editor
      'editor.title': 'Blok-editor',
      'editor.hint': 'Selecteer de facetten die u wilt vervangen, kies een kleur uit het palet, kies het type vervanging \u2014 en pas toe.',
      'editor.preview': 'Cubik-voorbeeld',
      'editor.noSelection': 'Geen cubik geselecteerd',
      'editor.replace': 'Facetten vervangen',

      // Export / Import
      'export.scene': 'Scène exporteren',
      'export.stats': 'Statistieken exporteren',

      // Projects
      'project.save': 'Project opslaan',
      'project.load': 'Project laden',
      'project.name': 'Projectnaam',
      'project.cancel': 'Annuleren',
      'project.saveBtn': 'Opslaan',
      'project.modalTitle': 'Project opslaan',

      // Statistics
      'stats.blocks': 'Blokken',
      'stats.facets': 'Facetten',

      // Status Messages
      'status.ready': 'Gereed.',
      'status.loading': 'Laden...',
      'status.saved': 'Opgeslagen!',
      'status.error': 'Fout',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Inklappen',
      'facetStats.expand': 'Uitklappen',

      // Shop Integration
      'shop.sending': 'Verzenden naar winkel...',
      'shop.sent': 'Verzonden naar winkel',
      'shop.sentNoUrl': 'Verzonden naar winkel (maar geen URL ontvangen)',
      'shop.errorMissing': 'Kan niet naar winkel verzenden: product-ID niet gevonden voor sommige facetten. Zie console.',
      'shop.error': 'Winkel-API-fout',
      'shop.signIn': 'Inloggen',
      'shop.close': 'Sluiten',
      'shop.pleaseWait': 'Even geduld, dit kan enkele seconden duren',

      // Context menu (long-press on cube)
      'context.edit': 'Bewerken',
      'context.delete': 'Kubus verwijderen',
      'panel.toggleMenu': 'Menu in-/uitklappen',
      'editor.collapsePanel': 'Paneel inklappen',

      // Additional UI
      'help.closeEditor': 'Editor / overlays sluiten',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Geschatte prijs',
      'hud.loadTitle': 'Project laden',
      'hud.saveTitle': 'Project opslaan',
      'continue.btn': 'Doorgaan',
      'continue.title': 'Opslaan in account / Naar winkel',
      'toolbar.clear': 'Scène leegmaken',
      'toolbar.undo': 'Ongedaan maken (Ctrl+Z)',
      'toolbar.redo': 'Opnieuw (Ctrl+Y)',
      'toolbar.replayBuild': 'Bouw afspelen',
      'toolbar.recordTimelapse': 'Timelapse-video opnemen',
      'help.titleAttr': 'Help / Snelstart',
      'export.statsTitle': 'Statistieken exporteren naar .txt',
      'project.saveTitle': 'Project opslaan als JSON',
      'project.loadTitle': 'Project laden uit JSON',
      'nav.open': 'Navigatie openen',
      'panel.addCubik': 'Cubik toevoegen',
      'panel.deleteCubik': 'Cubik verwijderen',

      // AI Constructor
      'ai.title': 'AI-constructeur',
      'ai.editor': 'AI-editor',
      'ai.ready': 'Klaar',
      'ai.mode.fast': 'Snel',
      'ai.mode.creative': 'Creatief',
      'ai.addMode': 'Toevoegen aan scène (anders \u2014 vervangen)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Beschrijf wat je wilt bouwen, bijv. "Groen huis met rood dak" of "Robot"',
      'ai.blocks': 'blokken',
      'ai.placeholder': 'Wat moet ik bouwen?...',
      'ai.send': 'Versturen',
      'ai.voiceInput': 'Spraakinvoer',
      'ai.generating': 'Bezig met genereren...',
      'ai.listening': 'Luisteren...',
      'ai.doneBlocks': 'Klaar! {n} blokken gebouwd',
      'ai.blocksCount': '{n} blokken',

      // Tutorial Tour
      'tutorial.welcome.title': 'Welkom bij Cubik Builder!',
      'tutorial.welcome.desc': 'Deze interactieve gids helpt je geweldige 3D-modellen te maken. Laten we beginnen!',
      'tutorial.gallery.title': 'Blok Galerij',
      'tutorial.gallery.desc': 'Kies het type blok dat je wilt plaatsen. Er zijn 4 types: Void, Zen, Bion en Zen/2. Klik op een blok om het te selecteren.',
      'tutorial.palette.title': 'Kleurenpalet',
      'tutorial.palette.desc': 'Kies een kleur voor je blok. Klik op een kleurstip om deze te selecteren. De geselecteerde kleur wordt toegepast op nieuwe blokken.',
      'tutorial.place.title': 'Blokken plaatsen',
      'tutorial.place.desc': 'Klik op de scène om een blok te plaatsen. Blokken klikken automatisch vast aan het raster en aan elkaar.',
      'tutorial.navigate.title': 'Camera Navigatie',
      'tutorial.navigate.desc': 'Roteren: houd linkermuisknop ingedrukt en sleep. Verschuiven: houd rechtermuisknop ingedrukt en sleep. Zoom: gebruik het muiswiel.',
      'tutorial.delete.title': 'Blokken verwijderen',
      'tutorial.delete.desc': 'Rechtsklik op een blok om het te verwijderen. Je kunt ook Ctrl+Z gebruiken om je laatste actie ongedaan te maken.',
      'tutorial.editor.title': 'Facet Editor',
      'tutorial.editor.desc': 'Druk op Tab of middelste muisknop op een blok om de Facet Editor te openen. Probeer het nu!',
      'tutorial.editorSelectFace.title': 'Selecteer facet',
      'tutorial.editorSelectFace.desc': 'Klik op een facet van het blok dat je wilt vervangen of schilderen.',
      'tutorial.editorFaceType.title': 'Kies vervanging',
      'tutorial.editorFaceType.desc': 'Selecteer een decoratief element om het gekozen facet te vervangen.',
      'tutorial.editorColor.title': 'Kies kleur',
      'tutorial.editorColor.desc': 'Optioneel: selecteer een kleur voor het facet. Klik op een kleur.',
      'tutorial.editorApply.title': 'Wijzigingen toepassen',
      'tutorial.editorApply.desc': 'Klik op deze knop om de vervanging toe te passen. Druk op Tab of Escape om de editor te sluiten.',
      'tutorial.undoredo.title': 'Ongedaan maken & Opnieuw',
      'tutorial.undoredo.desc': 'Fout gemaakt? Gebruik deze knoppen of Ctrl+Z om ongedaan te maken, Ctrl+Y om opnieuw te doen. Het prullenbak-icoon wist de hele scène.',
      'tutorial.saveload.title': 'Opslaan & Laden',
      'tutorial.saveload.desc': 'Sla je project op naar een bestand met de Opslaan-knop. Laad eerder opgeslagen projecten met de Laden-knop.',
      'tutorial.continue.title': 'Opslaan in Account',
      'tutorial.continue.desc': 'Klik op Doorgaan om je project op te slaan in je persoonlijke account. Daar kun je het kopen of later verder bewerken.',
      'tutorial.finish.title': 'Je bent klaar!',
      'tutorial.finish.desc': 'Goed gedaan! Je kent nu de basis. Begin met bouwen! Je kunt deze tutorial altijd opnieuw starten via de Help-knop.',
      'tutorial.btn.next': 'Volgende',
      'tutorial.btn.prev': 'Terug',
      'tutorial.btn.done': 'Klaar!',
      'tutorial.btn.start': 'Start Tutorial'
    },

    // =========================================================================
    // FRENCH (FR)
    // =========================================================================
    fr: {
      // General
      'app.title': 'Constructeur 3D',
      'loader.loading': 'Chargement...',

      // Help Modal
      'help.title': 'Démarrage rapide',
      'help.navigation': 'Navigation',
      'help.controls': 'Commandes',
      'help.btn': 'Aide',
      'help.start': 'Commencer',
      'help.tutorial': 'Commencer le tutoriel',
      'help.close': 'Fermer',

      // Navigation Instructions
      'help.lmb.rotate': 'Maintenir clic gauche \u2014 rotation',
      'help.rmb.pan': 'Maintenir clic droit \u2014 déplacer',
      'help.wheel.zoom': 'Molette \u2014 zoom',
      'help.lmb.add': 'Ajouter un Cubik',
      'help.rmb.delete': 'Supprimer un Cubik',
      'help.tab.replace': 'Remplacer/peindre les facettes',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Annuler / Rétablir',
      'help.copy': 'Copier le Cubik',
      'help.orbit': 'Orbiter la caméra autour du pivot',
      'help.move': 'Monter/descendre',

      // HUD (Top Bar)
      'hud.load': 'Charger',
      'hud.save': 'Enregistrer',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Cliquez pour exporter les statistiques',

      // Navigation (Side Menu)
      'nav.home': 'Accueil',
      'nav.shop': 'Boutique',
      'nav.about': 'À propos',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galerie',
      'nav.video': 'Vidéo',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partenariat',
      'nav.contacts': 'Contact',

      // Block Editor
      'editor.title': 'Éditeur de blocs',
      'editor.hint': 'Sélectionnez les facettes à remplacer, choisissez une couleur dans la palette, sélectionnez le type de remplacement \u2014 puis appliquez.',
      'editor.preview': 'Aperçu du cubik',
      'editor.noSelection': 'Aucun cubik sélectionné',
      'editor.replace': 'Remplacer les facettes',

      // Export / Import
      'export.scene': 'Exporter la scène',
      'export.stats': 'Exporter les statistiques',

      // Projects
      'project.save': 'Enregistrer le projet',
      'project.load': 'Charger le projet',
      'project.name': 'Nom du projet',
      'project.cancel': 'Annuler',
      'project.saveBtn': 'Enregistrer',
      'project.modalTitle': 'Enregistrer le projet',

      // Statistics
      'stats.blocks': 'Blocs',
      'stats.facets': 'Facettes',

      // Status Messages
      'status.ready': 'Prêt.',
      'status.loading': 'Chargement...',
      'status.saved': 'Enregistré !',
      'status.error': 'Erreur',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Réduire',
      'facetStats.expand': 'Développer',

      // Shop Integration
      'shop.sending': 'Envoi vers la boutique...',
      'shop.sent': 'Envoyé à la boutique',
      'shop.sentNoUrl': 'Envoyé à la boutique (mais aucune URL reçue)',
      'shop.errorMissing': 'Impossible d\'envoyer à la boutique : ID produit introuvable pour certaines facettes. Voir la console.',
      'shop.error': 'Erreur API boutique',
      'shop.signIn': 'Se connecter',
      'shop.close': 'Fermer',
      'shop.pleaseWait': 'Veuillez patienter, cela peut prendre quelques secondes',

      // Context menu (long-press on cube)
      'context.edit': 'Modifier',
      'context.delete': 'Supprimer le cube',
      'panel.toggleMenu': 'Réduire / développer le menu',
      'editor.collapsePanel': 'Réduire le panneau',

      // Additional UI
      'help.closeEditor': 'Fermer l\'éditeur / les overlays',
      'stats.badge': 'Cubiks :',
      'hud.estimatedPrice': 'Prix estimé',
      'hud.loadTitle': 'Charger le projet',
      'hud.saveTitle': 'Enregistrer le projet',
      'continue.btn': 'Continuer',
      'continue.title': 'Enregistrer dans le compte / Continuer vers la boutique',
      'toolbar.clear': 'Vider la scène',
      'toolbar.undo': 'Annuler (Ctrl+Z)',
      'toolbar.redo': 'Rétablir (Ctrl+Y)',
      'toolbar.replayBuild': 'Lire la construction',
      'toolbar.recordTimelapse': 'Enregistrer une vidéo timelapse',
      'help.titleAttr': 'Aide / Démarrage rapide',
      'export.statsTitle': 'Exporter les statistiques en .txt',
      'project.saveTitle': 'Enregistrer le projet en JSON',
      'project.loadTitle': 'Charger le projet depuis JSON',
      'nav.open': 'Ouvrir la navigation',
      'panel.addCubik': 'Ajouter un cubik',
      'panel.deleteCubik': 'Supprimer le cubik',

      // AI Constructor
      'ai.title': 'Constructeur IA',
      'ai.editor': 'Éditeur IA',
      'ai.ready': 'Prêt',
      'ai.mode.fast': 'Rapide',
      'ai.mode.creative': 'Créatif',
      'ai.addMode': 'Ajouter à la scène (sinon \u2014 remplacer)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Décrivez ce que vous voulez construire, ex. "Maison verte à toit rouge" ou "Robot"',
      'ai.blocks': 'blocs',
      'ai.placeholder': 'Que dois-je construire?...',
      'ai.send': 'Envoyer',
      'ai.voiceInput': 'Saisie vocale',
      'ai.generating': 'Génération en cours...',
      'ai.listening': 'Écoute en cours...',
      'ai.doneBlocks': 'Terminé ! {n} blocs construits',
      'ai.blocksCount': '{n} blocs',

      // Tutorial Tour
      'tutorial.welcome.title': 'Bienvenue dans Cubik Builder !',
      'tutorial.welcome.desc': 'Ce guide interactif vous aidera à créer des modèles 3D incroyables. Commençons !',
      'tutorial.gallery.title': 'Galerie de blocs',
      'tutorial.gallery.desc': 'Choisissez le type de bloc que vous souhaitez placer. Il existe 4 types : Void, Zen, Bion et Zen/2. Cliquez sur un bloc pour le sélectionner.',
      'tutorial.palette.title': 'Palette de couleurs',
      'tutorial.palette.desc': 'Choisissez une couleur pour votre bloc. Cliquez sur un point de couleur pour le sélectionner. La couleur choisie sera appliquée aux nouveaux blocs.',
      'tutorial.place.title': 'Placer des blocs',
      'tutorial.place.desc': 'Cliquez sur la scène pour placer un bloc. Les blocs s\'alignent automatiquement sur la grille et entre eux.',
      'tutorial.navigate.title': 'Navigation caméra',
      'tutorial.navigate.desc': 'Rotation : maintenez le clic gauche et faites glisser. Déplacement : maintenez le clic droit et faites glisser. Zoom : utilisez la molette.',
      'tutorial.delete.title': 'Supprimer des blocs',
      'tutorial.delete.desc': 'Clic droit sur un bloc pour le supprimer. Vous pouvez aussi utiliser Ctrl+Z pour annuler votre dernière action.',
      'tutorial.editor.title': 'Éditeur de facettes',
      'tutorial.editor.desc': 'Appuyez sur Tab ou clic molette sur un bloc pour ouvrir l\'éditeur de facettes. Essayez maintenant !',
      'tutorial.editorSelectFace.title': 'Sélectionner une facette',
      'tutorial.editorSelectFace.desc': 'Cliquez sur une facette du bloc que vous souhaitez remplacer ou peindre.',
      'tutorial.editorFaceType.title': 'Choisir le remplacement',
      'tutorial.editorFaceType.desc': 'Sélectionnez un élément décoratif pour remplacer la facette choisie.',
      'tutorial.editorColor.title': 'Choisir la couleur',
      'tutorial.editorColor.desc': 'Optionnellement, sélectionnez une couleur pour la facette. Cliquez sur une couleur.',
      'tutorial.editorApply.title': 'Appliquer les modifications',
      'tutorial.editorApply.desc': 'Cliquez sur ce bouton pour appliquer le remplacement. Appuyez sur Tab ou Échap pour fermer l\'éditeur.',
      'tutorial.undoredo.title': 'Annuler & Rétablir',
      'tutorial.undoredo.desc': 'Vous avez fait une erreur ? Utilisez ces boutons ou Ctrl+Z pour annuler, Ctrl+Y pour rétablir. L\'icône corbeille efface toute la scène.',
      'tutorial.saveload.title': 'Enregistrer & Charger',
      'tutorial.saveload.desc': 'Enregistrez votre projet dans un fichier avec le bouton Enregistrer. Chargez des projets précédents avec le bouton Charger.',
      'tutorial.continue.title': 'Enregistrer dans le compte',
      'tutorial.continue.desc': 'Cliquez sur Continuer pour enregistrer votre projet dans votre compte personnel. Vous pourrez l\'acheter ou continuer à le modifier plus tard.',
      'tutorial.finish.title': 'Vous êtes prêt !',
      'tutorial.finish.desc': 'Bravo ! Vous connaissez maintenant les bases. Commencez à construire ! Vous pouvez toujours relancer ce tutoriel depuis le bouton Aide.',
      'tutorial.btn.next': 'Suivant',
      'tutorial.btn.prev': 'Retour',
      'tutorial.btn.done': 'Terminé !',
      'tutorial.btn.start': 'Démarrer le tutoriel'
    },

    // =========================================================================
    // SPANISH (ES)
    // =========================================================================
    es: {
      // General
      'app.title': 'Constructor 3D',
      'loader.loading': 'Cargando...',

      // Help Modal
      'help.title': 'Inicio rápido',
      'help.navigation': 'Navegación',
      'help.controls': 'Controles',
      'help.btn': 'Ayuda',
      'help.start': 'Iniciar',
      'help.tutorial': 'Iniciar tutorial',
      'help.close': 'Cerrar',

      // Navigation Instructions
      'help.lmb.rotate': 'Mantener clic izq. \u2014 rotar',
      'help.rmb.pan': 'Mantener clic der. \u2014 desplazar',
      'help.wheel.zoom': 'Rueda del ratón \u2014 zoom',
      'help.lmb.add': 'Añadir Cubik',
      'help.rmb.delete': 'Eliminar Cubik',
      'help.tab.replace': 'Reemplazar/pintar facetas',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Deshacer / Rehacer',
      'help.copy': 'Copiar Cubik',
      'help.orbit': 'Orbitar cámara alrededor del pivote',
      'help.move': 'Mover arriba/abajo',

      // HUD (Top Bar)
      'hud.load': 'Cargar',
      'hud.save': 'Guardar',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Clic para exportar estadísticas',

      // Navigation (Side Menu)
      'nav.home': 'Inicio',
      'nav.shop': 'Tienda',
      'nav.about': 'Sobre nosotros',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galería',
      'nav.video': 'Vídeo',
      'nav.blog': 'Blog',
      'nav.partnership': 'Colaboración',
      'nav.contacts': 'Contacto',

      // Block Editor
      'editor.title': 'Editor de bloques',
      'editor.hint': 'Seleccione las facetas a reemplazar, elija un color de la paleta, seleccione el tipo de reemplazo \u2014 luego aplique.',
      'editor.preview': 'Vista previa del cubik',
      'editor.noSelection': 'Ningún cubik seleccionado',
      'editor.replace': 'Reemplazar facetas',

      // Export / Import
      'export.scene': 'Exportar escena',
      'export.stats': 'Exportar estadísticas',

      // Projects
      'project.save': 'Guardar proyecto',
      'project.load': 'Cargar proyecto',
      'project.name': 'Nombre del proyecto',
      'project.cancel': 'Cancelar',
      'project.saveBtn': 'Guardar',
      'project.modalTitle': 'Guardar proyecto',

      // Statistics
      'stats.blocks': 'Bloques',
      'stats.facets': 'Facetas',

      // Status Messages
      'status.ready': 'Listo.',
      'status.loading': 'Cargando...',
      'status.saved': '¡Guardado!',
      'status.error': 'Error',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Contraer',
      'facetStats.expand': 'Expandir',

      // Shop Integration
      'shop.sending': 'Enviando a la tienda...',
      'shop.sent': 'Enviado a la tienda',
      'shop.sentNoUrl': 'Enviado a la tienda (pero no se recibió URL)',
      'shop.errorMissing': 'No se puede enviar a la tienda: ID de producto no encontrado para algunas facetas. Ver consola.',
      'shop.error': 'Error de API de la tienda',
      'shop.signIn': 'Iniciar sesión',
      'shop.close': 'Cerrar',
      'shop.pleaseWait': 'Por favor espere, esto puede tardar unos segundos',

      // Context menu (long-press on cube)
      'context.edit': 'Editar',
      'context.delete': 'Eliminar cubo',
      'panel.toggleMenu': 'Contraer / expandir menú',
      'editor.collapsePanel': 'Contraer panel',

      // Additional UI
      'help.closeEditor': 'Cerrar editor / overlays',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Precio estimado',
      'hud.loadTitle': 'Cargar proyecto',
      'hud.saveTitle': 'Guardar proyecto',
      'continue.btn': 'Continuar',
      'continue.title': 'Guardar en cuenta / Continuar a tienda',
      'toolbar.clear': 'Vaciar escena',
      'toolbar.undo': 'Deshacer (Ctrl+Z)',
      'toolbar.redo': 'Rehacer (Ctrl+Y)',
      'toolbar.replayBuild': 'Reproducir construcción',
      'toolbar.recordTimelapse': 'Grabar video timelapse',
      'help.titleAttr': 'Ayuda / Inicio rápido',
      'export.statsTitle': 'Exportar estadísticas a .txt',
      'project.saveTitle': 'Guardar proyecto como JSON',
      'project.loadTitle': 'Cargar proyecto desde JSON',
      'nav.open': 'Abrir navegación',
      'panel.addCubik': 'Añadir cubik',
      'panel.deleteCubik': 'Eliminar cubik',

      // AI Constructor
      'ai.title': 'Constructor IA',
      'ai.editor': 'Editor IA',
      'ai.ready': 'Listo',
      'ai.mode.fast': 'Rápido',
      'ai.mode.creative': 'Creativo',
      'ai.addMode': 'Añadir a escena (si no \u2014 reemplazar)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Describe qué construir, ej. "Casa verde con techo rojo" o "Robot"',
      'ai.blocks': 'bloques',
      'ai.placeholder': '¿Qué debo construir?...',
      'ai.send': 'Enviar',
      'ai.voiceInput': 'Entrada de voz',
      'ai.generating': 'Generando...',
      'ai.listening': 'Escuchando...',
      'ai.doneBlocks': '¡Listo! {n} bloques construidos',
      'ai.blocksCount': '{n} bloques',

      // Tutorial Tour
      'tutorial.welcome.title': '¡Bienvenido a Cubik Builder!',
      'tutorial.welcome.desc': 'Esta guía interactiva te ayudará a crear increíbles modelos 3D. ¡Comencemos!',
      'tutorial.gallery.title': 'Galería de bloques',
      'tutorial.gallery.desc': 'Elige el tipo de bloque que deseas colocar. Hay 4 tipos: Void, Zen, Bion y Zen/2. Haz clic en un bloque para seleccionarlo.',
      'tutorial.palette.title': 'Paleta de colores',
      'tutorial.palette.desc': 'Elige un color para tu bloque. Haz clic en cualquier punto de color para seleccionarlo. El color elegido se aplicará a los nuevos bloques.',
      'tutorial.place.title': 'Colocar bloques',
      'tutorial.place.desc': 'Haz clic en la escena para colocar un bloque. Los bloques se ajustan automáticamente a la cuadrícula y entre sí.',
      'tutorial.navigate.title': 'Navegación de cámara',
      'tutorial.navigate.desc': 'Rotar: mantén pulsado el botón izquierdo y arrastra. Desplazar: mantén pulsado el botón derecho y arrastra. Zoom: usa la rueda del ratón.',
      'tutorial.delete.title': 'Eliminar bloques',
      'tutorial.delete.desc': 'Haz clic derecho en cualquier bloque para eliminarlo. También puedes usar Ctrl+Z para deshacer tu última acción.',
      'tutorial.editor.title': 'Editor de facetas',
      'tutorial.editor.desc': 'Presiona Tab o el botón central del ratón sobre un bloque para abrir el Editor de facetas. ¡Pruébalo ahora!',
      'tutorial.editorSelectFace.title': 'Seleccionar faceta',
      'tutorial.editorSelectFace.desc': 'Haz clic en una faceta del bloque que deseas reemplazar o pintar.',
      'tutorial.editorFaceType.title': 'Elegir reemplazo',
      'tutorial.editorFaceType.desc': 'Selecciona un elemento decorativo para reemplazar la faceta elegida.',
      'tutorial.editorColor.title': 'Elegir color',
      'tutorial.editorColor.desc': 'Opcionalmente selecciona un color para la faceta. Haz clic en cualquier color.',
      'tutorial.editorApply.title': 'Aplicar cambios',
      'tutorial.editorApply.desc': 'Haz clic en este botón para aplicar el reemplazo. Presiona Tab o Escape para cerrar el editor.',
      'tutorial.undoredo.title': 'Deshacer y Rehacer',
      'tutorial.undoredo.desc': '¿Cometiste un error? Usa estos botones o Ctrl+Z para deshacer, Ctrl+Y para rehacer. El icono de papelera borra toda la escena.',
      'tutorial.saveload.title': 'Guardar y Cargar',
      'tutorial.saveload.desc': 'Guarda tu proyecto en un archivo usando el botón Guardar. Carga proyectos guardados anteriormente con el botón Cargar.',
      'tutorial.continue.title': 'Guardar en la cuenta',
      'tutorial.continue.desc': 'Haz clic en Continuar para guardar tu proyecto en tu cuenta personal. Allí podrás comprarlo o seguir editándolo más tarde.',
      'tutorial.finish.title': '¡Estás listo!',
      'tutorial.finish.desc': '¡Buen trabajo! Ya conoces lo básico. ¡Empieza a construir! Siempre puedes reiniciar este tutorial desde el botón de Ayuda.',
      'tutorial.btn.next': 'Siguiente',
      'tutorial.btn.prev': 'Atrás',
      'tutorial.btn.done': '¡Listo!',
      'tutorial.btn.start': 'Iniciar tutorial'
    },

    // =========================================================================
    // PORTUGUESE (PT)
    // =========================================================================
    pt: {
      // General
      'app.title': 'Construtor 3D',
      'loader.loading': 'Carregando...',

      // Help Modal
      'help.title': 'Início rápido',
      'help.navigation': 'Navegação',
      'help.controls': 'Controles',
      'help.btn': 'Ajuda',
      'help.start': 'Iniciar',
      'help.tutorial': 'Iniciar tutorial',
      'help.close': 'Fechar',

      // Navigation Instructions
      'help.lmb.rotate': 'Segurar botão esq. \u2014 girar',
      'help.rmb.pan': 'Segurar botão dir. \u2014 mover',
      'help.wheel.zoom': 'Roda do mouse \u2014 zoom',
      'help.lmb.add': 'Adicionar Cubik',
      'help.rmb.delete': 'Excluir Cubik',
      'help.tab.replace': 'Substituir/pintar facetas',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Desfazer / Refazer',
      'help.copy': 'Copiar Cubik',
      'help.orbit': 'Orbitar câmera ao redor do pivô',
      'help.move': 'Mover para cima/baixo',

      // HUD (Top Bar)
      'hud.load': 'Carregar',
      'hud.save': 'Salvar',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Clique para exportar estatísticas',

      // Navigation (Side Menu)
      'nav.home': 'Início',
      'nav.shop': 'Loja',
      'nav.about': 'Sobre nós',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galeria',
      'nav.video': 'Vídeo',
      'nav.blog': 'Blog',
      'nav.partnership': 'Parceria',
      'nav.contacts': 'Contato',

      // Block Editor
      'editor.title': 'Editor de blocos',
      'editor.hint': 'Selecione as facetas a substituir, escolha uma cor na paleta, selecione o tipo de substituição \u2014 depois aplique.',
      'editor.preview': 'Prévia do cubik',
      'editor.noSelection': 'Nenhum cubik selecionado',
      'editor.replace': 'Substituir facetas',

      // Export / Import
      'export.scene': 'Exportar cena',
      'export.stats': 'Exportar estatísticas',

      // Projects
      'project.save': 'Salvar projeto',
      'project.load': 'Carregar projeto',
      'project.name': 'Nome do projeto',
      'project.cancel': 'Cancelar',
      'project.saveBtn': 'Salvar',
      'project.modalTitle': 'Salvar projeto',

      // Statistics
      'stats.blocks': 'Blocos',
      'stats.facets': 'Facetas',

      // Status Messages
      'status.ready': 'Pronto.',
      'status.loading': 'Carregando...',
      'status.saved': 'Salvo!',
      'status.error': 'Erro',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Recolher',
      'facetStats.expand': 'Expandir',

      // Shop Integration
      'shop.sending': 'Enviando para a loja...',
      'shop.sent': 'Enviado para a loja',
      'shop.sentNoUrl': 'Enviado para a loja (mas nenhuma URL recebida)',
      'shop.errorMissing': 'Não é possível enviar para a loja: ID do produto não encontrado para algumas facetas. Ver console.',
      'shop.error': 'Erro da API da loja',
      'shop.signIn': 'Entrar',
      'shop.close': 'Fechar',
      'shop.pleaseWait': 'Por favor aguarde, isso pode levar alguns segundos',

      // Context menu (long-press on cube)
      'context.edit': 'Editar',
      'context.delete': 'Excluir cubo',
      'panel.toggleMenu': 'Recolher / expandir menu',
      'editor.collapsePanel': 'Recolher painel',

      // Additional UI
      'help.closeEditor': 'Fechar editor / overlays',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Preço estimado',
      'hud.loadTitle': 'Carregar projeto',
      'hud.saveTitle': 'Guardar projeto',
      'continue.btn': 'Continuar',
      'continue.title': 'Guardar na conta / Continuar para loja',
      'toolbar.clear': 'Limpar cena',
      'toolbar.undo': 'Desfazer (Ctrl+Z)',
      'toolbar.redo': 'Refazer (Ctrl+Y)',
      'toolbar.replayBuild': 'Reproduzir construção',
      'toolbar.recordTimelapse': 'Gravar vídeo timelapse',
      'help.titleAttr': 'Ajuda / Início rápido',
      'export.statsTitle': 'Exportar estatísticas para .txt',
      'project.saveTitle': 'Guardar projeto como JSON',
      'project.loadTitle': 'Carregar projeto de JSON',
      'nav.open': 'Abrir navegação',
      'panel.addCubik': 'Adicionar cubik',
      'panel.deleteCubik': 'Eliminar cubik',

      // AI Constructor
      'ai.title': 'Construtor IA',
      'ai.editor': 'Editor IA',
      'ai.ready': 'Pronto',
      'ai.mode.fast': 'Rápido',
      'ai.mode.creative': 'Criativo',
      'ai.addMode': 'Adicionar à cena (caso contrário \u2014 substituir)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Descreva o que construir, ex. "Casa verde com telhado vermelho" ou "Robot"',
      'ai.blocks': 'blocos',
      'ai.placeholder': 'O que devo construir?...',
      'ai.send': 'Enviar',
      'ai.voiceInput': 'Entrada de voz',
      'ai.generating': 'A gerar...',
      'ai.listening': 'A ouvir...',
      'ai.doneBlocks': 'Pronto! {n} blocos construídos',
      'ai.blocksCount': '{n} blocos',

      // Tutorial Tour
      'tutorial.welcome.title': 'Bem-vindo ao Cubik Builder!',
      'tutorial.welcome.desc': 'Este guia interativo vai ajudá-lo a criar modelos 3D incríveis. Vamos começar!',
      'tutorial.gallery.title': 'Galeria de blocos',
      'tutorial.gallery.desc': 'Escolha o tipo de bloco que deseja colocar. Existem 4 tipos: Void, Zen, Bion e Zen/2. Clique em um bloco para selecioná-lo.',
      'tutorial.palette.title': 'Paleta de cores',
      'tutorial.palette.desc': 'Escolha uma cor para seu bloco. Clique em qualquer ponto de cor para selecioná-lo. A cor selecionada será aplicada aos novos blocos.',
      'tutorial.place.title': 'Colocar blocos',
      'tutorial.place.desc': 'Clique na cena para colocar um bloco. Os blocos se encaixam automaticamente na grade e entre si.',
      'tutorial.navigate.title': 'Navegação da câmera',
      'tutorial.navigate.desc': 'Girar: segure o botão esquerdo e arraste. Mover: segure o botão direito e arraste. Zoom: use a roda do mouse.',
      'tutorial.delete.title': 'Excluir blocos',
      'tutorial.delete.desc': 'Clique com o botão direito em qualquer bloco para excluí-lo. Você também pode usar Ctrl+Z para desfazer sua última ação.',
      'tutorial.editor.title': 'Editor de facetas',
      'tutorial.editor.desc': 'Pressione Tab ou o botão do meio do mouse em um bloco para abrir o Editor de facetas. Experimente agora!',
      'tutorial.editorSelectFace.title': 'Selecionar faceta',
      'tutorial.editorSelectFace.desc': 'Clique em uma faceta do bloco que deseja substituir ou pintar.',
      'tutorial.editorFaceType.title': 'Escolher substituição',
      'tutorial.editorFaceType.desc': 'Selecione um elemento decorativo para substituir a faceta escolhida.',
      'tutorial.editorColor.title': 'Escolher cor',
      'tutorial.editorColor.desc': 'Opcionalmente selecione uma cor para a faceta. Clique em qualquer cor.',
      'tutorial.editorApply.title': 'Aplicar alterações',
      'tutorial.editorApply.desc': 'Clique neste botão para aplicar a substituição. Pressione Tab ou Escape para fechar o editor.',
      'tutorial.undoredo.title': 'Desfazer e Refazer',
      'tutorial.undoredo.desc': 'Cometeu um erro? Use estes botões ou Ctrl+Z para desfazer, Ctrl+Y para refazer. O ícone de lixeira limpa toda a cena.',
      'tutorial.saveload.title': 'Salvar e Carregar',
      'tutorial.saveload.desc': 'Salve seu projeto em um arquivo usando o botão Salvar. Carregue projetos salvos anteriormente com o botão Carregar.',
      'tutorial.continue.title': 'Salvar na conta',
      'tutorial.continue.desc': 'Clique em Continuar para salvar seu projeto em sua conta pessoal. Lá você poderá comprá-lo ou continuar editando mais tarde.',
      'tutorial.finish.title': 'Você está pronto!',
      'tutorial.finish.desc': 'Ótimo trabalho! Agora você conhece o básico. Comece a construir! Você sempre pode reiniciar este tutorial pelo botão de Ajuda.',
      'tutorial.btn.next': 'Próximo',
      'tutorial.btn.prev': 'Voltar',
      'tutorial.btn.done': 'Pronto!',
      'tutorial.btn.start': 'Iniciar tutorial'
    },

    // =========================================================================
    // ITALIAN (IT)
    // =========================================================================
    it: {
      // General
      'app.title': 'Costruttore 3D',
      'loader.loading': 'Caricamento...',

      // Help Modal
      'help.title': 'Avvio rapido',
      'help.navigation': 'Navigazione',
      'help.controls': 'Controlli',
      'help.btn': 'Aiuto',
      'help.start': 'Inizia',
      'help.tutorial': 'Inizia tutorial',
      'help.close': 'Chiudi',

      // Navigation Instructions
      'help.lmb.rotate': 'Tenere premuto sx \u2014 ruotare',
      'help.rmb.pan': 'Tenere premuto dx \u2014 spostare',
      'help.wheel.zoom': 'Rotella mouse \u2014 zoom',
      'help.lmb.add': 'Aggiungi Cubik',
      'help.rmb.delete': 'Elimina Cubik',
      'help.tab.replace': 'Sostituisci/colora facce',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Annulla / Ripristina',
      'help.copy': 'Copia Cubik',
      'help.orbit': 'Orbita fotocamera attorno al perno',
      'help.move': 'Sposta su/giù',

      // HUD (Top Bar)
      'hud.load': 'Carica',
      'hud.save': 'Salva',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Clicca per esportare statistiche',

      // Navigation (Side Menu)
      'nav.home': 'Home',
      'nav.shop': 'Negozio',
      'nav.about': 'Chi siamo',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galleria',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partnership',
      'nav.contacts': 'Contatti',

      // Block Editor
      'editor.title': 'Editor blocchi',
      'editor.hint': 'Seleziona le facce da sostituire, scegli un colore dalla palette, seleziona il tipo di sostituzione \u2014 poi applica.',
      'editor.preview': 'Anteprima cubik',
      'editor.noSelection': 'Nessun cubik selezionato',
      'editor.replace': 'Sostituisci facce',

      // Export / Import
      'export.scene': 'Esporta scena',
      'export.stats': 'Esporta statistiche',

      // Projects
      'project.save': 'Salva progetto',
      'project.load': 'Carica progetto',
      'project.name': 'Nome progetto',
      'project.cancel': 'Annulla',
      'project.saveBtn': 'Salva',
      'project.modalTitle': 'Salva progetto',

      // Statistics
      'stats.blocks': 'Blocchi',
      'stats.facets': 'Facce',

      // Status Messages
      'status.ready': 'Pronto.',
      'status.loading': 'Caricamento...',
      'status.saved': 'Salvato!',
      'status.error': 'Errore',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Comprimi',
      'facetStats.expand': 'Espandi',

      // Shop Integration
      'shop.sending': 'Invio al negozio...',
      'shop.sent': 'Inviato al negozio',
      'shop.sentNoUrl': 'Inviato al negozio (ma nessun URL ricevuto)',
      'shop.errorMissing': 'Impossibile inviare al negozio: ID prodotto non trovato per alcune facce. Vedi console.',
      'shop.error': 'Errore API negozio',
      'shop.signIn': 'Accedi',
      'shop.close': 'Chiudi',
      'shop.pleaseWait': 'Attendere prego, potrebbero volerci alcuni secondi',

      // Context menu (long-press on cube)
      'context.edit': 'Modifica',
      'context.delete': 'Elimina cubo',
      'panel.toggleMenu': 'Comprimi / espandi menu',
      'editor.collapsePanel': 'Comprimi pannello',

      // Additional UI
      'help.closeEditor': 'Chiudi editor / overlay',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Prezzo stimato',
      'hud.loadTitle': 'Carica progetto',
      'hud.saveTitle': 'Salva progetto',
      'continue.btn': 'Continua',
      'continue.title': 'Salva in account / Continua allo shop',
      'toolbar.clear': 'Svuota scena',
      'toolbar.undo': 'Annulla (Ctrl+Z)',
      'toolbar.redo': 'Ripeti (Ctrl+Y)',
      'toolbar.replayBuild': 'Riproduci costruzione',
      'toolbar.recordTimelapse': 'Registra video timelapse',
      'help.titleAttr': 'Aiuto / Avvio rapido',
      'export.statsTitle': 'Esporta statistiche in .txt',
      'project.saveTitle': 'Salva progetto come JSON',
      'project.loadTitle': 'Carica progetto da JSON',
      'nav.open': 'Apri navigazione',
      'panel.addCubik': 'Aggiungi cubik',
      'panel.deleteCubik': 'Elimina cubik',

      // AI Constructor
      'ai.title': 'Costruttore IA',
      'ai.editor': 'Editor IA',
      'ai.ready': 'Pronto',
      'ai.mode.fast': 'Veloce',
      'ai.mode.creative': 'Creativo',
      'ai.addMode': 'Aggiungi alla scena (altrimenti \u2014 sostituisci)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Descrivi cosa costruire, es. "Casa verde con tetto rosso" o "Robot"',
      'ai.blocks': 'blocchi',
      'ai.placeholder': 'Cosa devo costruire?...',
      'ai.send': 'Invia',
      'ai.voiceInput': 'Input vocale',
      'ai.generating': 'Generazione in corso...',
      'ai.listening': 'In ascolto...',
      'ai.doneBlocks': 'Fatto! {n} blocchi costruiti',
      'ai.blocksCount': '{n} blocchi',

      // Tutorial Tour
      'tutorial.welcome.title': 'Benvenuto in Cubik Builder!',
      'tutorial.welcome.desc': 'Questa guida interattiva ti aiuterà a creare fantastici modelli 3D. Iniziamo!',
      'tutorial.gallery.title': 'Galleria blocchi',
      'tutorial.gallery.desc': 'Scegli il tipo di blocco che vuoi posizionare. Ci sono 4 tipi: Void, Zen, Bion e Zen/2. Clicca su un blocco per selezionarlo.',
      'tutorial.palette.title': 'Tavolozza colori',
      'tutorial.palette.desc': 'Scegli un colore per il tuo blocco. Clicca su un punto colore per selezionarlo. Il colore selezionato verrà applicato ai nuovi blocchi.',
      'tutorial.place.title': 'Posiziona blocchi',
      'tutorial.place.desc': 'Clicca sulla scena per posizionare un blocco. I blocchi si agganciano automaticamente alla griglia e tra loro.',
      'tutorial.navigate.title': 'Navigazione camera',
      'tutorial.navigate.desc': 'Ruota: tieni premuto il pulsante sinistro e trascina. Sposta: tieni premuto il pulsante destro e trascina. Zoom: usa la rotellina del mouse.',
      'tutorial.delete.title': 'Elimina blocchi',
      'tutorial.delete.desc': 'Clic destro su qualsiasi blocco per eliminarlo. Puoi anche usare Ctrl+Z per annullare l\'ultima azione.',
      'tutorial.editor.title': 'Editor facce',
      'tutorial.editor.desc': 'Premi Tab o il pulsante centrale del mouse su un blocco per aprire l\'Editor facce. Provalo ora!',
      'tutorial.editorSelectFace.title': 'Seleziona faccia',
      'tutorial.editorSelectFace.desc': 'Clicca su una faccia del blocco che vuoi sostituire o dipingere.',
      'tutorial.editorFaceType.title': 'Scegli sostituzione',
      'tutorial.editorFaceType.desc': 'Seleziona un elemento decorativo per sostituire la faccia scelta.',
      'tutorial.editorColor.title': 'Scegli colore',
      'tutorial.editorColor.desc': 'Opzionalmente seleziona un colore per la faccia. Clicca su un colore qualsiasi.',
      'tutorial.editorApply.title': 'Applica modifiche',
      'tutorial.editorApply.desc': 'Clicca questo pulsante per applicare la sostituzione. Premi Tab o Escape per chiudere l\'editor.',
      'tutorial.undoredo.title': 'Annulla e Ripristina',
      'tutorial.undoredo.desc': 'Hai fatto un errore? Usa questi pulsanti o Ctrl+Z per annullare, Ctrl+Y per ripristinare. L\'icona cestino cancella l\'intera scena.',
      'tutorial.saveload.title': 'Salva e Carica',
      'tutorial.saveload.desc': 'Salva il tuo progetto in un file usando il pulsante Salva. Carica progetti salvati in precedenza con il pulsante Carica.',
      'tutorial.continue.title': 'Salva nell\'account',
      'tutorial.continue.desc': 'Clicca Continua per salvare il progetto nel tuo account personale. Lì potrai acquistarlo o continuare a modificarlo in seguito.',
      'tutorial.finish.title': 'Sei pronto!',
      'tutorial.finish.desc': 'Ottimo lavoro! Ora conosci le basi. Inizia a costruire! Puoi sempre riavviare questo tutorial dal pulsante Aiuto.',
      'tutorial.btn.next': 'Avanti',
      'tutorial.btn.prev': 'Indietro',
      'tutorial.btn.done': 'Fatto!',
      'tutorial.btn.start': 'Avvia tutorial'
    },

    // =========================================================================
    // FINNISH (FI)
    // =========================================================================
    fi: {
      // General
      'app.title': '3D-rakentaja',
      'loader.loading': 'Ladataan...',

      // Help Modal
      'help.title': 'Pikaopas',
      'help.navigation': 'Navigointi',
      'help.controls': 'Ohjaus',
      'help.btn': 'Ohje',
      'help.start': 'Aloita',
      'help.tutorial': 'Aloita opetusohjelma',
      'help.close': 'Sulje',

      // Navigation Instructions
      'help.lmb.rotate': 'Pidä vasen painike \u2014 pyöritä',
      'help.rmb.pan': 'Pidä oikea painike \u2014 siirrä',
      'help.wheel.zoom': 'Hiiren rulla \u2014 zoomaa',
      'help.lmb.add': 'Lisää Cubik',
      'help.rmb.delete': 'Poista Cubik',
      'help.tab.replace': 'Korvaa/maalaa tahkot',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Kumoa / Tee uudelleen',
      'help.copy': 'Kopioi Cubik',
      'help.orbit': 'Kierrä kameraa akselin ympäri',
      'help.move': 'Siirrä ylös/alas',

      // HUD (Top Bar)
      'hud.load': 'Lataa',
      'hud.save': 'Tallenna',
      'hud.cubiks': 'Cubikit',
      'hud.cubiksLabel': 'Vie tilastot napsauttamalla',

      // Navigation (Side Menu)
      'nav.home': 'Etusivu',
      'nav.shop': 'Kauppa',
      'nav.about': 'Tietoja meistä',
      'nav.faq': 'UKK',
      'nav.gallery': 'Galleria',
      'nav.video': 'Video',
      'nav.blog': 'Blogi',
      'nav.partnership': 'Kumppanuus',
      'nav.contacts': 'Yhteystiedot',

      // Block Editor
      'editor.title': 'Lohkoeditori',
      'editor.hint': 'Valitse korvattavat tahkot, valitse väri paletista, valitse korvaustyyppi \u2014 ja sovella.',
      'editor.preview': 'Cubikin esikatselu',
      'editor.noSelection': 'Cubikia ei valittu',
      'editor.replace': 'Korvaa tahkot',

      // Export / Import
      'export.scene': 'Vie näkymä',
      'export.stats': 'Vie tilastot',

      // Projects
      'project.save': 'Tallenna projekti',
      'project.load': 'Lataa projekti',
      'project.name': 'Projektin nimi',
      'project.cancel': 'Peruuta',
      'project.saveBtn': 'Tallenna',
      'project.modalTitle': 'Tallenna projekti',

      // Statistics
      'stats.blocks': 'Lohkot',
      'stats.facets': 'Tahkot',

      // Status Messages
      'status.ready': 'Valmis.',
      'status.loading': 'Ladataan...',
      'status.saved': 'Tallennettu!',
      'status.error': 'Virhe',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Pienennä',
      'facetStats.expand': 'Laajenna',

      // Shop Integration
      'shop.sending': 'Lähetetään kauppaan...',
      'shop.sent': 'Lähetetty kauppaan',
      'shop.sentNoUrl': 'Lähetetty kauppaan (mutta URL:ia ei saatu)',
      'shop.errorMissing': 'Ei voida lähettää kauppaan: tuotetunnusta ei löydy joillekin tahkoille. Katso konsoli.',
      'shop.error': 'Kaupan API-virhe',
      'shop.signIn': 'Kirjaudu sisään',
      'shop.close': 'Sulje',
      'shop.pleaseWait': 'Odota hetki, tämä voi kestää muutaman sekunnin',

      // Context menu (long-press on cube)
      'context.edit': 'Muokkaa',
      'context.delete': 'Poista kuutio',
      'panel.toggleMenu': 'Pienennä / laajenna valikko',
      'editor.collapsePanel': 'Pienennä paneeli',

      // Additional UI
      'help.closeEditor': 'Sulje editori / overlays',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Arvioitu hinta',
      'hud.loadTitle': 'Lataa projekti',
      'hud.saveTitle': 'Tallenna projekti',
      'continue.btn': 'Jatka',
      'continue.title': 'Tallenna tilille / Jatka kauppaan',
      'toolbar.clear': 'Tyhjennä näkymä',
      'toolbar.undo': 'Kumoa (Ctrl+Z)',
      'toolbar.redo': 'Tee uudelleen (Ctrl+Y)',
      'toolbar.replayBuild': 'Toista rakennus',
      'toolbar.recordTimelapse': 'Tallenna timelapse-video',
      'help.titleAttr': 'Ohje / Pikaopas',
      'export.statsTitle': 'Vie tilastot .txt-tiedostoon',
      'project.saveTitle': 'Tallenna projekti JSONina',
      'project.loadTitle': 'Lataa projekti JSONista',
      'nav.open': 'Avaa navigointi',
      'panel.addCubik': 'Lisää cubik',
      'panel.deleteCubik': 'Poista cubik',

      // AI Constructor
      'ai.title': 'AI-rakentaja',
      'ai.editor': 'AI-editori',
      'ai.ready': 'Valmis',
      'ai.mode.fast': 'Nopea',
      'ai.mode.creative': 'Luova',
      'ai.addMode': 'Lisää näkymään (muuten \u2014 korvaa)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Kuvaile mitä rakentaa, esim. "Vihreä talo punaisella katolla" tai "Robotti"',
      'ai.blocks': 'lohkoa',
      'ai.placeholder': 'Mitä minun pitäisi rakentaa?...',
      'ai.send': 'Lähetä',
      'ai.voiceInput': 'Äänisyöttö',
      'ai.generating': 'Luodaan...',
      'ai.listening': 'Kuunnellaan...',
      'ai.doneBlocks': 'Valmis! {n} lohkoa rakennettu',
      'ai.blocksCount': '{n} lohkoa',

      // Tutorial Tour
      'tutorial.welcome.title': 'Tervetuloa Cubik Builderiin!',
      'tutorial.welcome.desc': 'Tämä interaktiivinen opas auttaa sinua luomaan upeita 3D-malleja. Aloitetaan!',
      'tutorial.gallery.title': 'Lohkogalleria',
      'tutorial.gallery.desc': 'Valitse lohkotyyppi, jonka haluat sijoittaa. Tyyppejä on 4: Void, Zen, Bion ja Zen/2. Napsauta lohkoa valitaksesi sen.',
      'tutorial.palette.title': 'Väripaletti',
      'tutorial.palette.desc': 'Valitse väri lohkollesi. Napsauta väripistettä valitaksesi sen. Valittu väri sovelletaan uusiin lohkoihin.',
      'tutorial.place.title': 'Sijoita lohkoja',
      'tutorial.place.desc': 'Napsauta näkymää sijoittaaksesi lohkon. Lohkot napsahtavat automaattisesti ruudukkoon ja toisiinsa.',
      'tutorial.navigate.title': 'Kameran navigointi',
      'tutorial.navigate.desc': 'Pyöritä: pidä vasen painike pohjassa ja vedä. Siirrä: pidä oikea painike pohjassa ja vedä. Zoomaa: käytä hiiren rullaa.',
      'tutorial.delete.title': 'Poista lohkoja',
      'tutorial.delete.desc': 'Napsauta hiiren oikealla lohkoa poistaaksesi sen. Voit myös käyttää Ctrl+Z peruuttaaksesi viimeisen toiminnon.',
      'tutorial.editor.title': 'Tahkoeditori',
      'tutorial.editor.desc': 'Paina Tab tai hiiren keskipainiketta lohkon päällä avataksesi tahkoeditorin. Kokeile nyt!',
      'tutorial.editorSelectFace.title': 'Valitse tahko',
      'tutorial.editorSelectFace.desc': 'Klikkaa lohkon tahkoa, jonka haluat korvata tai maalata.',
      'tutorial.editorFaceType.title': 'Valitse korvaus',
      'tutorial.editorFaceType.desc': 'Valitse koriste-elementti korvaamaan valittu tahko.',
      'tutorial.editorColor.title': 'Valitse väri',
      'tutorial.editorColor.desc': 'Valinnaisesti valitse väri tahkolle. Klikkaa mitä tahansa väriä.',
      'tutorial.editorApply.title': 'Käytä muutokset',
      'tutorial.editorApply.desc': 'Klikkaa tätä painiketta soveltaaksesi korvauksen. Paina Tab tai Escape sulkeaksesi editorin.',
      'tutorial.undoredo.title': 'Kumoa ja Tee uudelleen',
      'tutorial.undoredo.desc': 'Teitkö virheen? Käytä näitä painikkeita tai Ctrl+Z kumotaksesi, Ctrl+Y tehdäksesi uudelleen. Roskakorikuvake tyhjentää koko näkymän.',
      'tutorial.saveload.title': 'Tallenna ja Lataa',
      'tutorial.saveload.desc': 'Tallenna projektisi tiedostoon Tallenna-painikkeella. Lataa aiemmin tallennettuja projekteja Lataa-painikkeella.',
      'tutorial.continue.title': 'Tallenna tilille',
      'tutorial.continue.desc': 'Klikkaa Jatka tallentaaksesi projektisi henkilökohtaiselle tilillesi. Siellä voit ostaa sen tai jatkaa muokkausta myöhemmin.',
      'tutorial.finish.title': 'Olet valmis!',
      'tutorial.finish.desc': 'Hienoa työtä! Tunnet nyt perusasiat. Aloita rakentaminen! Voit aina käynnistää tämän ohjeen uudelleen Ohje-painikkeesta.',
      'tutorial.btn.next': 'Seuraava',
      'tutorial.btn.prev': 'Takaisin',
      'tutorial.btn.done': 'Valmis!',
      'tutorial.btn.start': 'Aloita opas'
    },

    // =========================================================================
    // SWEDISH (SV)
    // =========================================================================
    sv: {
      // General
      'app.title': '3D-byggare',
      'loader.loading': 'Laddar...',

      // Help Modal
      'help.title': 'Snabbstart',
      'help.navigation': 'Navigation',
      'help.controls': 'Kontroller',
      'help.btn': 'Hjälp',
      'help.start': 'Starta',
      'help.tutorial': 'Starta handledning',
      'help.close': 'Stäng',

      // Navigation Instructions
      'help.lmb.rotate': 'Håll vänster mus \u2014 rotera',
      'help.rmb.pan': 'Håll höger mus \u2014 panorera',
      'help.wheel.zoom': 'Mushjul \u2014 zooma',
      'help.lmb.add': 'Lägg till Cubik',
      'help.rmb.delete': 'Ta bort Cubik',
      'help.tab.replace': 'Ersätt/måla ytor',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Ångra / Gör om',
      'help.copy': 'Kopiera Cubik',
      'help.orbit': 'Kretsa kamera runt pivot',
      'help.move': 'Flytta upp/ner',

      // HUD (Top Bar)
      'hud.load': 'Ladda',
      'hud.save': 'Spara',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Klicka för att exportera statistik',

      // Navigation (Side Menu)
      'nav.home': 'Hem',
      'nav.shop': 'Butik',
      'nav.about': 'Om oss',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galleri',
      'nav.video': 'Video',
      'nav.blog': 'Blogg',
      'nav.partnership': 'Partnerskap',
      'nav.contacts': 'Kontakt',

      // Block Editor
      'editor.title': 'Blockredigerare',
      'editor.hint': 'Välj ytor att ersätta, välj en färg från paletten, välj ersättningstyp \u2014 sedan tillämpa.',
      'editor.preview': 'Cubik-förhandsgranskning',
      'editor.noSelection': 'Ingen cubik vald',
      'editor.replace': 'Ersätt ytor',

      // Export / Import
      'export.scene': 'Exportera scen',
      'export.stats': 'Exportera statistik',

      // Projects
      'project.save': 'Spara projekt',
      'project.load': 'Ladda projekt',
      'project.name': 'Projektnamn',
      'project.cancel': 'Avbryt',
      'project.saveBtn': 'Spara',
      'project.modalTitle': 'Spara projekt',

      // Statistics
      'stats.blocks': 'Block',
      'stats.facets': 'Ytor',

      // Status Messages
      'status.ready': 'Redo.',
      'status.loading': 'Laddar...',
      'status.saved': 'Sparat!',
      'status.error': 'Fel',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Minimera',
      'facetStats.expand': 'Expandera',

      // Shop Integration
      'shop.sending': 'Skickar till butiken...',
      'shop.sent': 'Skickat till butiken',
      'shop.sentNoUrl': 'Skickat till butiken (men ingen URL mottagen)',
      'shop.errorMissing': 'Kan inte skicka till butiken: produkt-ID hittades inte för vissa ytor. Se konsolen.',
      'shop.error': 'Butiks-API-fel',
      'shop.signIn': 'Logga in',
      'shop.close': 'Stäng',
      'shop.pleaseWait': 'Vänta, detta kan ta några sekunder',

      // Context menu (long-press on cube)
      'context.edit': 'Redigera',
      'context.delete': 'Ta bort kub',
      'panel.toggleMenu': 'Fäll ihop / expandera meny',
      'editor.collapsePanel': 'Fäll ihop panel',

      // Additional UI
      'help.closeEditor': 'Stäng editor / overlay',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Uppskattat pris',
      'hud.loadTitle': 'Ladda projekt',
      'hud.saveTitle': 'Spara projekt',
      'continue.btn': 'Fortsätt',
      'continue.title': 'Spara till konto / Fortsätt till butik',
      'toolbar.clear': 'Rensa scen',
      'toolbar.undo': 'Ångra (Ctrl+Z)',
      'toolbar.redo': 'Gör om (Ctrl+Y)',
      'toolbar.replayBuild': 'Spela upp bygge',
      'toolbar.recordTimelapse': 'Spela in timelapse-video',
      'help.titleAttr': 'Hjälp / Snabbstart',
      'export.statsTitle': 'Exportera statistik till .txt',
      'project.saveTitle': 'Spara projekt som JSON',
      'project.loadTitle': 'Ladda projekt från JSON',
      'nav.open': 'Öppna navigation',
      'panel.addCubik': 'Lägg till cubik',
      'panel.deleteCubik': 'Ta bort cubik',

      // AI Constructor
      'ai.title': 'AI-konstruktor',
      'ai.editor': 'AI-redigerare',
      'ai.ready': 'Klar',
      'ai.mode.fast': 'Snabb',
      'ai.mode.creative': 'Kreativ',
      'ai.addMode': 'Lägg till i scen (annars \u2014 ersätt)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Beskriv vad som ska byggas, t.ex. "Grönt hus med rött tak" eller "Robot"',
      'ai.blocks': 'block',
      'ai.placeholder': 'Vad ska jag bygga?...',
      'ai.send': 'Skicka',
      'ai.voiceInput': 'Röstinmatning',
      'ai.generating': 'Genererar...',
      'ai.listening': 'Lyssnar...',
      'ai.doneBlocks': 'Klart! {n} block byggda',
      'ai.blocksCount': '{n} block',

      // Tutorial Tour
      'tutorial.welcome.title': 'Välkommen till Cubik Builder!',
      'tutorial.welcome.desc': 'Denna interaktiva guide hjälper dig att skapa fantastiska 3D-modeller. Låt oss börja!',
      'tutorial.gallery.title': 'Blockgalleri',
      'tutorial.gallery.desc': 'Välj vilken typ av block du vill placera. Det finns 4 typer: Void, Zen, Bion och Zen/2. Klicka på ett block för att välja det.',
      'tutorial.palette.title': 'Färgpalett',
      'tutorial.palette.desc': 'Välj en färg för ditt block. Klicka på en färgpunkt för att välja den. Den valda färgen tillämpas på nya block.',
      'tutorial.place.title': 'Placera block',
      'tutorial.place.desc': 'Klicka på scenen för att placera ett block. Block fästs automatiskt i rutnätet och mot varandra.',
      'tutorial.navigate.title': 'Kameranavigering',
      'tutorial.navigate.desc': 'Rotera: håll vänster musknapp och dra. Panorera: håll höger musknapp och dra. Zooma: använd mushjulet.',
      'tutorial.delete.title': 'Ta bort block',
      'tutorial.delete.desc': 'Högerklicka på ett block för att ta bort det. Du kan också använda Ctrl+Z för att ångra din senaste åtgärd.',
      'tutorial.editor.title': 'Ytredigerare',
      'tutorial.editor.desc': 'Tryck på Tab eller mittenmusknappen på ett block för att öppna ytredigeraren. Prova nu!',
      'tutorial.editorSelectFace.title': 'Välj yta',
      'tutorial.editorSelectFace.desc': 'Klicka på en yta på blocket som du vill ersätta eller måla.',
      'tutorial.editorFaceType.title': 'Välj ersättning',
      'tutorial.editorFaceType.desc': 'Välj ett dekorativt element för att ersätta den valda ytan.',
      'tutorial.editorColor.title': 'Välj färg',
      'tutorial.editorColor.desc': 'Valfritt: välj en färg för ytan. Klicka på valfri färg.',
      'tutorial.editorApply.title': 'Tillämpa ändringar',
      'tutorial.editorApply.desc': 'Klicka på denna knapp för att tillämpa ersättningen. Tryck Tab eller Escape för att stänga redigeraren.',
      'tutorial.undoredo.title': 'Ångra och Gör om',
      'tutorial.undoredo.desc': 'Gjorde du ett misstag? Använd dessa knappar eller Ctrl+Z för att ångra, Ctrl+Y för att göra om. Papperskorgikonen rensar hela scenen.',
      'tutorial.saveload.title': 'Spara och Ladda',
      'tutorial.saveload.desc': 'Spara ditt projekt till en fil med Spara-knappen. Ladda tidigare sparade projekt med Ladda-knappen.',
      'tutorial.continue.title': 'Spara till konto',
      'tutorial.continue.desc': 'Klicka på Fortsätt för att spara ditt projekt till ditt personliga konto. Där kan du köpa det eller fortsätta redigera senare.',
      'tutorial.finish.title': 'Du är redo!',
      'tutorial.finish.desc': 'Bra jobbat! Nu kan du grunderna. Börja bygga! Du kan alltid starta om denna guide från Hjälp-knappen.',
      'tutorial.btn.next': 'Nästa',
      'tutorial.btn.prev': 'Tillbaka',
      'tutorial.btn.done': 'Klar!',
      'tutorial.btn.start': 'Starta guide'
    },

    // =========================================================================
    // DANISH (DA)
    // =========================================================================
    da: {
      // General
      'app.title': '3D-bygger',
      'loader.loading': 'Indlæser...',

      // Help Modal
      'help.title': 'Hurtigstart',
      'help.navigation': 'Navigation',
      'help.controls': 'Kontroller',
      'help.btn': 'Hjælp',
      'help.start': 'Start',
      'help.tutorial': 'Start vejledning',
      'help.close': 'Luk',

      // Navigation Instructions
      'help.lmb.rotate': 'Hold venstre mus \u2014 roter',
      'help.rmb.pan': 'Hold højre mus \u2014 panorer',
      'help.wheel.zoom': 'Musehjul \u2014 zoom',
      'help.lmb.add': 'Tilføj Cubik',
      'help.rmb.delete': 'Slet Cubik',
      'help.tab.replace': 'Erstat/mal facetter',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Fortryd / Gentag',
      'help.copy': 'Kopier Cubik',
      'help.orbit': 'Roter kamera om pivot',
      'help.move': 'Flyt op/ned',

      // HUD (Top Bar)
      'hud.load': 'Indlæs',
      'hud.save': 'Gem',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Klik for at eksportere statistik',

      // Navigation (Side Menu)
      'nav.home': 'Hjem',
      'nav.shop': 'Butik',
      'nav.about': 'Om os',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galleri',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partnerskab',
      'nav.contacts': 'Kontakt',

      // Block Editor
      'editor.title': 'Blok-editor',
      'editor.hint': 'Vælg de facetter du vil erstatte, vælg en farve fra paletten, vælg erstatningstype \u2014 og anvend.',
      'editor.preview': 'Cubik-forhåndsvisning',
      'editor.noSelection': 'Ingen cubik valgt',
      'editor.replace': 'Erstat facetter',

      // Export / Import
      'export.scene': 'Eksporter scene',
      'export.stats': 'Eksporter statistik',

      // Projects
      'project.save': 'Gem projekt',
      'project.load': 'Indlæs projekt',
      'project.name': 'Projektnavn',
      'project.cancel': 'Annuller',
      'project.saveBtn': 'Gem',
      'project.modalTitle': 'Gem projekt',

      // Statistics
      'stats.blocks': 'Blokke',
      'stats.facets': 'Facetter',

      // Status Messages
      'status.ready': 'Klar.',
      'status.loading': 'Indlæser...',
      'status.saved': 'Gemt!',
      'status.error': 'Fejl',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Minimer',
      'facetStats.expand': 'Udvid',

      // Shop Integration
      'shop.sending': 'Sender til butikken...',
      'shop.sent': 'Sendt til butikken',
      'shop.sentNoUrl': 'Sendt til butikken (men ingen URL modtaget)',
      'shop.errorMissing': 'Kan ikke sende til butikken: produkt-ID ikke fundet for nogle facetter. Se konsol.',
      'shop.error': 'Butiks-API-fejl',
      'shop.signIn': 'Log ind',
      'shop.close': 'Luk',
      'shop.pleaseWait': 'Vent venligst, dette kan tage et par sekunder',

      // Context menu (long-press on cube)
      'context.edit': 'Rediger',
      'context.delete': 'Slet terning',
      'panel.toggleMenu': 'Skjul / vis menu',
      'editor.collapsePanel': 'Skjul panel',

      // Additional UI
      'help.closeEditor': 'Luk editor / overlays',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Estimeret pris',
      'hud.loadTitle': 'Indlæs projekt',
      'hud.saveTitle': 'Gem projekt',
      'continue.btn': 'Fortsæt',
      'continue.title': 'Gem til konto / Fortsæt til butik',
      'toolbar.clear': 'Ryd scene',
      'toolbar.undo': 'Fortryd (Ctrl+Z)',
      'toolbar.redo': 'Gør om (Ctrl+Y)',
      'toolbar.replayBuild': 'Afspil bygning',
      'toolbar.recordTimelapse': 'Optag timelapse-video',
      'help.titleAttr': 'Hjælp / Hurtig start',
      'export.statsTitle': 'Eksportér statistik til .txt',
      'project.saveTitle': 'Gem projekt som JSON',
      'project.loadTitle': 'Indlæs projekt fra JSON',
      'nav.open': 'Åbn navigation',
      'panel.addCubik': 'Tilføj cubik',
      'panel.deleteCubik': 'Slet cubik',

      // AI Constructor
      'ai.title': 'AI-konstruktør',
      'ai.editor': 'AI-editor',
      'ai.ready': 'Klar',
      'ai.mode.fast': 'Hurtig',
      'ai.mode.creative': 'Kreativ',
      'ai.addMode': 'Tilføj til scene (ellers \u2014 erstat)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Beskriv hvad der skal bygges, f.eks. "Grønt hus med rødt tag" eller "Robot"',
      'ai.blocks': 'blokke',
      'ai.placeholder': 'Hvad skal jeg bygge?...',
      'ai.send': 'Send',
      'ai.voiceInput': 'Stemmeindtastning',
      'ai.generating': 'Genererer...',
      'ai.listening': 'Lytter...',
      'ai.doneBlocks': 'Færdig! {n} blokke bygget',
      'ai.blocksCount': '{n} blokke',

      // Tutorial Tour
      'tutorial.welcome.title': 'Velkommen til Cubik Builder!',
      'tutorial.welcome.desc': 'Denne interaktive guide hjælper dig med at skabe fantastiske 3D-modeller. Lad os komme i gang!',
      'tutorial.gallery.title': 'Blokgalleri',
      'tutorial.gallery.desc': 'Vælg den type blok, du vil placere. Der er 4 typer: Void, Zen, Bion og Zen/2. Klik på en blok for at vælge den.',
      'tutorial.palette.title': 'Farvepalet',
      'tutorial.palette.desc': 'Vælg en farve til din blok. Klik på en farveprik for at vælge den. Den valgte farve anvendes på nye blokke.',
      'tutorial.place.title': 'Placer blokke',
      'tutorial.place.desc': 'Klik på scenen for at placere en blok. Blokke fastgøres automatisk til gitteret og til hinanden.',
      'tutorial.navigate.title': 'Kameranavigation',
      'tutorial.navigate.desc': 'Roter: hold venstre museknap nede og træk. Panorer: hold højre museknap nede og træk. Zoom: brug musehjulet.',
      'tutorial.delete.title': 'Slet blokke',
      'tutorial.delete.desc': 'Højreklik på en blok for at slette den. Du kan også bruge Ctrl+Z til at fortryde din sidste handling.',
      'tutorial.editor.title': 'Faceteditor',
      'tutorial.editor.desc': 'Tryk på Tab eller midterste museknap på en blok for at åbne faceteditoren. Prøv det nu!',
      'tutorial.editorSelectFace.title': 'Vælg facet',
      'tutorial.editorSelectFace.desc': 'Klik på en facet på blokken, som du vil erstatte eller male.',
      'tutorial.editorFaceType.title': 'Vælg erstatning',
      'tutorial.editorFaceType.desc': 'Vælg et dekorativt element til at erstatte den valgte facet.',
      'tutorial.editorColor.title': 'Vælg farve',
      'tutorial.editorColor.desc': 'Valgfrit: vælg en farve til facetten. Klik på en farve.',
      'tutorial.editorApply.title': 'Anvend ændringer',
      'tutorial.editorApply.desc': 'Klik på denne knap for at anvende erstatningen. Tryk Tab eller Escape for at lukke editoren.',
      'tutorial.undoredo.title': 'Fortryd og Gentag',
      'tutorial.undoredo.desc': 'Lavede du en fejl? Brug disse knapper eller Ctrl+Z for at fortryde, Ctrl+Y for at gentage. Papirkurvsikonet rydder hele scenen.',
      'tutorial.saveload.title': 'Gem og Indlæs',
      'tutorial.saveload.desc': 'Gem dit projekt til en fil med Gem-knappen. Indlæs tidligere gemte projekter med Indlæs-knappen.',
      'tutorial.continue.title': 'Gem til konto',
      'tutorial.continue.desc': 'Klik på Fortsæt for at gemme dit projekt til din personlige konto. Der kan du købe det eller fortsætte med at redigere senere.',
      'tutorial.finish.title': 'Du er klar!',
      'tutorial.finish.desc': 'Godt arbejde! Nu kender du det grundlæggende. Begynd at bygge! Du kan altid genstarte denne guide fra Hjælp-knappen.',
      'tutorial.btn.next': 'Næste',
      'tutorial.btn.prev': 'Tilbage',
      'tutorial.btn.done': 'Færdig!',
      'tutorial.btn.start': 'Start guide'
    },

    // =========================================================================
    // CZECH (CS)
    // =========================================================================
    cs: {
      // General
      'app.title': '3D stavitel',
      'loader.loading': 'Načítání...',

      // Help Modal
      'help.title': 'Rychlý start',
      'help.navigation': 'Navigace',
      'help.controls': 'Ovládání',
      'help.btn': 'Nápověda',
      'help.start': 'Start',
      'help.tutorial': 'Spustit výuku',
      'help.close': 'Zavřít',

      // Navigation Instructions
      'help.lmb.rotate': 'Držet levé tl. \u2014 otáčet',
      'help.rmb.pan': 'Držet pravé tl. \u2014 posouvat',
      'help.wheel.zoom': 'Kolečko myši \u2014 zoom',
      'help.lmb.add': 'Přidat Cubik',
      'help.rmb.delete': 'Smazat Cubik',
      'help.tab.replace': 'Nahradit/přebarvit plochy',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Zpět / Znovu',
      'help.copy': 'Kopírovat Cubik',
      'help.orbit': 'Otáčet kameru kolem osy',
      'help.move': 'Posun nahoru/dolů',

      // HUD (Top Bar)
      'hud.load': 'Načíst',
      'hud.save': 'Uložit',
      'hud.cubiks': 'Cubiky',
      'hud.cubiksLabel': 'Klikněte pro export statistik',

      // Navigation (Side Menu)
      'nav.home': 'Domů',
      'nav.shop': 'Obchod',
      'nav.about': 'O nás',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galerie',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Partnerství',
      'nav.contacts': 'Kontakty',

      // Block Editor
      'editor.title': 'Editor bloků',
      'editor.hint': 'Vyberte plochy k nahrazení, vyberte barvu z palety, zvolte typ náhrady \u2014 a aplikujte.',
      'editor.preview': 'Náhled cubiku',
      'editor.noSelection': 'Žádný cubik nevybrán',
      'editor.replace': 'Nahradit plochy',

      // Export / Import
      'export.scene': 'Exportovat scénu',
      'export.stats': 'Exportovat statistiky',

      // Projects
      'project.save': 'Uložit projekt',
      'project.load': 'Načíst projekt',
      'project.name': 'Název projektu',
      'project.cancel': 'Zrušit',
      'project.saveBtn': 'Uložit',
      'project.modalTitle': 'Uložit projekt',

      // Statistics
      'stats.blocks': 'Bloky',
      'stats.facets': 'Plochy',

      // Status Messages
      'status.ready': 'Připraveno.',
      'status.loading': 'Načítání...',
      'status.saved': 'Uloženo!',
      'status.error': 'Chyba',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Sbalit',
      'facetStats.expand': 'Rozbalit',

      // Shop Integration
      'shop.sending': 'Odesílání do obchodu...',
      'shop.sent': 'Odesláno do obchodu',
      'shop.sentNoUrl': 'Odesláno do obchodu (ale URL nebyla přijata)',
      'shop.errorMissing': 'Nelze odeslat do obchodu: ID produktu nebylo nalezeno pro některé plochy. Viz konzole.',
      'shop.error': 'Chyba API obchodu',
      'shop.signIn': 'Přihlásit se',
      'shop.close': 'Zavřít',
      'shop.pleaseWait': 'Prosím čekejte, může to trvat několik sekund',

      // Context menu (long-press on cube)
      'context.edit': 'Upravit',
      'context.delete': 'Smazat kostku',
      'panel.toggleMenu': 'Sbalit / rozbalit menu',
      'editor.collapsePanel': 'Sbalit panel',

      // Additional UI
      'help.closeEditor': 'Zavřít editor / přehledy',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Odhadovaná cena',
      'hud.loadTitle': 'Načíst projekt',
      'hud.saveTitle': 'Uložit projekt',
      'continue.btn': 'Pokračovat',
      'continue.title': 'Uložit do účtu / Pokračovat do obchodu',
      'toolbar.clear': 'Vymazat scénu',
      'toolbar.undo': 'Zpět (Ctrl+Z)',
      'toolbar.redo': 'Znovu (Ctrl+Y)',
      'toolbar.replayBuild': 'Přehrát sestavení',
      'toolbar.recordTimelapse': 'Nahrát timelapse video',
      'help.titleAttr': 'Nápověda / Rychlý start',
      'export.statsTitle': 'Exportovat statistiku do .txt',
      'project.saveTitle': 'Uložit projekt jako JSON',
      'project.loadTitle': 'Načíst projekt z JSON',
      'nav.open': 'Otevřít navigaci',
      'panel.addCubik': 'Přidat cubik',
      'panel.deleteCubik': 'Smazat cubik',

      // AI Constructor
      'ai.title': 'AI konstruktor',
      'ai.editor': 'AI editor',
      'ai.ready': 'Připraveno',
      'ai.mode.fast': 'Rychlý',
      'ai.mode.creative': 'Kreativní',
      'ai.addMode': 'Přidat do scény (jinak \u2014 nahradit)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Popište co postavit, např. "Zelený dům s červenou střechou" nebo "Robot"',
      'ai.blocks': 'bloky',
      'ai.placeholder': 'Co mám postavit?...',
      'ai.send': 'Odeslat',
      'ai.voiceInput': 'Hlasový vstup',
      'ai.generating': 'Generování...',
      'ai.listening': 'Poslouchám...',
      'ai.doneBlocks': 'Hotovo! {n} bloků postaveno',
      'ai.blocksCount': '{n} bloků',

      // Tutorial Tour
      'tutorial.welcome.title': 'Vítejte v Cubik Builderu!',
      'tutorial.welcome.desc': 'Tento interaktivní průvodce vám pomůže vytvořit úžasné 3D modely. Pojďme začít!',
      'tutorial.gallery.title': 'Galerie bloků',
      'tutorial.gallery.desc': 'Vyberte typ bloku, který chcete umístit. Existují 4 typy: Void, Zen, Bion a Zen/2. Klikněte na blok pro jeho výběr.',
      'tutorial.palette.title': 'Paleta barev',
      'tutorial.palette.desc': 'Vyberte barvu pro váš blok. Klikněte na barevný bod pro jeho výběr. Vybraná barva bude aplikována na nové bloky.',
      'tutorial.place.title': 'Umístit bloky',
      'tutorial.place.desc': 'Klikněte na scénu pro umístění bloku. Bloky se automaticky přichytávají k mřížce a k sobě navzájem.',
      'tutorial.navigate.title': 'Navigace kamery',
      'tutorial.navigate.desc': 'Otáčení: držte levé tlačítko myši a táhněte. Posun: držte pravé tlačítko myši a táhněte. Zoom: použijte kolečko myši.',
      'tutorial.delete.title': 'Smazat bloky',
      'tutorial.delete.desc': 'Klikněte pravým tlačítkem na blok pro jeho smazání. Můžete také použít Ctrl+Z pro vrácení poslední akce.',
      'tutorial.editor.title': 'Editor ploch',
      'tutorial.editor.desc': 'Stiskněte Tab nebo prostřední tlačítko myši na bloku pro otevření editoru ploch. Vyzkoušejte to nyní!',
      'tutorial.editorSelectFace.title': 'Vybrat plochu',
      'tutorial.editorSelectFace.desc': 'Klikněte na plochu bloku, kterou chcete nahradit nebo natřít.',
      'tutorial.editorFaceType.title': 'Zvolit náhradu',
      'tutorial.editorFaceType.desc': 'Vyberte dekorativní prvek pro nahrazení zvolené plochy.',
      'tutorial.editorColor.title': 'Zvolit barvu',
      'tutorial.editorColor.desc': 'Volitelně vyberte barvu pro plochu. Klikněte na libovolnou barvu.',
      'tutorial.editorApply.title': 'Použít změny',
      'tutorial.editorApply.desc': 'Klikněte na toto tlačítko pro aplikování náhrady. Stiskněte Tab nebo Escape pro zavření editoru.',
      'tutorial.undoredo.title': 'Zpět a Znovu',
      'tutorial.undoredo.desc': 'Udělali jste chybu? Použijte tato tlačítka nebo Ctrl+Z pro vrácení, Ctrl+Y pro opakování. Ikona koše vymaže celou scénu.',
      'tutorial.saveload.title': 'Uložit a Načíst',
      'tutorial.saveload.desc': 'Uložte svůj projekt do souboru pomocí tlačítka Uložit. Načtěte dříve uložené projekty tlačítkem Načíst.',
      'tutorial.continue.title': 'Uložit do účtu',
      'tutorial.continue.desc': 'Klikněte na Pokračovat pro uložení projektu do vašeho osobního účtu. Tam ho můžete zakoupit nebo pokračovat v úpravách později.',
      'tutorial.finish.title': 'Jste připraveni!',
      'tutorial.finish.desc': 'Skvělá práce! Nyní znáte základy. Začněte tvořit! Tento průvodce můžete kdykoli spustit znovu z tlačítka Nápověda.',
      'tutorial.btn.next': 'Další',
      'tutorial.btn.prev': 'Zpět',
      'tutorial.btn.done': 'Hotovo!',
      'tutorial.btn.start': 'Spustit průvodce'
    },

    // =========================================================================
    // POLISH (PL)
    // =========================================================================
    pl: {
      // General
      'app.title': 'Kreator 3D',
      'loader.loading': 'Ładowanie...',

      // Help Modal
      'help.title': 'Szybki start',
      'help.navigation': 'Nawigacja',
      'help.controls': 'Sterowanie',
      'help.btn': 'Pomoc',
      'help.start': 'Start',
      'help.tutorial': 'Rozpocznij samouczek',
      'help.close': 'Zamknij',

      // Navigation Instructions
      'help.lmb.rotate': 'Przytrzymaj LPM \u2014 obróć',
      'help.rmb.pan': 'Przytrzymaj PPM \u2014 przesuń',
      'help.wheel.zoom': 'Kółko myszy \u2014 zoom',
      'help.lmb.add': 'Dodaj Cubik',
      'help.rmb.delete': 'Usuń Cubik',
      'help.tab.replace': 'Zamień/pomaluj ściany',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Cofnij / Ponów',
      'help.copy': 'Kopiuj Cubik',
      'help.orbit': 'Obracaj kamerę wokół osi',
      'help.move': 'Ruch w górę/w dół',

      // HUD (Top Bar)
      'hud.load': 'Wczytaj',
      'hud.save': 'Zapisz',
      'hud.cubiks': 'Cubiki',
      'hud.cubiksLabel': 'Kliknij, aby wyeksportować statystyki',

      // Navigation (Side Menu)
      'nav.home': 'Strona główna',
      'nav.shop': 'Sklep',
      'nav.about': 'O nas',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galeria',
      'nav.video': 'Wideo',
      'nav.blog': 'Blog',
      'nav.partnership': 'Współpraca',
      'nav.contacts': 'Kontakt',

      // Block Editor
      'editor.title': 'Edytor bloków',
      'editor.hint': 'Wybierz ściany do zamiany, wybierz kolor z palety, wybierz typ zamiany \u2014 i zastosuj.',
      'editor.preview': 'Podgląd cubika',
      'editor.noSelection': 'Nie wybrano cubika',
      'editor.replace': 'Zamień ściany',

      // Export / Import
      'export.scene': 'Eksportuj scenę',
      'export.stats': 'Eksportuj statystyki',

      // Projects
      'project.save': 'Zapisz projekt',
      'project.load': 'Wczytaj projekt',
      'project.name': 'Nazwa projektu',
      'project.cancel': 'Anuluj',
      'project.saveBtn': 'Zapisz',
      'project.modalTitle': 'Zapisz projekt',

      // Statistics
      'stats.blocks': 'Bloki',
      'stats.facets': 'Ściany',

      // Status Messages
      'status.ready': 'Gotowy.',
      'status.loading': 'Ładowanie...',
      'status.saved': 'Zapisano!',
      'status.error': 'Błąd',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Zwiń',
      'facetStats.expand': 'Rozwiń',

      // Shop Integration
      'shop.sending': 'Wysyłanie do sklepu...',
      'shop.sent': 'Wysłano do sklepu',
      'shop.sentNoUrl': 'Wysłano do sklepu (ale nie otrzymano URL)',
      'shop.errorMissing': 'Nie można wysłać do sklepu: nie znaleziono ID produktu dla niektórych ścian. Zobacz konsolę.',
      'shop.error': 'Błąd API sklepu',
      'shop.signIn': 'Zaloguj się',
      'shop.close': 'Zamknij',
      'shop.pleaseWait': 'Proszę czekać, to może potrwać kilka sekund',

      // Context menu (long-press on cube)
      'context.edit': 'Edytuj',
      'context.delete': 'Usuń kostkę',
      'panel.toggleMenu': 'Zwiń / rozwiń menu',
      'editor.collapsePanel': 'Zwiń panel',

      // Additional UI
      'help.closeEditor': 'Zamknij edytor / nakładki',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Szacowana cena',
      'hud.loadTitle': 'Załaduj projekt',
      'hud.saveTitle': 'Zapisz projekt',
      'continue.btn': 'Kontynuuj',
      'continue.title': 'Zapisz na konto / Przejdź do sklepu',
      'toolbar.clear': 'Wyczyść scenę',
      'toolbar.undo': 'Cofnij (Ctrl+Z)',
      'toolbar.redo': 'Powtórz (Ctrl+Y)',
      'toolbar.replayBuild': 'Odtwórz budowę',
      'toolbar.recordTimelapse': 'Nagraj wideo timelapse',
      'help.titleAttr': 'Pomoc / Szybki start',
      'export.statsTitle': 'Eksportuj statystyki do .txt',
      'project.saveTitle': 'Zapisz projekt jako JSON',
      'project.loadTitle': 'Załaduj projekt z JSON',
      'nav.open': 'Otwórz nawigację',
      'panel.addCubik': 'Dodaj cubik',
      'panel.deleteCubik': 'Usuń cubik',

      // AI Constructor
      'ai.title': 'Konstruktor AI',
      'ai.editor': 'Edytor AI',
      'ai.ready': 'Gotowe',
      'ai.mode.fast': 'Szybki',
      'ai.mode.creative': 'Kreatywny',
      'ai.addMode': 'Dodaj do sceny (w przeciwnym razie \u2014 zamień)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Opisz co zbudować, np. "Zielony dom z czerwonym dachem" lub "Robot"',
      'ai.blocks': 'bloki',
      'ai.placeholder': 'Co mam zbudować?...',
      'ai.send': 'Wyślij',
      'ai.voiceInput': 'Wprowadzanie głosowe',
      'ai.generating': 'Generowanie...',
      'ai.listening': 'Słucham...',
      'ai.doneBlocks': 'Gotowe! Zbudowano {n} bloków',
      'ai.blocksCount': '{n} bloków',

      // Tutorial Tour
      'tutorial.welcome.title': 'Witaj w Cubik Builder!',
      'tutorial.welcome.desc': 'Ten interaktywny przewodnik pomoże ci tworzyć niesamowite modele 3D. Zaczynajmy!',
      'tutorial.gallery.title': 'Galeria bloków',
      'tutorial.gallery.desc': 'Wybierz typ bloku, który chcesz umieścić. Są 4 typy: Void, Zen, Bion i Zen/2. Kliknij blok, aby go wybrać.',
      'tutorial.palette.title': 'Paleta kolorów',
      'tutorial.palette.desc': 'Wybierz kolor dla swojego bloku. Kliknij punkt koloru, aby go wybrać. Wybrany kolor zostanie zastosowany do nowych bloków.',
      'tutorial.place.title': 'Umieść bloki',
      'tutorial.place.desc': 'Kliknij na scenę, aby umieścić blok. Bloki automatycznie przyciągają się do siatki i do siebie nawzajem.',
      'tutorial.navigate.title': 'Nawigacja kamerą',
      'tutorial.navigate.desc': 'Obracanie: przytrzymaj lewy przycisk myszy i przeciągnij. Przesuwanie: przytrzymaj prawy przycisk myszy i przeciągnij. Zoom: użyj kółka myszy.',
      'tutorial.delete.title': 'Usuń bloki',
      'tutorial.delete.desc': 'Kliknij prawym przyciskiem na blok, aby go usunąć. Możesz też użyć Ctrl+Z, aby cofnąć ostatnią akcję.',
      'tutorial.editor.title': 'Edytor ścian',
      'tutorial.editor.desc': 'Naciśnij Tab lub środkowy przycisk myszy na bloku, aby otworzyć edytor ścian. Wypróbuj teraz!',
      'tutorial.editorSelectFace.title': 'Wybierz ścianę',
      'tutorial.editorSelectFace.desc': 'Kliknij na ścianę bloku, którą chcesz wymienić lub pomalować.',
      'tutorial.editorFaceType.title': 'Wybierz zamiennik',
      'tutorial.editorFaceType.desc': 'Wybierz element dekoracyjny, aby zastąpić wybraną ścianę.',
      'tutorial.editorColor.title': 'Wybierz kolor',
      'tutorial.editorColor.desc': 'Opcjonalnie wybierz kolor dla ściany. Kliknij na dowolny kolor.',
      'tutorial.editorApply.title': 'Zastosuj zmiany',
      'tutorial.editorApply.desc': 'Kliknij ten przycisk, aby zastosować zamianę. Naciśnij Tab lub Escape, aby zamknąć edytor.',
      'tutorial.undoredo.title': 'Cofnij i Ponów',
      'tutorial.undoredo.desc': 'Popełniłeś błąd? Użyj tych przycisków lub Ctrl+Z, aby cofnąć, Ctrl+Y, aby ponowić. Ikona kosza czyści całą scenę.',
      'tutorial.saveload.title': 'Zapisz i Wczytaj',
      'tutorial.saveload.desc': 'Zapisz projekt do pliku przyciskiem Zapisz. Wczytaj wcześniej zapisane projekty przyciskiem Wczytaj.',
      'tutorial.continue.title': 'Zapisz na koncie',
      'tutorial.continue.desc': 'Kliknij Kontynuuj, aby zapisać projekt na swoim koncie osobistym. Tam możesz go kupić lub kontynuować edycję później.',
      'tutorial.finish.title': 'Jesteś gotowy!',
      'tutorial.finish.desc': 'Świetna robota! Znasz już podstawy. Zacznij budować! Zawsze możesz uruchomić ten przewodnik ponownie z przycisku Pomoc.',
      'tutorial.btn.next': 'Dalej',
      'tutorial.btn.prev': 'Wstecz',
      'tutorial.btn.done': 'Gotowe!',
      'tutorial.btn.start': 'Rozpocznij przewodnik'
    },

    // =========================================================================
    // ROMANIAN (RO)
    // =========================================================================
    ro: {
      // General
      'app.title': 'Constructor 3D',
      'loader.loading': 'Se încarcă...',

      // Help Modal
      'help.title': 'Start rapid',
      'help.navigation': 'Navigare',
      'help.controls': 'Controale',
      'help.btn': 'Ajutor',
      'help.start': 'Start',
      'help.tutorial': 'Începe tutorialul',
      'help.close': 'Închide',

      // Navigation Instructions
      'help.lmb.rotate': 'Ține apăsat stânga \u2014 rotește',
      'help.rmb.pan': 'Ține apăsat dreapta \u2014 deplasează',
      'help.wheel.zoom': 'Rotița mouse \u2014 zoom',
      'help.lmb.add': 'Adaugă Cubik',
      'help.rmb.delete': 'Șterge Cubik',
      'help.tab.replace': 'Înlocuiește/colorează fețe',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Anulează / Refă',
      'help.copy': 'Copiază Cubik',
      'help.orbit': 'Orbită cameră în jurul pivotului',
      'help.move': 'Mișcă sus/jos',

      // HUD (Top Bar)
      'hud.load': 'Încarcă',
      'hud.save': 'Salvează',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Click pentru export statistici',

      // Navigation (Side Menu)
      'nav.home': 'Acasă',
      'nav.shop': 'Magazin',
      'nav.about': 'Despre noi',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Galerie',
      'nav.video': 'Video',
      'nav.blog': 'Blog',
      'nav.partnership': 'Parteneriat',
      'nav.contacts': 'Contact',

      // Block Editor
      'editor.title': 'Editor de blocuri',
      'editor.hint': 'Selectează fețele de înlocuit, alege o culoare din paletă, alege tipul de înlocuire \u2014 apoi aplică.',
      'editor.preview': 'Previzualizare cubik',
      'editor.noSelection': 'Niciun cubik selectat',
      'editor.replace': 'Înlocuiește fețe',

      // Export / Import
      'export.scene': 'Exportă scena',
      'export.stats': 'Exportă statistici',

      // Projects
      'project.save': 'Salvează proiect',
      'project.load': 'Încarcă proiect',
      'project.name': 'Nume proiect',
      'project.cancel': 'Anulează',
      'project.saveBtn': 'Salvează',
      'project.modalTitle': 'Salvează proiect',

      // Statistics
      'stats.blocks': 'Blocuri',
      'stats.facets': 'Fețe',

      // Status Messages
      'status.ready': 'Gata.',
      'status.loading': 'Se încarcă...',
      'status.saved': 'Salvat!',
      'status.error': 'Eroare',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Restrânge',
      'facetStats.expand': 'Extinde',

      // Shop Integration
      'shop.sending': 'Se trimite la magazin...',
      'shop.sent': 'Trimis la magazin',
      'shop.sentNoUrl': 'Trimis la magazin (dar nu s-a primit URL)',
      'shop.errorMissing': 'Nu se poate trimite la magazin: ID-ul produsului nu a fost găsit pentru unele fețe. Vezi consola.',
      'shop.error': 'Eroare API magazin',
      'shop.signIn': 'Autentificare',
      'shop.close': 'Închide',
      'shop.pleaseWait': 'Vă rugăm așteptați, poate dura câteva secunde',

      // Context menu (long-press on cube)
      'context.edit': 'Editează',
      'context.delete': 'Șterge cubul',
      'panel.toggleMenu': 'Restrânge / extinde meniul',
      'editor.collapsePanel': 'Restrânge panoul',

      // Additional UI
      'help.closeEditor': 'Închide editorul / suprapunerile',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Preț estimat',
      'hud.loadTitle': 'Încarcă proiectul',
      'hud.saveTitle': 'Salvează proiectul',
      'continue.btn': 'Continuă',
      'continue.title': 'Salvează în cont / Continuă la magazin',
      'toolbar.clear': 'Șterge scena',
      'toolbar.undo': 'Anulare (Ctrl+Z)',
      'toolbar.redo': 'Refă (Ctrl+Y)',
      'toolbar.replayBuild': 'Redă asamblarea',
      'toolbar.recordTimelapse': 'Înregistrează video timelapse',
      'help.titleAttr': 'Ajutor / Start rapid',
      'export.statsTitle': 'Exportă statistici în .txt',
      'project.saveTitle': 'Salvează proiectul ca JSON',
      'project.loadTitle': 'Încarcă proiect din JSON',
      'nav.open': 'Deschide navigarea',
      'panel.addCubik': 'Adaugă cubik',
      'panel.deleteCubik': 'Șterge cubik',

      // AI Constructor
      'ai.title': 'Constructor AI',
      'ai.editor': 'Editor AI',
      'ai.ready': 'Gata',
      'ai.mode.fast': 'Rapid',
      'ai.mode.creative': 'Creativ',
      'ai.addMode': 'Adaugă la scenă (altfel \u2014 înlocuiește)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Descrie ce să construiești, ex. "Casă verde cu acoperiș roșu" sau "Robot"',
      'ai.blocks': 'blocuri',
      'ai.placeholder': 'Ce ar trebui să construiesc?...',
      'ai.send': 'Trimite',
      'ai.voiceInput': 'Intrare vocală',
      'ai.generating': 'Se generează...',
      'ai.listening': 'Ascult...',
      'ai.doneBlocks': 'Gata! {n} blocuri construite',
      'ai.blocksCount': '{n} blocuri',

      // Tutorial Tour
      'tutorial.welcome.title': 'Bun venit la Cubik Builder!',
      'tutorial.welcome.desc': 'Acest ghid interactiv te va ajuta să creezi modele 3D uimitoare. Să începem!',
      'tutorial.gallery.title': 'Galeria de blocuri',
      'tutorial.gallery.desc': 'Alege tipul de bloc pe care dorești să-l plasezi. Există 4 tipuri: Void, Zen, Bion și Zen/2. Click pe un bloc pentru a-l selecta.',
      'tutorial.palette.title': 'Paleta de culori',
      'tutorial.palette.desc': 'Alege o culoare pentru blocul tău. Click pe un punct de culoare pentru a-l selecta. Culoarea selectată va fi aplicată blocurilor noi.',
      'tutorial.place.title': 'Plasează blocuri',
      'tutorial.place.desc': 'Click pe scenă pentru a plasa un bloc. Blocurile se aliniază automat la grilă și între ele.',
      'tutorial.navigate.title': 'Navigare cameră',
      'tutorial.navigate.desc': 'Rotire: ține apăsat butonul stâng și trage. Deplasare: ține apăsat butonul drept și trage. Zoom: folosește rotița mouse-ului.',
      'tutorial.delete.title': 'Șterge blocuri',
      'tutorial.delete.desc': 'Click dreapta pe orice bloc pentru a-l șterge. Poți folosi și Ctrl+Z pentru a anula ultima acțiune.',
      'tutorial.editor.title': 'Editor de fețe',
      'tutorial.editor.desc': 'Apasă Tab sau butonul din mijloc al mouse-ului pe un bloc pentru a deschide editorul de fețe. Încearcă acum!',
      'tutorial.editorSelectFace.title': 'Selectează față',
      'tutorial.editorSelectFace.desc': 'Dă clic pe o față a blocului pe care vrei să o înlocuiești sau pictezi.',
      'tutorial.editorFaceType.title': 'Alege înlocuitor',
      'tutorial.editorFaceType.desc': 'Selectează un element decorativ pentru a înlocui fața aleasă.',
      'tutorial.editorColor.title': 'Alege culoare',
      'tutorial.editorColor.desc': 'Opțional selectează o culoare pentru față. Dă clic pe orice culoare.',
      'tutorial.editorApply.title': 'Aplică modificări',
      'tutorial.editorApply.desc': 'Dă clic pe acest buton pentru a aplica înlocuirea. Apasă Tab sau Escape pentru a închide editorul.',
      'tutorial.undoredo.title': 'Anulează și Refă',
      'tutorial.undoredo.desc': 'Ai făcut o greșeală? Folosește aceste butoane sau Ctrl+Z pentru a anula, Ctrl+Y pentru a reface. Pictograma coș de gunoi șterge întreaga scenă.',
      'tutorial.saveload.title': 'Salvează și Încarcă',
      'tutorial.saveload.desc': 'Salvează proiectul într-un fișier folosind butonul Salvează. Încarcă proiecte salvate anterior cu butonul Încarcă.',
      'tutorial.continue.title': 'Salvează în cont',
      'tutorial.continue.desc': 'Dă clic pe Continuă pentru a salva proiectul în contul tău personal. Acolo îl poți cumpăra sau continua editarea mai târziu.',
      'tutorial.finish.title': 'Ești pregătit!',
      'tutorial.finish.desc': 'Bună treabă! Acum cunoști elementele de bază. Începe să construiești! Poți relua oricând acest tutorial din butonul Ajutor.',
      'tutorial.btn.next': 'Următorul',
      'tutorial.btn.prev': 'Înapoi',
      'tutorial.btn.done': 'Gata!',
      'tutorial.btn.start': 'Începe tutorialul'
    },

    // =========================================================================
    // BULGARIAN (BG)
    // =========================================================================
    bg: {
      // General
      'app.title': '3D Конструктор',
      'loader.loading': 'Зареждане...',

      // Help Modal
      'help.title': 'Бърз старт',
      'help.navigation': 'Навигация',
      'help.controls': 'Управление',
      'help.btn': 'Помощ',
      'help.start': 'Старт',
      'help.tutorial': 'Започнете урок',
      'help.close': 'Затвори',

      // Navigation Instructions
      'help.lmb.rotate': 'Задръжте ляв бутон \u2014 въртене',
      'help.rmb.pan': 'Задръжте десен бутон \u2014 преместване',
      'help.wheel.zoom': 'Колелце на мишката \u2014 мащаб',
      'help.lmb.add': 'Добави Cubik',
      'help.rmb.delete': 'Изтрий Cubik',
      'help.tab.replace': 'Замяна/оцветяване на стени',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Отмяна / Повтори',
      'help.copy': 'Копирай Cubik',
      'help.orbit': 'Орбитална камера около оста',
      'help.move': 'Движение нагоре/надолу',

      // HUD (Top Bar)
      'hud.load': 'Зареди',
      'hud.save': 'Запази',
      'hud.cubiks': 'Cubiks',
      'hud.cubiksLabel': 'Кликнете за експорт на статистики',

      // Navigation (Side Menu)
      'nav.home': 'Начало',
      'nav.shop': 'Магазин',
      'nav.about': 'За нас',
      'nav.faq': 'ЧЗВ',
      'nav.gallery': 'Галерия',
      'nav.video': 'Видео',
      'nav.blog': 'Блог',
      'nav.partnership': 'Партньорство',
      'nav.contacts': 'Контакти',

      // Block Editor
      'editor.title': 'Редактор на блокове',
      'editor.hint': 'Изберете стени за замяна, изберете цвят от палитрата, изберете тип замяна \u2014 и приложете.',
      'editor.preview': 'Преглед на cubik',
      'editor.noSelection': 'Не е избран cubik',
      'editor.replace': 'Замени стени',

      // Export / Import
      'export.scene': 'Експорт на сцена',
      'export.stats': 'Експорт на статистики',

      // Projects
      'project.save': 'Запази проект',
      'project.load': 'Зареди проект',
      'project.name': 'Име на проект',
      'project.cancel': 'Отказ',
      'project.saveBtn': 'Запази',
      'project.modalTitle': 'Запази проект',

      // Statistics
      'stats.blocks': 'Блокове',
      'stats.facets': 'Стени',

      // Status Messages
      'status.ready': 'Готово.',
      'status.loading': 'Зареждане...',
      'status.saved': 'Запазено!',
      'status.error': 'Грешка',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Свий',
      'facetStats.expand': 'Разгъни',

      // Shop Integration
      'shop.sending': 'Изпращане към магазина...',
      'shop.sent': 'Изпратено към магазина',
      'shop.sentNoUrl': 'Изпратено към магазина (но URL не е получен)',
      'shop.errorMissing': 'Не може да се изпрати към магазина: не е намерен ID на продукт за някои стени. Вижте конзолата.',
      'shop.error': 'Грешка в API на магазина',
      'shop.signIn': 'Вход',
      'shop.close': 'Затвори',
      'shop.pleaseWait': 'Моля изчакайте, това може да отнеме няколко секунди',

      // Context menu (long-press on cube)
      'context.edit': 'Редактирай',
      'context.delete': 'Изтрий куб',
      'panel.toggleMenu': 'Свий / разгъни менюто',
      'editor.collapsePanel': 'Свий панела',

      // Additional UI
      'help.closeEditor': 'Затвори редактора / наложенията',
      'stats.badge': 'Cubiks:',
      'hud.estimatedPrice': 'Очаквана цена',
      'hud.loadTitle': 'Зареди проект',
      'hud.saveTitle': 'Запази проект',
      'continue.btn': 'Продължи',
      'continue.title': 'Запази в акаунт / Продължи към магазина',
      'toolbar.clear': 'Изчисти сцената',
      'toolbar.undo': 'Отмени (Ctrl+Z)',
      'toolbar.redo': 'Повтори (Ctrl+Y)',
      'toolbar.replayBuild': 'Възпроизведи сглобяване',
      'toolbar.recordTimelapse': 'Запиши видео таймлапс',
      'help.titleAttr': 'Помощ / Бърз старт',
      'export.statsTitle': 'Експортирай статистики в .txt',
      'project.saveTitle': 'Запази проект като JSON',
      'project.loadTitle': 'Зареди проект от JSON',
      'nav.open': 'Отвори навигацията',
      'panel.addCubik': 'Добави cubik',
      'panel.deleteCubik': 'Изтрий cubik',

      // AI Constructor
      'ai.title': 'AI конструктор',
      'ai.editor': 'AI редактор',
      'ai.ready': 'Готово',
      'ai.mode.fast': 'Бърз',
      'ai.mode.creative': 'Креативен',
      'ai.addMode': 'Добави към сцената (в противен случай \u2014 замени)',
      'ai.welcomeTitle': 'Cubik AI',
      'ai.welcomeDesc': 'Опишете какво да се изгради, напр. "Зелена къща с червен покрив" или "Робот"',
      'ai.blocks': 'блока',
      'ai.placeholder': 'Какво да изградя?...',
      'ai.send': 'Изпрати',
      'ai.voiceInput': 'Гласов въвод',
      'ai.generating': 'Генериране...',
      'ai.listening': 'Слушам...',
      'ai.doneBlocks': 'Готово! {n} блока изградени',
      'ai.blocksCount': '{n} блока',

      // Tutorial Tour
      'tutorial.welcome.title': 'Добре дошли в Cubik Builder!',
      'tutorial.welcome.desc': 'Това интерактивно ръководство ще ви помогне да създадете невероятни 3D модели. Да започнем!',
      'tutorial.gallery.title': 'Галерия с блокове',
      'tutorial.gallery.desc': 'Изберете типа блок, който искате да поставите. Има 4 типа: Void, Zen, Bion и Zen/2. Кликнете върху блок, за да го изберете.',
      'tutorial.palette.title': 'Цветова палитра',
      'tutorial.palette.desc': 'Изберете цвят за вашия блок. Кликнете върху цветна точка, за да я изберете. Избраният цвят ще бъде приложен към новите блокове.',
      'tutorial.place.title': 'Поставяне на блокове',
      'tutorial.place.desc': 'Кликнете върху сцената, за да поставите блок. Блоковете автоматично се прилепват към мрежата и един към друг.',
      'tutorial.navigate.title': 'Навигация на камерата',
      'tutorial.navigate.desc': 'Въртене: задръжте левия бутон на мишката и влачете. Преместване: задръжте десния бутон на мишката и влачете. Мащаб: използвайте колелцето на мишката.',
      'tutorial.delete.title': 'Изтриване на блокове',
      'tutorial.delete.desc': 'Щракнете с десния бутон върху блок, за да го изтриете. Можете също да използвате Ctrl+Z, за да отмените последното действие.',
      'tutorial.editor.title': 'Редактор на стени',
      'tutorial.editor.desc': 'Натиснете Tab или средния бутон на мишката върху блок, за да отворите редактора на стени. Опитайте сега!',
      'tutorial.editorSelectFace.title': 'Изберете стена',
      'tutorial.editorSelectFace.desc': 'Кликнете върху стена на блока, която искате да замените или боядисате.',
      'tutorial.editorFaceType.title': 'Изберете замяна',
      'tutorial.editorFaceType.desc': 'Изберете декоративен елемент, за да замените избраната стена.',
      'tutorial.editorColor.title': 'Изберете цвят',
      'tutorial.editorColor.desc': 'По желание изберете цвят за стената. Кликнете върху който и да е цвят.',
      'tutorial.editorApply.title': 'Приложете промените',
      'tutorial.editorApply.desc': 'Кликнете този бутон, за да приложите замяната. Натиснете Tab или Escape, за да затворите редактора.',
      'tutorial.undoredo.title': 'Отмяна и Повтори',
      'tutorial.undoredo.desc': 'Направихте грешка? Използвайте тези бутони или Ctrl+Z за отмяна, Ctrl+Y за повторение. Иконата на кошчето изчиства цялата сцена.',
      'tutorial.saveload.title': 'Запази и Зареди',
      'tutorial.saveload.desc': 'Запазете проекта си във файл с бутона Запази. Заредете предварително запазени проекти с бутона Зареди.',
      'tutorial.continue.title': 'Запази в акаунта',
      'tutorial.continue.desc': 'Кликнете върху Продължи, за да запазите проекта си в личния си акаунт. Там можете да го закупите или да продължите редактирането по-късно.',
      'tutorial.finish.title': 'Готови сте!',
      'tutorial.finish.desc': 'Страхотна работа! Вече знаете основите. Започнете да строите! Винаги можете да рестартирате това ръководство от бутона Помощ.',
      'tutorial.btn.next': 'Напред',
      'tutorial.btn.prev': 'Назад',
      'tutorial.btn.done': 'Готово!',
      'tutorial.btn.start': 'Стартирай ръководството'
    }

    // =========================================================================
    // RUSSIAN (RU) - COMMENTED OUT
    // =========================================================================
    /*
    ru: {
      // General
      'app.title': 'Здесь можно собирать Cubiks',
      'loader.loading': 'Загрузка...',

      // Help Modal
      'help.title': 'Быстрый старт',
      'help.navigation': 'Навигация',
      'help.controls': 'Управление',
      'help.btn': 'Помощь',
      'help.start': 'Начать',
      'help.tutorial': 'Пройти обучение',
      'help.close': 'Закрыть',

      // Navigation Instructions
      'help.lmb.rotate': 'Зажать ЛКМ \u2014 вращение',
      'help.rmb.pan': 'Зажать ПКМ \u2014 перемещение',
      'help.wheel.zoom': 'Колесо мыши \u2014 масштаб',
      'help.lmb.add': 'Добавить Cubik',
      'help.rmb.delete': 'Удалить Cubik',
      'help.tab.replace': 'Заменить/перекрасить грани',
      'help.undo': 'Ctrl+Z / Ctrl+Y \u2014 Отмена / Повтор',
      'help.copy': 'Копировать Cubik',
      'help.orbit': 'Орбитальное вращение камеры',
      'help.move': 'Движение вверх/вниз',

      // HUD (Top Bar)
      'hud.load': 'Загрузить',
      'hud.save': 'Сохранить',
      'hud.cubiks': 'Кубики',
      'hud.cubiksLabel': 'Нажмите для экспорта статистики',

      // Navigation (Side Menu)
      'nav.home': 'Главная',
      'nav.shop': 'Магазин',
      'nav.about': 'О нас',
      'nav.faq': 'FAQ',
      'nav.gallery': 'Галерея',
      'nav.video': 'Видео',
      'nav.blog': 'Блог',
      'nav.partnership': 'Партнёрство',
      'nav.contacts': 'Контакты',

      // Block Editor
      'editor.title': 'Редактор блоков',
      'editor.hint': 'Выберите грани для замены, укажите цвет в палитре, выберите тип замены \u2014 затем примените.',
      'editor.preview': 'Предпросмотр кубика',
      'editor.noSelection': 'Кубик не выбран',
      'editor.replace': 'Заменить грани',

      // Export / Import
      'export.scene': 'Экспорт сцены',
      'export.stats': 'Экспорт статистики',

      // Projects
      'project.save': 'Сохранить проект',
      'project.load': 'Загрузить проект',
      'project.name': 'Название проекта',
      'project.cancel': 'Отмена',
      'project.saveBtn': 'Сохранить',
      'project.modalTitle': 'Сохранение проекта',

      // Statistics
      'stats.blocks': 'Блоки',
      'stats.facets': 'Грани',
      'stats.panelTitle': 'Статистика',
      'stats.facetsTitle': 'Грани',
      'stats.measurementsTitle': 'Габариты',
      'stats.colType': 'Грань',
      'stats.colCount': 'Кол-во',
      'stats.colVolume': 'Объём, см³',
      'stats.colWeight': 'Вес, г',
      'stats.total': 'Итого',
      'stats.height': 'Высота',
      'stats.width': 'Ширина',
      'stats.depth': 'Глубина',
      'stats.totalWeight': 'Общий вес',
      'stats.totalVolume': 'Общий объём',

      // Status Messages
      'status.ready': 'Готово.',
      'status.loading': 'Загрузка...',
      'status.saved': 'Сохранено!',
      'status.error': 'Ошибка',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Свернуть',
      'facetStats.expand': 'Развернуть'
    }
    */
  };

  // =============================================================================
  // Translation Function
  // =============================================================================

  /**
   * Get translation for a key
   * @param {string} key - Translation key
   * @param {string} [fallback] - Fallback value if key not found
   * @returns {string} Translated string
   */
  function t(key, fallback) {
    var pack = DICT[currentLang] || DICT[DEFAULT_LANG];
    if (pack && Object.prototype.hasOwnProperty.call(pack, key)) {
      return pack[key];
    }
    if (DICT[DEFAULT_LANG] && Object.prototype.hasOwnProperty.call(DICT[DEFAULT_LANG], key)) {
      return DICT[DEFAULT_LANG][key];
    }
    return fallback !== undefined ? fallback : key;
  }

  // =============================================================================
  // DOM Application
  // =============================================================================

  /**
   * Apply all translations to DOM elements
   * Looks for data-i18n-key, data-i18n-attr, data-i18n-placeholder attributes
   */
  function apply() {
    // Update <title>
    var titleEl = doc.querySelector('title[data-i18n-key]');
    if (titleEl) {
      titleEl.textContent = t(titleEl.getAttribute('data-i18n-key'));
    }

    // Update all elements with data-i18n-key
    var nodes = doc.querySelectorAll('[data-i18n-key]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var key = node.getAttribute('data-i18n-key');
      if (!key) continue;

      var value = t(key);
      var attrName = node.getAttribute('data-i18n-attr');

      if (attrName) {
        node.setAttribute(attrName, value);
      } else {
        node.textContent = value;
      }
    }

    // Update placeholders
    var placeholders = doc.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var ph = placeholders[j];
      var phKey = ph.getAttribute('data-i18n-placeholder');
      if (phKey) {
        ph.setAttribute('placeholder', t(phKey));
      }
    }

    // Dispatch event for other modules
    try {
      var event = new CustomEvent('i18n:applied', { detail: { lang: currentLang } });
      doc.dispatchEvent(event);
    } catch (e) {}
  }

  // =============================================================================
  // Language Setting
  // =============================================================================

  /**
   * Set application language
   * @param {string} lang - Language code
   * @param {boolean} [saveToStorage=true] - Whether to save to localStorage
   * @returns {string} The normalized language that was set
   */
  function setLang(lang, saveToStorage) {
    var next = normalizeLang(lang);
    if (next === currentLang) return currentLang;

    currentLang = next;
    updateHtmlLang();

    if (saveToStorage !== false) {
      saveLangToStorage(currentLang);
    }

    apply();

    // Dispatch language change event
    try {
      var event = new CustomEvent('i18n:langChanged', { detail: { lang: currentLang } });
      doc.dispatchEvent(event);
    } catch (e) {}

    return currentLang;
  }

  // =============================================================================
  // Utility Functions
  // =============================================================================

  /**
   * Get list of supported languages
   * @returns {string[]} Array of supported language codes
   */
  function getSupported() {
    return SUPPORTED.slice();
  }

  /**
   * Add translations dynamically
   * @param {string} lang - Language code
   * @param {Object} translations - Key-value pairs of translations
   */
  function addTranslations(lang, translations) {
    if (!DICT[lang]) {
      DICT[lang] = {};
      if (SUPPORTED.indexOf(lang) === -1) {
        SUPPORTED.push(lang);
      }
    }
    for (var key in translations) {
      if (Object.prototype.hasOwnProperty.call(translations, key)) {
        DICT[lang][key] = translations[key];
      }
    }
  }

  // =============================================================================
  // Public API
  // =============================================================================

  global.CubikI18N = {
    /** Current language code */
    get lang() {
      return currentLang;
    },
    /** List of supported languages */
    get supported() {
      return getSupported();
    },
    /** Translate a key */
    t: t,
    /** Apply translations to DOM */
    apply: apply,
    /** Set language */
    setLang: setLang,
    /** Get supported languages */
    getSupported: getSupported,
    /** Add custom translations */
    addTranslations: addTranslations
  };

  // Apply translations after DOM load
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

})(window, document);
