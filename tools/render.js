// Отрисовка слайдов .dc.html в JPG 1080x1350.
// Установка: cd tools && npm i   (Playwright уже есть в среде)
// Запуск:    node tools/render.js <папка_вывода> <slide1.dc.html> [slide2.dc.html ...]
// Картинки /_blob/<id> берутся из tools/peeps/<id>.svg (добавляйте новые туда с тем же id).
// Файлы в папке вывода называются 01.jpg, 02.jpg... в порядке аргументов.
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const peeps=path.join(__dirname,'peeps');
const fsDir=path.join(__dirname,'node_modules/@fontsource');
const fontLinks=fs.readdirSync(fsDir).flatMap(f=>fs.readdirSync(path.join(fsDir,f)).filter(c=>/^\d+(-italic)?\.css$/.test(c)).map(c=>`<link rel="stylesheet" href="file://${path.join(fsDir,f,c)}">`)).join('\n');
function toHtml(src){
  const m=src.match(/data-props='([^']*)'/);let props={};
  if(m){try{props=JSON.parse(m[1].replace(/&#39;/g,"'").replace(/&amp;/g,'&'))}catch(e){}}
  const helmet=(src.match(/<helmet>([\s\S]*?)<\/helmet>/)||['',''])[1].replace(/<link[^>]*fonts\.googleapis[^>]*>/g,'');
  let body=(src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)||['',''])[1];
  body=body.replace(/\{\{\s*([\w$]+)\s*\}\}/g,(_,k)=>props[k]&&props[k].default!==undefined?props[k].default:'');
  body=body.replace(/\/_blob\/([0-9a-f]{32})/g,(_,id)=>{const f=path.join(peeps,id+'.svg');if(!fs.existsSync(f))console.error('НЕТ КАРТИНКИ',id);return 'file://'+f});
  return `<!doctype html><html><head><meta charset="utf-8">${fontLinks}${helmet}</head><body style="margin:0">${body}</body></html>`;
}
(async()=>{let [out,...files]=process.argv.slice(2);out=path.resolve(out);fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 let i=1;for(const f of files){const tmp=path.join(out,'_tmp.html');fs.writeFileSync(tmp,toHtml(fs.readFileSync(f,'utf8')));
  await p.goto('file://'+tmp);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
  const name=String(i++).padStart(2,'0')+'.jpg';await p.screenshot({path:path.join(out,name),type:'jpeg',quality:90,clip:{x:0,y:0,width:1080,height:1350}});
  console.log('ok',name,path.basename(f));}
 fs.rmSync(path.join(out,'_tmp.html'),{force:true});await b.close();})();
