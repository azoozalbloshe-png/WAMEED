import ts from '../frontend/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';import path from 'node:path';
const map=JSON.parse(fs.readFileSync('work/english-ui-map.json','utf8'));
const translate=s=>map[s]??s;
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
let changed=0;
function scan(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()){if(ent.name!=='i18n')scan(p);continue;}if(!/\.tsx?$/.test(p))continue;
 const source=fs.readFileSync(p,'utf8');const sf=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const result=ts.transform(sf,[ctx=>root=>{const f=ctx.factory;function walk(n){
  if(ts.isStringLiteral(n)&&map[n.text]!==undefined)return f.createStringLiteral(translate(n.text));
  if(ts.isNoSubstitutionTemplateLiteral(n)&&map[n.text]!==undefined)return f.createNoSubstitutionTemplateLiteral(translate(n.text));
  if(ts.isTemplateHead(n)&&map[n.text]!==undefined)return f.createTemplateHead(translate(n.text));
  if(ts.isTemplateMiddle(n)&&map[n.text]!==undefined)return f.createTemplateMiddle(translate(n.text));
  if(ts.isTemplateTail(n)&&map[n.text]!==undefined)return f.createTemplateTail(translate(n.text));
  if(ts.isJsxText(n)){const text=n.text.replace(/\s+/g,' ').trim();if(map[text]!==undefined)return f.createJsxText(' '+translate(text)+' ');}
  return ts.visitEachChild(n,walk,ctx);
 }return ts.visitNode(root,walk)}]);
 let output=printer.printFile(result.transformed[0]);result.dispose();
 // Use LTR physical spacing, alignment and icon placement consistently.
 output=output.replace(/\b(text-right|text-left|right-\d+(?:\.\d+)?|left-\d+(?:\.\d+)?|mr-\d+(?:\.\d+)?|ml-\d+(?:\.\d+)?|pr-\d+(?:\.\d+)?|pl-\d+(?:\.\d+)?|border-r-\d+|border-l-\d+)\b/g,token=>token.replace(/right|left|mr|ml|pr|pl|border-r|border-l/g,x=>({'right':'left','left':'right','mr':'ml','ml':'mr','pr':'pl','pl':'pr','border-r':'border-l','border-l':'border-r'})[x]));
 output=output.replace(/dir="rtl"/g,'dir="ltr"').replace(/ar-SA-u-ca-gregory-nu-latn/g,'en-SA-u-ca-gregory-nu-latn').replace(/ar-SA-u-nu-latn/g,'en-SA-u-nu-latn');
 if(output!==source){fs.writeFileSync(p,output);changed++;}
}}
scan('frontend/src');console.log('English UI files updated:',changed);
