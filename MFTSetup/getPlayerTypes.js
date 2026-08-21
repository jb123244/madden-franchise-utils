const FranchiseUtils = require("../Utils/FranchiseUtils");

const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];

// This uses the franchise-tuning-binary.FTC file
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });

franchise.on("ready", async function () {
  const playerTypeTable = franchise.getTableByUniqueId(1297071877);
  await FranchiseUtils.readTableRecords([playerTypeTable]);
  const options = { includeRow: false, includeBinary: false, includeAssetId: false };
  const array = await FranchiseUtils.getTableDataAsArray(franchise, playerTypeTable, options);
  FranchiseUtils.convertArrayToJSONFile(array, "playerType.json");
});
