/* Albedo and scalar data maps deliberately use separate colour spaces. */
window.createBookMaterials = (T, renderer, book, index, ready) => {
 const canvas = () => { const c=document.createElement('canvas');c.width=1024;c.height=1536;return c; };
 const art=canvas(), mask=canvas(), g=art.getContext('2d'), m=mask.getContext('2d');
 const cream=index===1;
 g.fillStyle=cream?'#F2EFE7':'#171713';g.fillRect(0,0,1024,1536);
 m.fillStyle='#000';m.fillRect(0,0,1024,1536);
 function lettering(ctx,color){
  ctx.fillStyle=color;ctx.textAlign='center';ctx.font='600 95px Newsreader, Georgia';
  const lines=cream?['WHEN','ADVANTAGE','EXPIRES']:['BUILT'];
  lines.forEach((line,i)=>ctx.fillText(line,512,260+i*112,910));
  ctx.font='26px Instrument Sans, sans-serif';ctx.fillText('GARETH ANDREW MACKENZIE',512,1400,900);
 }
 lettering(g,'#B5995A');lettering(m,'#fff');
 g.strokeStyle='#B5995A';g.lineWidth=2;
 if(cream){
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;g.beginPath();for(let j=0;j<=64;j++){const y=640+j*9,r=30+220*Math.abs((y-928)/288),x=512+Math.cos(a)*r;j?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
  for(const y of [630,1225]){g.beginPath();g.ellipse(512,y,250,22,0,0,Math.PI*2);g.stroke()}
 }else{
  for(let i=0;i<20;i++){g.strokeRect(160+i*15,650+i*12,704-i*30,520-i*24)}
  g.font='38px Newsreader, Georgia';g.textAlign='center';g.fillStyle='#D0C9BC';g.fillText('How Wealth Is Deliberately Constructed',512,470,900);
 }
 function texture(c,data=false){const t=new T.CanvasTexture(c);t.colorSpace=data?T.NoColorSpace:T.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t}
 const albedo=texture(art),metalCanvas=canvas(),roughCanvas=canvas();
 const metal=texture(metalCanvas,true),rough=texture(roughCanvas,true);
 function maps(){
  const pixels=m.getImageData(0,0,1024,1536);
  for(const [c,foil,cloth] of [[metalCanvas,.88,.05],[roughCanvas,.22,.78]]){
   const context=c.getContext('2d'),out=context.createImageData(1024,1536);
   for(let p=0;p<out.data.length;p+=4){const value=Math.round(255*(cloth+(foil-cloth)*pixels.data[p]/255));out.data[p]=out.data[p+1]=out.data[p+2]=value;out.data[p+3]=255}context.putImageData(out,0,0);
  }metal.needsUpdate=rough.needsUpdate=true;
 }
 maps();
 const front=new T.MeshStandardMaterial({map:albedo,color:cream?0xF2EFE7:0xffffff,metalness:1,roughness:1,metalnessMap:metal,roughnessMap:rough});
 const spineArt=canvas();const s=spineArt.getContext('2d');s.fillStyle=cream?'#F2EFE7':'#171713';s.fillRect(0,0,1024,1536);s.save();s.translate(512,768);s.rotate(-Math.PI/2);s.textAlign='center';s.fillStyle='#C5A059';s.font='72px Newsreader, Georgia';s.fillText(book.title.toUpperCase(),0,0,1350);s.restore();
 const spineMask=canvas(),sm=spineMask.getContext('2d');sm.fillStyle='#0d0d0d';sm.fillRect(0,0,1024,1536);sm.save();sm.translate(512,768);sm.rotate(-Math.PI/2);sm.textAlign='center';sm.fillStyle='#e0e0e0';sm.font='72px Newsreader, Georgia';sm.fillText(book.title.toUpperCase(),0,0,1350);sm.restore();
 const spineRough=canvas(),sr=spineRough.getContext('2d'),sp=sm.getImageData(0,0,1024,1536);
 for(let p=0;p<sp.data.length;p+=4){const v=sp.data[p]>100?56:199;sp.data[p]=sp.data[p+1]=sp.data[p+2]=v}sr.putImageData(sp,0,0);
 const spine=new T.MeshStandardMaterial({map:texture(spineArt),metalness:1,metalnessMap:texture(spineMask,true),roughness:1,roughnessMap:texture(spineRough,true)});
 const image=new Image();
 image.onload=()=>{
  g.fillStyle=cream?'#F2EFE7':'#171713';g.fillRect(0,0,1024,1536);
  g.drawImage(image,0,0,1024,1536);albedo.needsUpdate=true;
  const pixels=g.getImageData(0,0,1024,1536),foilPixels=m.createImageData(1024,1536);
  // Restrict the mask to the actual dark title and author lettering. Warm paper
  // must remain matte; selecting its gold hue creates rectangular specular bands.
  for(let p=0;p<pixels.data.length;p+=4){
   const x=(p/4%1024)/1024,y=Math.floor(p/4/1024)/1536;
   const titleArea=index===0?(x>.035&&x<.66&&y>.215&&y<.345)||(x>.12&&x<.9&&y>.953&&y<.985):(x>.08&&x<.92&&y>.045&&y<.29)||(x>.10&&x<.91&&y>.86&&y<.91);
   const luminance=(pixels.data[p]+pixels.data[p+1]+pixels.data[p+2])/3;
   const coverage=titleArea?Math.max(0,Math.min(1,(125-luminance)/55)):0;
   foilPixels.data[p]=foilPixels.data[p+1]=foilPixels.data[p+2]=Math.round(coverage*255);foilPixels.data[p+3]=255;
   if(coverage){for(const [channel,gold] of [197,160,89].entries())pixels.data[p+channel]=pixels.data[p+channel]*(1-coverage)+gold*coverage}
  }
  g.putImageData(pixels,0,0);m.putImageData(foilPixels,0,0);albedo.needsUpdate=true;maps();ready();
 };
 image.onerror=ready;
 image.src=index===0&&innerWidth<768?'/assets/book-cover-480.webp':book.cover;
 return {front,spine};
};
