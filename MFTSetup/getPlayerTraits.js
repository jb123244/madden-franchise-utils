const FranchiseUtils = require("../Utils/FranchiseUtils");

const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });

franchise.on("ready", async function () {
  const positionFlagTable = franchise.getTableByUniqueId(476246313);
  const footballPlayerTrait = franchise.getTableByUniqueId(2559960158);
  const enumEntryArray = franchise.getTableByUniqueId(2727529256);

  await FranchiseUtils.readTableRecords([positionFlagTable, footballPlayerTrait, enumEntryArray]);

  const positionFlagArray = await FranchiseUtils.getTableDataAsArray(franchise, positionFlagTable, {
    convertRefToRowNo: true,
    includeRow: true,
    includeAssetId: false,
    includeBinary: false,
  });

  const traitArray = await getUsedPlayerTraits(franchise, enumEntryArray, footballPlayerTrait);

  FranchiseUtils.convertArrayToJSONFile(traitArray, "PlayerTrait.json");
  FranchiseUtils.convertArrayToJSONFile(positionFlagArray, "PositionFlag.json");
});

async function getUsedPlayerTraits(franchise, enumEntryArrayTable, footballPlayerTrait) {
  const traits = [];
  const seenTraitRows = new Set();

  for (const arrayRecord of FranchiseUtils.getActiveRecords(enumEntryArrayTable)) {
    const columns = FranchiseUtils.getColumnNames(enumEntryArrayTable);

    for (const col of columns) {
      const entryRef = arrayRecord[col];
      if (entryRef === FranchiseUtils.ZERO_REF) continue;

      const enumEntryRecord = await FranchiseUtils.getReferencedRecord(franchise, entryRef);
      if (!enumEntryRecord) continue;

      const traitRef = enumEntryRecord.TraitRef;
      const value = enumEntryRecord.Value;
      if (!traitRef || traitRef === FranchiseUtils.ZERO_REF) continue;

      const traitRow = FranchiseUtils.getRowFromRef(traitRef);
      if (seenTraitRows.has(traitRow)) continue;
      seenTraitRows.add(traitRow);

      const traitRecord = footballPlayerTrait.records[traitRow];
      const rowData = await FranchiseUtils.extractRecordData(franchise, footballPlayerTrait, traitRecord, {
        includeRow: false,
        includeAssetId: false,
        includeBinary: false,
        convertRefToRowNo: true,
        columnsToReturn: ["Name", "Description"],
      });
      if (rowData) {
        rowData.Value = value;
        traits.push(rowData);
      }
    }
  }

  return traits;
}
