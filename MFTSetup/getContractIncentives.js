const FranchiseUtils = require("../Utils/FranchiseUtils");
const Franchise = require("madden-franchise").FranchiseFile;
// This uses the franchise-tuning-binary.FTC file
const validGameYears = [FranchiseUtils.YEARS.M27];
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });
franchise.on("ready", async function () {
  const contractIncentiveTable = franchise.getTableByUniqueId(778768450);
  const incentiveTypeEnumTable = franchise.getTableByUniqueId(2397120852);
  await FranchiseUtils.readTableRecords([contractIncentiveTable, incentiveTypeEnumTable]);
  const tableArray = await FranchiseUtils.getTableDataAsArray(franchise, contractIncentiveTable);
  const enumArray = await FranchiseUtils.getTableDataAsArray(franchise, incentiveTypeEnumTable, {
    includeAssetId: false,
    includeBinary: false,
    includeRow: false,
  });

  // Group all incentives with the same Goal together, then order each group by Compensation.
  tableArray.sort((a, b) => {
    if (a.Goal !== b.Goal) {
      return a.Goal < b.Goal ? -1 : 1;
    }
    return a.Compensation - b.Compensation;
  });

  FranchiseUtils.convertArrayToJSONFile(tableArray, "ContractIncentive.json");
  FranchiseUtils.convertArrayToJSONFile(enumArray, "ContractIncentiveGoalEnum.json");
});
