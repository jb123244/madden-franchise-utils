const FranchiseUtils = require("../Utils/FranchiseUtils");

// This uses the franchise-league-binary.FTC file
const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });

franchise.on("ready", async function () {
  const uiFormTable = franchise.getTableByUniqueId(3972321860);

  await FranchiseUtils.readTableRecords([uiFormTable]);
  const tableArray = await FranchiseUtils.getTableDataAsArray(franchise, uiFormTable);
  FranchiseUtils.convertArrayToJSONFile(tableArray, "UISelectForm.json");
});
