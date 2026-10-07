/* Jangira E Mitra Smart Document Toolkit - Perspective Engine */
window.JangiraPerspective = (() => {
  function solve(A,b){
    const n=8, M=A.map((row,i)=>row.slice(0,n).concat([b[i]]));
    for(let c=0;c<n;c++){
      let p=c; for(let r=c+1;r<n;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
      if(Math.abs(M[p][c])<1e-10) throw new Error("Invalid quadrilateral");
      [M[c],M[p]]=[M[p],M[c]];
      const d=M[c][c]; for(let j=c;j<=n;j++) M[c][j]/=d;
      for(let r=0;r<n;r++) if(r!==c){const f=M[r][c]; for(let j=c;j<=n;j++) M[r][j]-=f*M[c][j];}
    }
    return M.map(row=>row[n]);
  }
  function homography(src,dst){
    const A=[],b=[];
    for(let i=0;i<4;i++){
      const x=src[i].x,y=src[i].y,u=dst[i].x,v=dst[i].y;
      A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u);
      A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v);
    }
    const h=solve(A,b); return [...h,1];
  }
  function warp(image,srcPts,outW,outH){
    const src=image, sw=src.width, sh=src.height;
    const dst=[{x:0,y:0},{x:outW,y:0},{x:outW,y:outH},{x:0,y:outH}];
    const h=homography(srcPts,dst), [a,b,c,d,e,f,g,i]=h;
    const out=document.createElement("canvas"); out.width=outW; out.height=outH;
    const ctx=out.getContext("2d"), sc=document.createElement("canvas");
    sc.width=sw; sc.height=sh; sc.getContext("2d").drawImage(src,0,0);
    const sd=sc.getContext("2d").getImageData(0,0,sw,sh), od=ctx.createImageData(outW,outH);
    const S=sd.data,O=od.data;
    for(let y=0;y<outH;y++) for(let x=0;x<outW;x++){
      const den=g*x+i*y+1, sx=(a*x+d*y+c)/den, sy=(b*x+e*y+f)/den;
      const ox=(y*outW+x)*4;
      if(sx<0||sy<0||sx>sw-1||sy>sh-1){O[ox+3]=255;continue;}
      const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(x0+1,sw-1),y1=Math.min(y0+1,sh-1),dx=sx-x0,dy=sy-y0;
      const p00=(y0*sw+x0)*4,p10=(y0*sw+x1)*4,p01=(y1*sw+x0)*4,p11=(y1*sw+x1)*4;
      for(let k=0;k<3;k++) O[ox+k]=Math.round(S[p00+k]*(1-dx)*(1-dy)+S[p10+k]*dx*(1-dy)+S[p01+k]*(1-dx)*dy+S[p11+k]*dx*dy);
      O[ox+3]=255;
    }
    ctx.putImageData(od,0,0); return out;
  }
  return {homography,warp};
})();