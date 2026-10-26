import { backupAndVerify } from '../src/cms/backup'
console.log(JSON.stringify(await backupAndVerify(),null,2))
