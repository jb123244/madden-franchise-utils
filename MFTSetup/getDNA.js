const FranchiseUtils = require("../Utils/FranchiseUtils");
const Franchise = require("madden-franchise").FranchiseFile;
// This uses the franchise-tuning-binary.FTC file
const validGameYears = [FranchiseUtils.YEARS.M27];
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });

// Runs the Value + Exclusions lookup passes against a single dnaRefTable (row 1 = value
// assignments, row 0 = exclusion assignments), both pointing back at the same PersonaDNA
// table. Only entries actually found in the Value-assignment pass are kept in the output —
// PersonaDNA rows with no corresponding entry there are intentionally dropped.
async function buildPersonaDnaJson(franchise, baseDnaArray, dnaRefTable, baseDna, outputFileName) {
  // Fresh copies per call so mutations (Value, Exclusions) from one ref table's lookup
  // don't leak into the other table's output.
  const dnaByRow = new Map(baseDnaArray.map((entry) => [entry.Row, { ...entry }]));
  const dnaByValue = new Map();
  const includedRows = new Set();

  // --- Row 1: array record whose columns each ref -> { Asset: single PersonaDNA ref, Value } ---
  const valueAssignmentArrayRecord = dnaRefTable.records[baseDna ? 1 : 0];
  for (const col of FranchiseUtils.getColumnNames(valueAssignmentArrayRecord)) {
    const assignmentRecord = await FranchiseUtils.getReferencedRecord(franchise, valueAssignmentArrayRecord[col]);
    if (!assignmentRecord) continue;

    const dnaEntryRecord = await FranchiseUtils.getReferencedRecord(franchise, assignmentRecord.Asset);
    if (!dnaEntryRecord) continue;

    const { row: dnaRow } = FranchiseUtils.getRowAndTableIdFromRef(assignmentRecord.Asset);
    const dnaEntry = dnaByRow.get(dnaRow);
    if (!dnaEntry) continue;

    dnaEntry.Value = assignmentRecord.Value;
    dnaByValue.set(assignmentRecord.Value, dnaEntry);
    includedRows.add(dnaRow);
  }

  // --- Row 0: array record whose columns each ref -> { Asset: PersonaDNA[] array ref, Value } ---
  const exclusionAssignmentArrayRecord = dnaRefTable.records[baseDna ? 0 : 1];
  for (const col of FranchiseUtils.getColumnNames(exclusionAssignmentArrayRecord)) {
    const assignmentRecord = await FranchiseUtils.getReferencedRecord(franchise, exclusionAssignmentArrayRecord[col]);
    if (!assignmentRecord) continue;

    const dnaEntry = dnaByValue.get(assignmentRecord.Value);
    if (!dnaEntry) continue; // not in the Value lookup -> excluded from output regardless

    const exclusionArrayRecord = await FranchiseUtils.getReferencedRecord(franchise, assignmentRecord.Asset);
    if (!exclusionArrayRecord) continue;

    dnaEntry.Exclusions = [];
    for (const excCol of FranchiseUtils.getColumnNames(exclusionArrayRecord)) {
      const excludedRecord = await FranchiseUtils.getReferencedRecord(franchise, exclusionArrayRecord[excCol]);
      if (!excludedRecord) continue;
      const { row: excludedRow } = FranchiseUtils.getRowAndTableIdFromRef(exclusionArrayRecord[excCol]);
      dnaEntry.Exclusions.push(excludedRow);
    }
  }

  const filteredDnaArray = baseDnaArray
    .filter((entry) => includedRows.has(entry.Row))
    .map((entry) => dnaByRow.get(entry.Row));

  FranchiseUtils.convertArrayToJSONFile(filteredDnaArray, outputFileName);
}

franchise.on("ready", async function () {
  const personaDnaTable = franchise.getTableByUniqueId(1431993561);
  const dnaRefTable = franchise.getTableByUniqueId(113243260);
  const tempDnaRefTable = franchise.getTableByUniqueId(4084147475);
  await FranchiseUtils.readTableRecords([personaDnaTable, dnaRefTable, tempDnaRefTable]);

  const baseDnaArray = await FranchiseUtils.getTableDataAsArray(franchise, personaDnaTable, {includeBinary: false, includeAssetId: false, includeRow: true});

  await buildPersonaDnaJson(franchise, baseDnaArray, dnaRefTable, true, "PersonaDNA.json");
  await buildPersonaDnaJson(franchise, baseDnaArray, tempDnaRefTable, false, "TempPersonaDNA.json");
});
