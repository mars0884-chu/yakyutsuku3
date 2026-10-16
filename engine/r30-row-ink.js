/* r30: deterministic occupied-name detection on the aligned 405x252 game panel.
 * The status/icon column is deliberately excluded: a row icon is not a player name.
 * No AI, candidate names, file identifiers, or roster answers are involved.
 */
(function(){'use strict';
const cache=new WeakMap();
function inspect(canvas,row){
 if(!canvas||row<1||row>11)return{hasName:true,uncertain:true,ink:-1};
 let sums=cache.get(canvas);
 if(!sums){
  sums=[];
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  for(let n=1;n<=11;n++){
   const y=Math.round(41+15.9*(n-1))-1;
   // Exclude x<39 (position badge) and x>=160 (age and hand).
   const d=ctx.getImageData(39,y,121,16).data;
   let ink=0;
   for(let k=0;k<d.length;k+=4){
    const g=Math.round(d[k]*.299+d[k+1]*.587+d[k+2]*.114);
    if(g>140)ink++;
   }
   sums[n]=ink;
  }
  cache.set(canvas,sums);
 }
 const ink=sums[row];
 return{hasName:ink>=60,uncertain:ink>=40&&ink<60,ink};
}
window.yt3RowInkGate=inspect;
})();