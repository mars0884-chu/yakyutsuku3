/* r66：依遊戲截圖字形修正名冊顯示，保留原始寫法供搜尋與追溯。 */
(function(){'use strict';
const FIXES=[{from:'神埼 孝司',to:'神崎 孝司',position:'外野手',group:'國內新人',note:'截圖字形為崎'}];
function apply(players){let changed=0;const out=players.map(p=>{const f=FIXES.find(x=>x.from===p['名前']&&(!x.position||x.position===p._position)&&(!x.group||x.group===p._group));if(!f)return p;changed++;return{...p,'名前':f.to,_nameOrig:f.from}});return{players:out,changed}}
window.yt3NameFixes={FIXES,apply};})();
