// Parse spreadsheets away from the UI. Bound ZIP expansion before reading XLSX.
importScripts('../../vendor/exceljs-4.4.0.min.js');
function inspectZip(buffer){
 const v=new DataView(buffer);let end=-1;
 for(let i=v.byteLength-22;i>=Math.max(0,v.byteLength-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('不是有效的 XLSX 檔案');
 const entries=v.getUint16(end+10,true),size=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
 if(entries>400||entries===65535||start+size>end)throw Error('Excel 結構超過此 Demo 可處理範圍');
 let pos=start,total=0;
 for(let i=0;i<entries;i++){
  if(pos+46>end||v.getUint32(pos,true)!==0x02014b50)throw Error('Excel ZIP 結構錯誤');
  const packed=v.getUint32(pos+20,true),expanded=v.getUint32(pos+24,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);
  total+=expanded;if(expanded>5*1048576||total>20*1048576||expanded>Math.max(4096,packed*150))throw Error('Excel 解壓內容過大，請減少資料量');
  pos+=46+len+extra+comment;if(pos>start+size)throw Error('Excel ZIP 結構錯誤');
 }
}
self.onmessage=async e=>{
 try{
  inspectZip(e.data);const book=new ExcelJS.Workbook();await book.xlsx.load(e.data,{ignoreNodes:['mergeCells','dataValidations','conditionalFormatting','drawing','sheetProtection','hyperlinks','extLst','tableParts','picture']});
  const sheet=book.getWorksheet('Applications')||book.worksheets[0];if(!sheet)throw Error('Excel 沒有資料工作表');
  if(sheet.rowCount>201||sheet.columnCount>100)throw Error('每次最多 200 筆、100 欄；請移除多餘資料及格式');
  const grid=[];for(let i=1;i<=sheet.rowCount;i++){
   const row=[];for(let j=1;j<=sheet.columnCount;j++){
    const cell=sheet.getCell(i,j),value=cell.value;
    if(value&&typeof value==='object'&&(value.formula||value.sharedFormula))row.push('=FORMULA');
    else if(value instanceof Date)row.push(value.toISOString().slice(0,10));
    else if(value&&typeof value==='object'&&value.richText)row.push(value.richText.map(x=>x.text).join(''));
    else if(value&&typeof value==='object'&&value.error)throw Error(`第 ${i} 列含 Excel 錯誤值`);
    else row.push(value==null?'':typeof value==='object'?String(value.text??''):String(value));
    if(row.at(-1).length>5000)throw Error('欄位內容超過 5,000 字元');
   }grid.push(row);
  }self.postMessage({grid});
 }catch(error){self.postMessage({error:error.message||'Excel 讀取失敗'});}
};
