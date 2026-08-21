



const FranchiseUtils = require('../Utils/FranchiseUtils');
const COLS_TO_KEEP = ["ShortName", "LongName", "Value"];


// This uses the franchise-tuning-binary.FTC file 
const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];
const franchise = FranchiseUtils.init(validGameYears, {isFtcFile: true, promptForBackup: false})


franchise.on('ready', async function () {
    const injuryTable = franchise.getTableByUniqueId(2893390316);
    await FranchiseUtils.readTableRecords([injuryTable]);
    const options = {includeRow: true, includeAssetId: false, includeBinary: false, columnsToReturn: COLS_TO_KEEP};
    const injuryArray = await FranchiseUtils.getTableDataAsArray(franchise, injuryTable, options);
    FranchiseUtils.convertArrayToJSONFile(injuryArray, 'injuries.json');    
});