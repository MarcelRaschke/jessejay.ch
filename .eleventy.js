/**
 * Eleventy Configuration
 * Statischer Site Generator für DJ Jesse Jay Website
 */

const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

module.exports = function (eleventyConfig) {
  // Passthrough Copy - kopiere statische Dateien direkt in den Output
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('data');
  eleventyConfig.addPassthroughCopy('*.html');
  eleventyConfig.addPassthroughCopy('*.ico');
  eleventyConfig.addPassthroughCopy('*.gif');
  eleventyConfig.addPassthroughCopy('*.jpg');
  eleventyConfig.addPassthroughCopy('*.png');
  eleventyConfig.addPassthroughCopy('*.svg');
  eleventyConfig.addPassthroughCopy('*.mov');
  eleventyConfig.addPassthroughCopy('*.swf');
  eleventyConfig.addPassthroughCopy('*.webp');
  eleventyConfig.addPassthroughCopy('sw.js');
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy('sitemap.xml');
  eleventyConfig.addPassthroughCopy('robots.txt');
  
  // Layouts
  eleventyConfig.addLayoutAlias('default', 'templates/_base.njk');
  
  // Custom Collections
  
  // Events aus JSON laden
  eleventyConfig.addCollection('events', function(collectionApi) {
    try {
      const eventsPath = path.join(__dirname, 'data', 'events.json');
      if (fs.existsSync(eventsPath)) {
        const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
        return events.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        });
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
    return [];
  });
  
  // Guestbook entries
  eleventyConfig.addCollection('guestbook', function(collectionApi) {
    try {
      const guestbookPath = path.join(__dirname, 'data', 'guestbook.json');
      if (fs.existsSync(guestbookPath)) {
        const entries = JSON.parse(fs.readFileSync(guestbookPath, 'utf8'));
        return entries.sort((a, b) => {
          const dateA = new Date(parseInt(a.timestamp) * 1000);
          const dateB = new Date(parseInt(b.timestamp) * 1000);
          return dateB - dateA;
        });
      }
    } catch (error) {
      console.error('Error loading guestbook:', error);
    }
    return [];
  });
  
  // Sounds
  eleventyConfig.addCollection('sounds', function(collectionApi) {
    try {
      const soundsPath = path.join(__dirname, 'data', 'sounds.json');
      if (fs.existsSync(soundsPath)) {
        return JSON.parse(fs.readFileSync(soundsPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
    return [];
  });
  
  // Images
  eleventyConfig.addCollection('images', function(collectionApi) {
    try {
      const imagesPath = path.join(__dirname, 'data', 'images.json');
      if (fs.existsSync(imagesPath)) {
        return JSON.parse(fs.readFileSync(imagesPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading images:', error);
    }
    return [];
  });
  
  // Biography
  eleventyConfig.addCollection('biography', function(collectionApi) {
    try {
      const bioPath = path.join(__dirname, 'data', 'biography.json');
      if (fs.existsSync(bioPath)) {
        return [JSON.parse(fs.readFileSync(bioPath, 'utf8'))];
      }
    } catch (error) {
      console.error('Error loading biography:', error);
    }
    return [{}];
  });
  
  // Custom Filters
  
  // Format Date
  eleventyConfig.addFilter('formatDate', function(dateString) {
    if (!dateString) return 'Unbekannt';
    try {
      return DateTime.fromISO(dateString).toFormat('dd.MM.yyyy', { locale: 'de' });
    } catch (e) {
      return dateString;
    }
  });
  
  // Format Timestamp (für Guestbook)
  eleventyConfig.addFilter('formatTimestamp', function(timestamp) {
    if (!timestamp) return 'Unbekannt';
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return timestamp;
    }
  });
  
  // Escape HTML
  eleventyConfig.addFilter('escapeHtml', function(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  });
  
  // Replace newlines with <br>
  eleventyConfig.addFilter('nl2br', function(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  });
  
  // Truncate text
  eleventyConfig.addFilter('truncate', function(text, length) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
  });
  
  // Check if URL is valid
  eleventyConfig.addFilter('isValidUrl', function(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  });
  
  // Add https:// to URL if missing
  eleventyConfig.addFilter('normalizeUrl', function(url) {
    if (!url) return null;
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }
    return url;
  });
  
  // Group by year (für Events)
  eleventyConfig.addFilter('groupByYear', function(events) {
    const groups = {};
    events.forEach(event => {
      const year = event.date ? event.date.split('-')[0] : 'Unknown';
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(event);
    });
    return groups;
  });
  
  // Markdown support (falls später benötigt)
  const markdownIt = require('markdown-it');
  const md = markdownIt({ html: true });
  eleventyConfig.addFilter('markdown', function(content) {
    return md.render(content);
  });
  
  // Return config
  return {
    dir: {
      input: '.',
      output: '_site',
      includes: 'templates',
      data: 'data'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    jsDataFileSuffix: '.json',
    templateFormats: ['njk', 'html', 'md'],
    pathPrefix: '/',
    
    // Für GitHub Pages
    // pathPrefix: '/jessejay.ch/',
  };
};
