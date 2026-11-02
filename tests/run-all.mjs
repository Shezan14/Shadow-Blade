for (let phase = 3; phase <= 11; phase += 1) {
  await import(`./phase${phase}.test.mjs`);
}

await import('./campaign.test.mjs');
await import('./world-upgrade.test.mjs');

console.log('All Shadow Blade automated tests passed.');
