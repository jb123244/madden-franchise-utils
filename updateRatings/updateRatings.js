const FranchiseUtils = require("../Utils/FranchiseUtils");
const StartTodayUtils = require("../startTodayUtilities/StartTodayUtils");

const validGameYears = [
  FranchiseUtils.YEARS.M24,
  FranchiseUtils.YEARS.M25,
  FranchiseUtils.YEARS.M26,
  FranchiseUtils.YEARS.M27,
];
console.log("This program will update player ratings from one franchise file into another.");
const TRANSFER_DEV_TRAITS = FranchiseUtils.getYesOrNo(
  "Should dev traits be transferred along with ratings? Enter yes or no.",
);
const sourceFranchise = FranchiseUtils.init(validGameYears, {
  customYearMessage: "Select the Madden version of your SOURCE Franchise file. Valid inputs are 24 and 25.",
  promptForBackup: false,
  isAutoUnemptyEnabled: false,
});
const targetFranchise = FranchiseUtils.init(validGameYears, {
  customYearMessage: "Select the Madden version of your TARGET Franchise file. Valid inputs are 24 and 25.",
  customFranchiseMessage: "Please enter the name of your target franchise file (such as CAREER-BEARS).",
  promptForBackup: true,
  isAutoUnemptyEnabled: false,
});
const SOURCE_TABLES = FranchiseUtils.getTablesObject(sourceFranchise);
const TARGET_TABLES = FranchiseUtils.getTablesObject(targetFranchise);
const ROOKIES_ONLY = true; // If true, when we dont have an exact match we'll only search for them

sourceFranchise.on("ready", async function () {
  targetFranchise.on("ready", async function () {
    const sourcePlayer = sourceFranchise.getTableByUniqueId(SOURCE_TABLES.playerTable);
    const targetPlayer = targetFranchise.getTableByUniqueId(TARGET_TABLES.playerTable);
    await FranchiseUtils.readTableRecords([sourcePlayer, targetPlayer]);
    const sourceColumns = FranchiseUtils.getColumnNames(sourcePlayer);
    const columns = FranchiseUtils.getColumnNames(targetPlayer);
    const filteredColumns = columns.filter(
      (column) =>
        (column.includes("Rating") && !column.includes("Original")) ||
        column.includes("Grade") ||
        (TRANSFER_DEV_TRAITS && column.includes("TraitDevelopment")),
    );

    for (const record of targetPlayer.records) {
      if (!FranchiseUtils.isValidPlayer(record)) continue;
      const assetName = record.PLYR_ASSETNAME;

      // First try a direct asset-name match
      let sourceRecord = sourcePlayer.records.find(
        (srcRecord) => srcRecord.PLYR_ASSETNAME === assetName && FranchiseUtils.isValidPlayer(srcRecord),
      );

      // Fall back to a fuzzy search if the asset names don't line up
      if (!sourceRecord && (!ROOKIES_ONLY || record.YearsPro === 0)) {
        const playerName = `${record.FirstName} ${record.LastName}`;
        const skippedPlayers = [];
        const options = {
          age: record.Age,
          college: await FranchiseUtils.getCollege(targetFranchise, record.College),
          position: record.Position,
          yearsPro: record.YearsPro,
        };
        let matchIndex = await StartTodayUtils.searchForPlayer(
          sourceFranchise,
          SOURCE_TABLES,
          playerName,
          0.95,
          skippedPlayers,
          record.TeamIndex,
          options,
        );
        if (matchIndex === -1) {
          matchIndex = await StartTodayUtils.searchForPlayer(
            sourceFranchise,
            SOURCE_TABLES,
            playerName,
            0.6,
            skippedPlayers,
            record.TeamIndex,
            options,
          );
        }
        if (matchIndex !== -1) {
          sourceRecord = sourcePlayer.records[matchIndex];
        }
      }
      if (sourceRecord) {
        for (const col of filteredColumns) {
          if (sourceColumns.includes(col)) {
            record[col] = sourceRecord[col];
          }
        }
        const { newOverall, newArchetype } = FranchiseUtils.calculateBestOverall(
          record,
          targetFranchise.schema.meta.gameyear,
        );
        try {
          record.PlayerType = newArchetype;
        } catch (err) {
          if (newArchetype === "DT_RunStopper") {
            record.PlayerType = "DT_NoseTackle";
          } else {
            console.log(err);
          }
        }
        record.OverallRating = newOverall;
      } else {
        console.log(`Couldn't find matching player for ${assetName}`);
      }
    }
    console.log("Successfully transfered player ratings");
    await FranchiseUtils.saveFranchiseFile(targetFranchise);
    FranchiseUtils.EXIT_PROGRAM();
  });
});
