// Add this to browser console to run comprehensive data check
// Copy dan paste ke console (F12) setelah page load

console.log('='.repeat(60));
console.log('🔍 VIDJE ALBUM DATA VERIFICATION');
console.log('='.repeat(60));

// 1. Check if songs array exists and has data
console.log('\n✓ STEP 1: Check Global songs Array');
console.log('- songs array exists:', typeof songs !== 'undefined');
console.log('- songs array is array:', Array.isArray(songs));
console.log('- Total songs:', songs?.length || 0);

// 2. Check ID ranges
console.log('\n✓ STEP 2: Check Song ID Ranges');
const idRanges = [
    { name: 'Perunggu', min: 30, max: 39, expected: 10 },
    { name: 'NOAH', min: 42, max: 51, expected: 10 },
    { name: 'Dewa 19', min: 57, max: 68, expected: 12 },
    { name: 'Sheila On 7', min: 72, max: 83, expected: 12 },
    { name: 'Kahitna', min: 87, max: 97, expected: 11 },
    { name: 'Hindia', min: 100, max: 110, expected: 11 },
    { name: 'Astrid', min: 112, max: 116, expected: 5 },
    { name: 'Afgan', min: 122, max: 129, expected: 8 },
    { name: 'Tulus', min: 132, max: 141, expected: 10 },
    { name: 'Mahalini', min: 142, max: 149, expected: 8 },
    { name: 'Tenxi', min: 152, max: 156, expected: 5 },
    { name: 'Taylor Swift', min: 157, max: 166, expected: 10 },
    { name: 'Justin Bieber', min: 167, max: 176, expected: 10 },
    { name: 'Ed Sheeran', min: 177, max: 186, expected: 10 },
    { name: 'Bruno Mars', min: 187, max: 196, expected: 10 },
    { name: 'Daniel Caesar', min: 197, max: 206, expected: 10 },
    { name: 'Coldplay', min: 207, max: 216, expected: 10 },
    { name: 'One Direction', min: 217, max: 226, expected: 10 },
    { name: 'Green Day', min: 227, max: 236, expected: 10 },
    { name: 'Oasis', min: 237, max: 246, expected: 10 },
    { name: 'Radiohead', min: 247, max: 256, expected: 10 }
];

let allOk = true;
idRanges.forEach(range => {
    const found = songs.filter(s => s.id >= range.min && s.id <= range.max);
    const status = found.length === range.expected ? '✅' : '❌';
    if (found.length !== range.expected) allOk = false;
    console.log(`${status} ${range.name}: found ${found.length}/${range.expected}`);
});

// 3. Check sample song structure
console.log('\n✓ STEP 3: Check Song Object Structure (First Song)');
if (songs && songs.length > 0) {
    const sample = songs[0];
    console.log('- id:', sample.id, typeof sample.id);
    console.log('- title:', sample.title, typeof sample.title);
    console.log('- artist:', sample.artist, typeof sample.artist);
    console.log('- album:', sample.album, typeof sample.album);
    console.log('- duration:', sample.duration, typeof sample.duration);
    console.log('- cover:', sample.cover ? 'present' : 'MISSING');
    console.log('- src:', sample.src ? 'present' : 'MISSING');
}

// 4. Test filtering
console.log('\n✓ STEP 4: Test Filtering (Perunggu example)');
const perungguTest = songs.filter(s => s.id >= 30 && s.id <= 39);
console.log('- Filter result count:', perungguTest.length);
if (perungguTest.length > 0) {
    console.log('- First (ID 30):', perungguTest[0].title);
    console.log('- Last (ID 39):', perungguTest[9]?.title);
}

// 5. Test find by ID
console.log('\n✓ STEP 5: Test Finding by ID');
const testSong = songs.find(s => s.id === 30);
console.log('- Found song ID 30:', testSong ? 'YES' : 'NO');
if (testSong) {
    console.log('- Title:', testSong.title);
    console.log('- Artist:', testSong.artist);
}

// 6. Summary
console.log('\n' + '='.repeat(60));
if (allOk && songs.length > 200) {
    console.log('✅ ALL CHECKS PASSED - Data structure looks good!');
} else {
    console.log('⚠️ SOME ISSUES FOUND - Check details above');
}
console.log('='.repeat(60));
