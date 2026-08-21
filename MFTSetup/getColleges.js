



const FranchiseUtils = require('../Utils/FranchiseUtils');

const validGameYears = [FranchiseUtils.YEARS.M26, FranchiseUtils.YEARS.M27];

// This uses the franchise-league-binary.FTC file
const franchise = FranchiseUtils.init(validGameYears, {isFtcFile: true, promptForBackup: false})

franchise.on('ready', async function () {
    const collegeTable = franchise.getTableByUniqueId(131382980);
    await FranchiseUtils.readTableRecords([collegeTable]);
    const options = {includeRow: false, includeBinary: false};
    const collegeArray = await FranchiseUtils.getTableDataAsArray(franchise, collegeTable, options);
    FranchiseUtils.convertArrayToJSONFile(collegeArray, 'colleges.json');    
});