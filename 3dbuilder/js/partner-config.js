/**
 * Cubik Builder - Partner Configuration
 * @module partner-config
 * @description Detects partner context by hostname or URL params, sets lang/currency/prices
 * @version 1.0.0
 *
 * Priority: hostname > URL params (?partner=...) > defaults
 *
 * Usage:
 *   var cfg = window.CubikPartnerConfig;
 *   cfg.currency   // 'EUR' | 'PLN'
 *   cfg.symbol     // '€' | 'zł'
 *   cfg.partnerId  // null | 'poland'
 *   cfg.lang       // null | 'pl'  (null = don't override i18n)
 *   cfg.prices     // { Bion: ..., Zen: ..., ... }
 *   cfg.formatPrice(12.5) // '12.50 €' | '12,50 zł'
 */
(function(global) {
  'use strict';

  var PARTNERS = {
    'poland': {
      lang: 'pl',
      currency: 'PLN',
      symbol: 'zł',
      prices: {
        'Bion':  8.39,
        'Zen':   8.82,
        'Void':  6.79,
        'Zen/2': 6.79,
        'Flora': 12.04
      }
    }
  };

  var DEFAULTS = {
    lang: null,
    currency: 'EUR',
    symbol: '€',
    partnerId: null,
    prices: {
      'Bion':  1.95,
      'Zen':   2.05,
      'Void':  1.58,
      'Zen/2': 1.58,
      'Flora': 2.80
    }
  };

  function detectPartnerFromHostname() {
    try {
      var host = global.location.hostname.toLowerCase();
      var parts = host.split('.');
      if (parts.length >= 3) {
        var sub = parts[0];
        if (PARTNERS[sub]) return sub;
      }
    } catch (e) {}
    return null;
  }

  function detectPartnerFromQuery() {
    try {
      var match = global.location.search.match(/[?&]partner=([a-zA-Z0-9_-]+)/);
      return match ? match[1].toLowerCase() : null;
    } catch (e) {
      return null;
    }
  }

  function detectCurrencyFromQuery() {
    try {
      var match = global.location.search.match(/[?&]currency=([a-zA-Z]{3})/);
      return match ? match[1].toUpperCase() : null;
    } catch (e) {
      return null;
    }
  }

  var partnerId = detectPartnerFromHostname() || detectPartnerFromQuery() || null;
  var partnerDef = partnerId && PARTNERS[partnerId] ? PARTNERS[partnerId] : null;

  var queryCurrency = detectCurrencyFromQuery();

  var config = {
    partnerId: partnerId,
    lang:      partnerDef ? partnerDef.lang     : DEFAULTS.lang,
    currency:  partnerDef ? partnerDef.currency  : DEFAULTS.currency,
    symbol:    partnerDef ? partnerDef.symbol     : DEFAULTS.symbol,
    prices:    partnerDef ? partnerDef.prices     : DEFAULTS.prices
  };

  if (queryCurrency && partnerDef && queryCurrency !== config.currency) {
    config.currency = queryCurrency;
  }

  if (partnerId) {
    try { sessionStorage.setItem('cubik_partner', partnerId); } catch (e) {}
  } else {
    try {
      var stored = sessionStorage.getItem('cubik_partner');
      if (stored && PARTNERS[stored]) {
        config.partnerId = stored;
        var def = PARTNERS[stored];
        config.lang     = def.lang;
        config.currency = def.currency;
        config.symbol   = def.symbol;
        config.prices   = def.prices;
      }
    } catch (e) {}
  }

  /**
   * Format a price number with the active currency symbol.
   * PLN uses comma as decimal separator per Polish convention.
   */
  config.formatPrice = function(n) {
    var v = +n;
    var str = (Math.abs(v - Math.round(v)) < 0.005)
      ? Math.round(v).toString()
      : v.toFixed(2);

    if (config.currency === 'PLN') {
      str = str.replace('.', ',');
      return str + ' ' + config.symbol;
    }
    return str + ' ' + config.symbol;
  };

  /**
   * Get price for a facet type in the active currency.
   */
  config.getPrice = function(type) {
    return config.prices.hasOwnProperty(type) ? config.prices[type] : 0;
  };

  global.CubikPartnerConfig = config;

  if (config.partnerId) {
    console.log('[PartnerConfig] Partner:', config.partnerId,
      '| Currency:', config.currency,
      '| Lang:', config.lang);
  }

})(window);
