(function(root){'use strict';
const ranks={SS:15,'S+':14,S:13,'A+':12,A:11,'B+':10,B:9,'C+':8,C:7,'D+':6,D:5,'E+':4,E:3,F:2,G:1};
const alphabetic=new Set(['名前','_position','_group','成長','投/打','出身','高校','大学','社会人','タイプ','モデル','スキル1','スキル2','スキル3']);
const empty=x=>x===null||x===undefined||String(x).trim()===''||['—','–','-','無','不明'].includes(String(x).trim());
function parse(v,key){
 if(empty(v))return null;
 const text=String(v).normalize('NFKC').trim(),last=text.split(/[/／]/).at(-1)?.trim()||text;
 if(key==='_status')return{number:({確認:3,推定:2,候選:1,待辨識:0})[text]??-1};
 if(typeof v==='number')return{number:v};
 if(Object.prototype.hasOwnProperty.call(ranks,last.toUpperCase()))return{number:ranks[last.toUpperCase()]};
 if(/^\d+(?:\.\d+)?(?:歳|歲|km\/h|km|球|人)?$/i.test(text))return{number:parseFloat(text)};
 if(key==='球速'&&/^\d+(?:\.\d+)?$/.test(last))return{number:Number(last)};
 return{text};
}
function defaultDir(key){return key==='_screen'||alphabetic.has(key)?'asc':'desc'}
function compare(a,b,key,dir=defaultDir(key)){
 const x=parse(a,key),y=parse(b,key);
 if(!x&&!y)return 0;if(!x)return 1;if(!y)return -1;
 const diff=x.number!==undefined&&y.number!==undefined?x.number-y.number:String(x.text??a).localeCompare(String(y.text??b),'ja',{numeric:true,sensitivity:'base'});
 return dir==='desc'?-diff:diff;
}
function sortRows(rows,key,dir,value){return rows.map((row,i)=>({row,i})).sort((a,b)=>compare(value(a.row,key),value(b.row,key),key,dir)||a.i-b.i).map(x=>x.row)}
root.YT3_TableSort={parse,compare,sortRows,defaultDir};
})(typeof window!=='undefined'?window:globalThis);
