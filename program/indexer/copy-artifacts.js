const fs = require('fs');
const path = require('path');

// Create idls directory if it doesn't exist
const idlsDir = path.join(__dirname, 'idls');
if (!fs.existsSync(idlsDir)) {
  fs.mkdirSync(idlsDir);
}

// Copy IDL from parent target directory
const idlSource = path.join(__dirname, '../target/idl/weswap.json');
const idlDest = path.join(idlsDir, 'weswap.json');

if (fs.existsSync(idlSource)) {
  fs.copyFileSync(idlSource, idlDest);
  console.log('✅ Copied IDL file to idls/');
} else {
  console.error('❌ IDL file not found at:', idlSource);
  console.log('💡 Run "anchor build" in the parent directory first');
}

// Copy Types from parent target directory
const typesSource = path.join(__dirname, '../target/types/weswap.ts');
const typesDest = path.join(idlsDir, 'weswap.ts');

if (fs.existsSync(typesSource)) {
  fs.copyFileSync(typesSource, typesDest);
  console.log('✅ Copied types file to idls/');
} else {
  console.error('❌ Types file not found at:', typesSource);
  console.log('💡 Run "anchor build" in the parent directory first');
}