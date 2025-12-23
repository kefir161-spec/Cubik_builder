/**
 * Cubik Builder - Internationalization Module
 * @module i18n
 * @description Multi-language support with URL parameter, localStorage, and browser detection
 * @author Andrey Bovdurets
 * @version 1.2
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

  // Determine current language with priority:
  // 1. URL parameter (?lang=xx)
  // 2. localStorage
  // 3. Browser language
  // 4. Default (en)
  var currentLang = normalizeLang(
    getLangFromQuery() ||
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
      'loader.loading': 'Loading Cubiks...',

      // Help Modal
      'help.title': 'Quick start',
      'help.navigation': 'Navigation',
      'help.controls': 'Controls',
      'help.btn': 'Help',
      'help.start': 'Start',
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

      // Status Messages
      'status.ready': 'Ready.',
      'status.loading': 'Loading...',
      'status.saved': 'Saved!',
      'status.error': 'Error',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Collapse',
      'facetStats.expand': 'Expand'
    },

    // =========================================================================
    // GERMAN (DE)
    // =========================================================================
    de: {
      // General
      'app.title': '3D-Baukasten',
      'loader.loading': 'Cubiks werden geladen...',

      // Help Modal
      'help.title': 'Schnellstart',
      'help.navigation': 'Navigation',
      'help.controls': 'Steuerung',
      'help.btn': 'Hilfe',
      'help.start': 'Start',
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

      // Status Messages
      'status.ready': 'Bereit.',
      'status.loading': 'Laden...',
      'status.saved': 'Gespeichert!',
      'status.error': 'Fehler',

      // Facet Stats Panel
      'facetStats.title': '\uD83D\uDCCA',
      'facetStats.empty': '\u2014',
      'facetStats.collapse': 'Einklappen',
      'facetStats.expand': 'Ausklappen'
    },

    // =========================================================================
    // DUTCH (NL)
    // =========================================================================
    nl: {
      // General
      'app.title': '3D-bouwer',
      'loader.loading': 'Cubiks laden...',

      // Help Modal
      'help.title': 'Snelstart',
      'help.navigation': 'Navigatie',
      'help.controls': 'Bediening',
      'help.btn': 'Help',
      'help.start': 'Start',
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
      'facetStats.expand': 'Uitklappen'
    },

    // =========================================================================
    // FRENCH (FR)
    // =========================================================================
    fr: {
      // General
      'app.title': 'Constructeur 3D',
      'loader.loading': 'Chargement des Cubiks...',

      // Help Modal
      'help.title': 'Démarrage rapide',
      'help.navigation': 'Navigation',
      'help.controls': 'Commandes',
      'help.btn': 'Aide',
      'help.start': 'Commencer',
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
      'facetStats.expand': 'Développer'
    },

    // =========================================================================
    // SPANISH (ES)
    // =========================================================================
    es: {
      // General
      'app.title': 'Constructor 3D',
      'loader.loading': 'Cargando Cubiks...',

      // Help Modal
      'help.title': 'Inicio rápido',
      'help.navigation': 'Navegación',
      'help.controls': 'Controles',
      'help.btn': 'Ayuda',
      'help.start': 'Iniciar',
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
      'facetStats.expand': 'Expandir'
    },

    // =========================================================================
    // PORTUGUESE (PT)
    // =========================================================================
    pt: {
      // General
      'app.title': 'Construtor 3D',
      'loader.loading': 'Carregando Cubiks...',

      // Help Modal
      'help.title': 'Início rápido',
      'help.navigation': 'Navegação',
      'help.controls': 'Controles',
      'help.btn': 'Ajuda',
      'help.start': 'Iniciar',
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
      'facetStats.expand': 'Expandir'
    },

    // =========================================================================
    // ITALIAN (IT)
    // =========================================================================
    it: {
      // General
      'app.title': 'Costruttore 3D',
      'loader.loading': 'Caricamento Cubiks...',

      // Help Modal
      'help.title': 'Avvio rapido',
      'help.navigation': 'Navigazione',
      'help.controls': 'Controlli',
      'help.btn': 'Aiuto',
      'help.start': 'Inizia',
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
      'facetStats.expand': 'Espandi'
    },

    // =========================================================================
    // FINNISH (FI)
    // =========================================================================
    fi: {
      // General
      'app.title': '3D-rakentaja',
      'loader.loading': 'Ladataan Cubikeja...',

      // Help Modal
      'help.title': 'Pikaopas',
      'help.navigation': 'Navigointi',
      'help.controls': 'Ohjaus',
      'help.btn': 'Ohje',
      'help.start': 'Aloita',
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
      'facetStats.expand': 'Laajenna'
    },

    // =========================================================================
    // SWEDISH (SV)
    // =========================================================================
    sv: {
      // General
      'app.title': '3D-byggare',
      'loader.loading': 'Laddar Cubiks...',

      // Help Modal
      'help.title': 'Snabbstart',
      'help.navigation': 'Navigation',
      'help.controls': 'Kontroller',
      'help.btn': 'Hjälp',
      'help.start': 'Starta',
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
      'facetStats.expand': 'Expandera'
    },

    // =========================================================================
    // DANISH (DA)
    // =========================================================================
    da: {
      // General
      'app.title': '3D-bygger',
      'loader.loading': 'Indlæser Cubiks...',

      // Help Modal
      'help.title': 'Hurtigstart',
      'help.navigation': 'Navigation',
      'help.controls': 'Kontroller',
      'help.btn': 'Hjælp',
      'help.start': 'Start',
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
      'facetStats.expand': 'Udvid'
    },

    // =========================================================================
    // CZECH (CS)
    // =========================================================================
    cs: {
      // General
      'app.title': '3D stavitel',
      'loader.loading': 'Načítání Cubiků...',

      // Help Modal
      'help.title': 'Rychlý start',
      'help.navigation': 'Navigace',
      'help.controls': 'Ovládání',
      'help.btn': 'Nápověda',
      'help.start': 'Start',
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
      'facetStats.expand': 'Rozbalit'
    },

    // =========================================================================
    // POLISH (PL)
    // =========================================================================
    pl: {
      // General
      'app.title': 'Kreator 3D',
      'loader.loading': 'Ładowanie Cubików...',

      // Help Modal
      'help.title': 'Szybki start',
      'help.navigation': 'Nawigacja',
      'help.controls': 'Sterowanie',
      'help.btn': 'Pomoc',
      'help.start': 'Start',
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
      'facetStats.expand': 'Rozwiń'
    },

    // =========================================================================
    // ROMANIAN (RO)
    // =========================================================================
    ro: {
      // General
      'app.title': 'Constructor 3D',
      'loader.loading': 'Se încarcă Cubiks...',

      // Help Modal
      'help.title': 'Start rapid',
      'help.navigation': 'Navigare',
      'help.controls': 'Controale',
      'help.btn': 'Ajutor',
      'help.start': 'Start',
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
      'facetStats.expand': 'Extinde'
    },

    // =========================================================================
    // BULGARIAN (BG)
    // =========================================================================
    bg: {
      // General
      'app.title': '3D Конструктор',
      'loader.loading': 'Зареждане на Cubiks...',

      // Help Modal
      'help.title': 'Бърз старт',
      'help.navigation': 'Навигация',
      'help.controls': 'Управление',
      'help.btn': 'Помощ',
      'help.start': 'Старт',
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
      'facetStats.expand': 'Разгъни'
    }

    // =========================================================================
    // RUSSIAN (RU) - COMMENTED OUT
    // =========================================================================
    /*
    ru: {
      // General
      'app.title': 'Здесь можно собирать Cubiks',
      'loader.loading': 'Загрузка Cubiks...',

      // Help Modal
      'help.title': 'Быстрый старт',
      'help.navigation': 'Навигация',
      'help.controls': 'Управление',
      'help.btn': 'Помощь',
      'help.start': 'Начать',
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
