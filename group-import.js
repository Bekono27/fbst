(function(root){
 function parse(text){
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0],delimiter=first.includes('\t')?'\t':',';
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(!quoted&&field!=='')throw Error('CSV ишлэл буруу байна.');else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw Error('CSV ишлэл хаагдаагүй байна.');row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw Error('Гарчиг болон мэдээллийн мөр шаардлагатай.');return {headers:rows[0],rows:rows.slice(1)};
 }
 if(typeof module!=='undefined')module.exports={parse};else root.GroupImport={parse};
})(typeof window!=='undefined'?window:globalThis);
