const path = require('path');
const fs = require('fs');
const Franchise = require('madden-franchise');
const prompt = require('prompt-sync')({ sigint: true });

// Check for arguments or prompt for file path
let filePath = process.argv[2];
if (!filePath) {
  filePath = prompt('Enter the full path to your Madden 27 franchise file: ').replace(/^"|"$/g, '');
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found at path: ${filePath}`);
  process.exit(1);
}

console.log(`Loading franchise file...`);
const franchise = new Franchise(filePath);

franchise.on('ready', async () => {
  const gameYear = franchise.header.gameYear;
  console.log(`Detected Franchise Game Year: ${gameYear}`);

  // Allow Madden 27 explicitly alongside Madden 26
  if (gameYear !== 27 && gameYear !== 26) {
    console.error(`Error: This tool targets Madden 27 files (GameYear 27). Detected: ${gameYear}`);
    process.exit(1);
  }

  // Load Madden 27 team lookup
  const lookupPath = path.join(__dirname, `../Utils/JsonLookups/teamLookup_${gameYear}.json`);
  if (!fs.existsSync(lookupPath)) {
    console.error(`Could not find team lookup file at: ${lookupPath}`);
    process.exit(1);
  }

  const teamLookup = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));

  // Prompt for year schedule selection
  const scheduleYear = prompt('Enter the retro schedule year to import (e.g. 1998, 2004): ');
  const schedulePath = path.join(__dirname, `./schedules/schedule_${scheduleYear}.json`);

  if (!fs.existsSync(schedulePath)) {
    console.error(`Schedule file for year ${scheduleYear} does not exist at ${schedulePath}`);
    process.exit(1);
  }

  const scheduleData = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  console.log(`Applying ${scheduleYear} schedule to Madden ${gameYear} franchise...`);

  const seasonGameTable = franchise.getTableByName('SeasonGame');
  await seasonGameTable.readRecords();

  let modifiedCount = 0;
  
  // Iterate through schedule games and map to Madden 27 table rows
  scheduleData.forEach((game) => {
    const record = seasonGameTable.records.find(r => r.GameNumber === game.gameNumber || r.SeasonGameId === game.id);
    if (record) {
      if (game.homeTeam && teamLookup[game.homeTeam]) {
        record.HomeTeam = teamLookup[game.homeTeam];
      }
      if (game.awayTeam && teamLookup[game.awayTeam]) {
        record.AwayTeam = teamLookup[game.awayTeam];
      }
      modifiedCount++;
    }
  });

  console.log(`Successfully updated ${modifiedCount} schedule entries.`);
  
  // Save franchise file back to disk
  await franchise.save();
  console.log(`Franchise file successfully saved!`);
  process.exit(0);
});
