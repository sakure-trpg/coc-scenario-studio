export type Box={x:number;y:number;w:number;h:number};
export const resizeDirections=['nw','n','ne','e','se','s','sw','w'] as const;
export type ResizeDirection=typeof resizeDirections[number];
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
/** Resize in canvas coordinates, preserving the opposite edges. */
export function resizeBox(box:Box,direction:ResizeDirection,dx:number,dy:number):Box {
 let left=box.x,top=box.y,right=box.x+box.w,bottom=box.y+box.h;
 if(direction.includes('w'))left=clamp(Math.round(left+dx),0,right-20);
 if(direction.includes('e'))right=clamp(Math.round(right+dx),left+20,1280);
 if(direction.includes('n'))top=clamp(Math.round(top+dy),0,bottom-20);
 if(direction.includes('s'))bottom=clamp(Math.round(bottom+dy),top+20,720);
 return {x:left,y:top,w:right-left,h:bottom-top};
}
export type PanelWidths={left:number;right:number};
export function fitPanels(widths:PanelWidths,total:number,collapsed=false):PanelWidths{
 const available=Math.max(340,total-320);
 const left=collapsed?widths.left:clamp(widths.left,170,Math.min(640,available-170));
 const right=clamp(widths.right,170,Math.min(640,available-(collapsed?0:left)));
 return {left,right};
}
export function resizePanel(widths:PanelWidths,side:'left'|'right',delta:number,total:number,collapsed=false):PanelWidths{
 const other=side==='left'?widths.right:collapsed?0:widths.left;
 const max=Math.max(170,Math.min(640,total-320-other));
 return {...widths,[side]:Math.round(clamp(widths[side]+delta,170,max))};
}
