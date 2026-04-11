#!/usr/bin/env node

const [command = 'help'] = process.argv.slice(2);

if (command === 'help') {
  console.log('cognisctl commands:');
  console.log('- help');
  console.log('- modules:list (placeholder)');
  process.exit(0);
}

if (command === 'modules:list') {
  console.log('Module listing is not wired yet.');
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
