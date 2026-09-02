const FranchiseUtils = require("../Utils/FranchiseUtils");
const { tables } = require("../Utils/FranchiseTableId");
const { getBinaryReferenceData } = require("madden-franchise").utilService;
const fs = require("fs");

const signatureAbilities = {
  WRSignatureAbilities: {},
  TESignatureAbilities: {},
  QBSignatureAbilities: {},
  OLSignatureAbilities: {},
  OLBSignatureAbilities: {},
  MLBSignatureAbilities: {},
  K_PSignatureAbilities: {},
  HBSignatureAbilities: {},
  FS_SSSignatureAbilities: {},
  FBSignatureAbilities: {},
  DTSignatureAbilities: {},
  DESignatureAbilities: {},
  CBSignatureAbilities: {},
};

const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];
const franchise = FranchiseUtils.init(validGameYears, { isFtcFile: true, promptForBackup: false });

function writeJSON(data, file) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

franchise.on("ready", async function () {
  const SignatureAbilitiesTable = franchise.getTableByUniqueId(tables.signatureAbilitesFtcTable);
  const SignatureByPosition = franchise.getTableByUniqueId(tables.signatureByPositionFtcTable);
  const PositionSignatureAbilityArray = franchise.getTableByUniqueId(3517346360);
  const PositionSignatureAbility = franchise.getTableByUniqueId(tables.positionSignatureAbilityFtcTable);
  const SignatureAbility = franchise.getTableByUniqueId(tables.signatureAbilityFtcTable);
  const gameYear = parseInt(franchise.schema.meta.gameYear);

  const tableId = PositionSignatureAbility.header.tableId;
  const signatureAbilityTableId = SignatureAbility.header.tableId;

  await FranchiseUtils.readTableRecords([
    SignatureAbilitiesTable,
    SignatureByPosition,
    PositionSignatureAbilityArray,
    PositionSignatureAbility,
    SignatureAbility,
  ]);

  const allAssets = franchise.assetTable;

  // -----------------------
  // Extract ability indices
  // -----------------------
  function extractAbilityIndices(arrayTable, abilityTable, binValue, capacity) {
    const out = [];
    if (binValue === FranchiseUtils.ZERO_REF) return out;

    const rowRef = FranchiseUtils.bin2Dec(binValue.slice(15));
    const row = arrayTable.records[rowRef];

    for (let i = 0; i < capacity; i++) {
      const abilityBin = row[`PositionSignatureAbility${i}`];
      if (abilityBin === FranchiseUtils.ZERO_REF) continue;

      const posAbilityRow = FranchiseUtils.bin2Dec(abilityBin.slice(15));
      const abilityBinRef = abilityTable.records[posAbilityRow]["Ability"];
      const abilityRow = FranchiseUtils.bin2Dec(abilityBinRef.slice(15));

      out.push({ posAbilityRow, abilityRow });
    }
    return out;
  }

  // ----------------------------------------
  // Build legacy structure with new fields
  // ----------------------------------------
  for (const key in signatureAbilities) {
    const colBinary = SignatureAbilitiesTable.records[0][key];
    const sigRowRef = FranchiseUtils.bin2Dec(colBinary.slice(15));
    const sigRow = SignatureByPosition.records[sigRowRef];

    const active = extractAbilityIndices(
      PositionSignatureAbilityArray,
      PositionSignatureAbility,
      sigRow["ActiveSignatures"],
      PositionSignatureAbilityArray.header.numMembers,
    );

    const passive = extractAbilityIndices(
      PositionSignatureAbilityArray,
      PositionSignatureAbility,
      sigRow["PassiveSignatures"],
      PositionSignatureAbilityArray.header.numMembers,
    );

    const xFactorRows = active.map((a) => a.abilityRow);

    signatureAbilities[key].XFactorAbilities = [];
    signatureAbilities[key].SuperStarAbilities = [];

    const allAbilities = [...active, ...passive];

    for (const { posAbilityRow, abilityRow } of allAbilities) {
      const ability = SignatureAbility.records[abilityRow];
      if (!ability?.Name || ability.Name.trim() === "") continue;

      const abilityType = xFactorRows.includes(abilityRow) ? "XFactorAbilities" : "SuperStarAbilities";

      const posAbilityRecord = PositionSignatureAbility.records[posAbilityRow];

      const binRef = getBinaryReferenceData(tableId, posAbilityRow);
      const assetRef = FranchiseUtils.bin2Dec(binRef);

      const assetId = allAssets.find((a) => a.reference === assetRef)?.assetId;
      const finalBin = FranchiseUtils.dec2bin(assetId, 2);

      if (gameYear < FranchiseUtils.YEARS.M27) {
        signatureAbilities[key][abilityType].push({
          assetId,
          binary: finalBin,
          Ability: ability.Name,
          GUID: ability.GUID,
          Description: ability.Description,
          Disable: posAbilityRecord?.Disable ?? null,
          ArchetypeRequirement: posAbilityRecord?.ArchetypeRequirement ?? null,
          MaxSlotPosition: posAbilityRecord?.MaxSlotPosition ?? null,
          MinSlotPosition: posAbilityRecord?.MinSlotPosition ?? null,
          OVRRequirement: posAbilityRecord?.OVRRequirement ?? null,
          DraftPositionRequirement: posAbilityRecord?.DraftPositionRequirement ?? null,
          IconId: ability.IconId,
        });
      } else {
        signatureAbilities[key][abilityType].push({
          assetId,
          binary: finalBin,
          Ability: ability.Name,
          GUID: ability.GUID,
          Description: ability.Description,
          DescriptionSilver: ability.DescriptionSilver,
          DescriptionGold: ability.DescriptionGold,
          Disable: posAbilityRecord?.Disable ?? null,
          ArchetypeRequirement: posAbilityRecord?.ArchetypeRequirement ?? null,
          MaxSlotPosition: posAbilityRecord?.MaxSlotPosition ?? null,
          MinSlotPosition: posAbilityRecord?.MinSlotPosition ?? null,
          OVRRequirement: posAbilityRecord?.OVRRequirement ?? null,
          DraftPositionRequirement: posAbilityRecord?.DraftPositionRequirement ?? null,
          IconId: ability.IconId,
        });
      }
    }
  }

  const flatAbilities = [];

  for (const [positionKey, positionData] of Object.entries(signatureAbilities)) {
    const position = positionKey.replace("SignatureAbilities", "");

    for (const ability of positionData.XFactorAbilities ?? []) {
      const { assetId, binary, ...rest } = ability;
      flatAbilities.push({ assetId, binary, position, activeAbility: true, ...rest });
    }

    for (const ability of positionData.SuperStarAbilities ?? []) {
      const { assetId, binary, ...rest } = ability;
      flatAbilities.push({ assetId, binary, position, activeAbility: false, ...rest });
    }
  }

  // ----------------------------------------------------------
  // Append externally-unlocked abilities from SignatureAbility
  // (skip any already included from the position-based pass,
  // by binary ref or by ability name)
  // ----------------------------------------------------------
  /*const includedBinaries = new Set(flatAbilities.map((a) => a.binary));
  const includedNames = new Set(flatAbilities.map((a) => a.Ability));

  for (let abilityRow = 0; abilityRow < SignatureAbility.header.recordCapacity; abilityRow++) {
    const ability = SignatureAbility.records[abilityRow];
    if (!ability) continue;
    if (!ability.UnlockedExternally) continue;
    if (!ability.Name || ability.Name.trim() === "") continue;
    if (includedNames.has(ability.Name)) continue;

    const binRef = getBinaryReferenceData(signatureAbilityTableId, abilityRow);
    const assetRef = FranchiseUtils.bin2Dec(binRef);
    const assetId = allAssets.find((a) => a.reference === assetRef)?.assetId;
    const finalBin = FranchiseUtils.dec2bin(assetId, 2);

    if (includedBinaries.has(finalBin)) continue;

    flatAbilities.push({
      assetId,
      binary: finalBin,
      position: null,
      activeAbility: false,
      Ability: ability.Name,
      GUID: ability.GUID,
      Description: ability.Description,
      Disable: false,
      ArchetypeRequirement: "Invalid_",
      MaxSlotPosition: 5,
      MinSlotPosition: 1,
      OVRRequirement: 0,
      DraftPositionRequirement: "Invalid_",
      IconId: ability.IconId,
    });

    includedBinaries.add(finalBin);
    includedNames.add(ability.Name);
  }*/

  writeJSON(flatAbilities, "abilities.json");
});
