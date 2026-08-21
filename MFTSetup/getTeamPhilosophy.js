const FranchiseUtils = require("../Utils/FranchiseUtils");

const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];

// This uses the franchise-tuning-binary.FTC file
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });

franchise.on("ready", async function () {
  const teamPhilosophy = franchise.getTableByUniqueId(814404633);
  await FranchiseUtils.readTableRecords([teamPhilosophy]);
  const options = { includeRow: true, includeBinary: true, includeAssetId: true, convertRefToRowNo: true };
  const array = await FranchiseUtils.getTableDataAsArray(franchise, teamPhilosophy, options);
  FranchiseUtils.convertArrayToJSONFile(array, "teamPhilosophy.json");
});
