// Driver discovery runs off the UI thread. No drawing or scene assets are needed.
let result='unknown';
try{
 const canvas=new OffscreenCanvas(1,1);
 const gl=canvas.getContext('webgl2',{failIfMajorPerformanceCaveat:false});
 if(gl){
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  const device=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'';
  if(device)result=/SwiftShader|llvmpipe|softpipe|software rasterizer/i.test(device)?'software':'hardware';
  gl.getExtension('WEBGL_lose_context')?.loseContext();
 }
}catch{}
self.postMessage(result);
self.close();
