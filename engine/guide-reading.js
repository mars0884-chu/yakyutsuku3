(function(root){
'use strict';
const layout=[
['opening','第一篇｜開局與第一年','開局操作、第一年資金與推薦球員',[
 ['start','開局流程',['start']],['roster','初始名單與預算',['recommended']]]],
['people','第二篇｜找人、選秀、交易與契約','新秀、架空與OB、外國人、年薪及交易',[
 ['select','新人、選秀與交易',['acquire','lastdig_20261005']],['models','選手原型、推薦與成長',['models_20261005','aging']],['foreign','外國人與海外學院',['academy']],['contracts','年薪、契約與名單控制',['cheap','random']]]],
['train','第三篇｜春訓、留學與育成','Camp、教練技能、留學、球種、傷病與能力實驗',[
 ['camp','春訓與教練',['camp']],['abroad','留學與解鎖',['study']],['skills','技能與傳承',['skills']],['created','自創球員、疲勞與狀態',['created','conditioning']],['experiments','變化球、打擊與捕手實驗',['pitch','experiments_20261005']]]],
['management','第四篇｜球團經營、設施與城市','球團收入、球場、主場與聯盟營運',[
 ['economy','資金與經營',['economy']],['facilities','球場與訓練設施',['facilities']],['town','HomeTown 主場城市',['home']],['league','TV、球團友好度與聯盟',['leagueops']]]],
['ideas','第五篇｜經營企劃、道具與活動','Idea Memo、企劃組合、季節活動與道具來源',[
 ['memo','企劃、活動與 Idea Memo',['idea']]]],
['games','第六篇｜比賽、戰術與長期經營','Team Color、實戰心得、紀錄與避免踩雷',[
 ['color','Team Color 球隊風格',['team']],['tactics','戰術、紀錄與實戰案例',['advanced','tips','new_20261005']],['bugs','Bug 與避免踩雷',['bugs']]]],
['modes','第七篇｜一年模式與其他模式','一年模式、對戰與遊戲選單',[
 ['year','一年模式與對戰',['one']]]]];
const overrides={
 'lastdig_20261005':{2:'archive',3:'archive'},
 'new_20261005':{1:'people/contracts'},
 'history_20261005':{0:'opening/roster',1:'archive',2:'archive',3:'people/models',4:'games/tactics',5:'people/models'},
 'research':{7:'opening/start'}
};
function compile(book){
 const chapters=layout.map(([id,title,summary,parts])=>({id,title,summary,parts:parts.map(([pid,ptitle,ids])=>({id:pid,title:ptitle,ids,sections:[]})),sections:[],count:0}));
 const routes=new Map();
 for(const ch of chapters)for(const part of ch.parts)for(const id of part.ids){if(routes.has(id))throw Error('duplicate source chapter: '+id);routes.set(id,ch.id+'/'+part.id)}
 const archive=[],seen=new Set();let sourceSections=0;
 for(const ch of book){
  if(ch.id==='cheats_20261005')continue;
  for(const [i,s] of (ch.sections||[]).entries()){
   const key=ch.id+':'+i;if(seen.has(key))throw Error('duplicated '+key);seen.add(key);sourceSections++;
   const location=overrides[ch.id]?.[i]||((ch.id==='sources'||ch.id==='research')?'archive':routes.get(ch.id));
   if(!location)throw Error('unmapped source: '+key);
   const section={...s,readingId:'rd-'+ch.id+'-'+i,originalChapterId:ch.id,originalChapterTitle:ch.title};
   if(location==='archive'){archive.push(section);continue}
   const [vid,pid]=location.split('/'),part=chapters.find(v=>v.id===vid)?.parts.find(x=>x.id===pid);
   if(!part)throw Error('bad location '+key+' '+location);part.sections.push(section);
  }
 }
 for(const ch of chapters){
  ch.parts=ch.parts.filter(p=>p.sections.length);ch.sections=ch.parts.flatMap(p=>p.sections);
  ch.count=ch.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0);
  if(!ch.count)throw Error('empty chapter '+ch.id);
 }
 const readingSections=chapters.reduce((n,c)=>n+c.sections.length,0);
 if(readingSections+archive.length!==sourceSections)throw Error('missing guide sections');
 return{chapters,archive,sourceSections,readingSections};
}
root.YT3_GuideReading={compile};
})(typeof window!=='undefined'?window:globalThis);
