const fs=require('fs'),zlib=require('zlib');
function decode(file){const b=fs.readFileSync(file);let p=8,w,h,ct,idat=[];while(p<b.length){const len=b.readUInt32BE(p),type=b.toString('ascii',p+4,p+8),d=b.slice(p+8,p+8+len);if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9]}if(type==='IDAT')idat.push(d);p+=12+len}
if(ct!==6&&ct!==2)throw new Error('只支援 RGB／RGBA PNG：'+file);
const raw=zlib.inflateSync(Buffer.concat(idat)),bpp=ct===6?4:3,stride=w*bpp,out=Buffer.alloc(w*h*4);let prev=Buffer.alloc(stride);
for(let y=0;y<h;y++){const f=raw[y*(stride+1)],line=raw.slice(y*(stride+1)+1,(y+1)*(stride+1)),cur=Buffer.alloc(stride);
for(let i=0;i<stride;i++){const a=i>=bpp?cur[i-bpp]:0,up=prev[i],c=i>=bpp?prev[i-bpp]:0;let v=line[i];
if(f===1)v+=a;else if(f===2)v+=up;else if(f===3)v+=(a+up)>>1;else if(f===4){const pp=a+up-c,pa=Math.abs(pp-a),pb=Math.abs(pp-up),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:c)}cur[i]=v&255}
if(bpp===4)cur.copy(out,y*stride);else for(let x=0;x<w;x++){out[(y*w+x)*4]=cur[x*3];out[(y*w+x)*4+1]=cur[x*3+1];out[(y*w+x)*4+2]=cur[x*3+2];out[(y*w+x)*4+3]=255}prev=cur}return{w,h,data:out}}
module.exports={decode};

