const forceClassic = new URLSearchParams(window.location.search).get('classic') === '1';

if (!forceClassic) import('./main.js');
