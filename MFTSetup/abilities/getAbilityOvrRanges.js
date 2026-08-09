const FranchiseUtils = require("../../Utils/FranchiseUtils");
const fs = require("fs");
const path = require("path");
const gameYear = FranchiseUtils.YEARS.M26;
const franchise = FranchiseUtils.init(gameYear, { isFtcFile: true, promptForBackup: false });
function writeJSON(data, file) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}
franchise.on("ready", async function () {
  const signatureAbilitiesTable = franchise.getTableByUniqueId(4012247826);
  await FranchiseUtils.readTableRecords([signatureAbilitiesTable]);
  const signatureAbilitiesColumns = FranchiseUtils.getColumnNames(signatureAbilitiesTable);
  const signatureAbilitiesRow = signatureAbilitiesTable.records[0];
  // Resolves an OVR list ref (e.g. OnlyPassiveSlotsOVRList) into a flat array of non-zero ints (int0-int4)
  async function getOVRListValues(ovrListBin) {
    if (!ovrListBin || ovrListBin === FranchiseUtils.ZERO_REF) return [];
    const { tableId, row } = FranchiseUtils.getRowAndTableIdFromRef(ovrListBin);
    const ovrListTable = franchise.getTableById(tableId);
    await FranchiseUtils.readTableRecords([ovrListTable]);
    const ovrListRow = ovrListTable.records[row];
    const ovrListColumns = FranchiseUtils.getColumnNames(ovrListTable);
    const values = [];
    for (const col of ovrListColumns) {
      const value = ovrListRow[col];
      if (!value) continue;
      values.push(value);
    }
    return values;
  }
  const result = {};
  for (const column of signatureAbilitiesColumns) {
    if (!column.endsWith("SignatureAbilities")) continue;
    const position = column.replace("SignatureAbilities", "");
    const signatureByPositionBin = signatureAbilitiesRow[column];
    if (!signatureByPositionBin || signatureByPositionBin === FranchiseUtils.ZERO_REF) continue;
    const { tableId: sbpTableId, row: sbpRowIndex } = FranchiseUtils.getRowAndTableIdFromRef(signatureByPositionBin);
    const signatureByPositionTable = franchise.getTableById(sbpTableId);
    await FranchiseUtils.readTableRecords([signatureByPositionTable]);
    const signatureByPositionRow = signatureByPositionTable.records[sbpRowIndex];
    const passive = await getOVRListValues(signatureByPositionRow["OnlyPassiveSlotsOVRList"]);
    const active = await getOVRListValues(signatureByPositionRow["GamebreakerSlotsOVRList"]);
    result[position] = { passive, active };
  }
  writeJSON(result, "AbilityOVRRangesByPosition.json");
  console.log(`Done writing AbilityOVRRangesByPosition.json (${Object.keys(result).length} keys)`);
});